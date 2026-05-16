import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const AUTH_TOKEN_KEY = "auth_session_token";
const ISSUER_URL = "https://replit.com/oidc";
const REDIRECT_URI = "inmycity://oauth";

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return "";
}

function getClientId(): string {
  return process.env.EXPO_PUBLIC_REPL_ID || "";
}

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
});

// ── SecureStore helpers (no-ops on web) ────────────────────────────────────

async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function saveToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch {}
}

async function deleteToken(): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch {}
}

// ── PKCE helpers ───────────────────────────────────────────────────────────

async function randomBase64Url(byteCount: number): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(byteCount);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function codeChallenge(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  return digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) { setUser(null); return; }

      const res = await fetch(`${getApiBaseUrl()}/api/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        await deleteToken();
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = useCallback(async () => {
    // Web: redirect to server-side login (session cookie based)
    if (Platform.OS === "web") {
      const base = getApiBaseUrl();
      if (base) window.location.href = `${base}/api/login?returnTo=/`;
      return;
    }

    try {
      setIsLoading(true);

      // 1. PKCE
      const verifier = await randomBase64Url(32);
      const challenge = await codeChallenge(verifier);
      const state = await randomBase64Url(16);

      // 2. Discover OIDC endpoints
      const disc = await fetch(`${ISSUER_URL}/.well-known/openid-configuration`);
      const { authorization_endpoint } = await disc.json();

      // 3. Build authorization URL
      const params = new URLSearchParams({
        client_id:              getClientId(),
        response_type:          "code",
        scope:                  "openid email profile offline_access",
        redirect_uri:           REDIRECT_URI,
        code_challenge:         challenge,
        code_challenge_method:  "S256",
        state,
        prompt:                 "login",
      });
      const authUrl = `${authorization_endpoint}?${params}`;

      // 4. Open browser
      const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
      if (result.type !== "success" || !result.url) return;

      // 5. Parse code + verify state
      const redirected = new URL(result.url);
      const code = redirected.searchParams.get("code");
      if (!code || redirected.searchParams.get("state") !== state) return;

      // 6. Exchange code for session token
      const apiBase = getApiBaseUrl();
      const exchangeRes = await fetch(`${apiBase}/api/mobile-auth/token-exchange`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          code_verifier: verifier,
          redirect_uri:  REDIRECT_URI,
          state,
        }),
      });

      const { token } = await exchangeRes.json();
      if (token) {
        await saveToken(token);
        await fetchUser();
      }
    } catch (err) {
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      const token = await getToken();
      const base = getApiBaseUrl();
      if (token && base) {
        await fetch(`${base}/api/mobile-auth/logout`, {
          method:  "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
    await deleteToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
