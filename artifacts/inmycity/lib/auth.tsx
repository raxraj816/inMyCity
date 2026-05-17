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
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const AUTH_TOKEN_KEY = "auth_session_token";

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return "";
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
    const apiBase = getApiBaseUrl();

    // Web: full-page redirect — server sets a session cookie
    if (Platform.OS === "web") {
      if (apiBase) window.location.href = `${apiBase}/api/auth/google`;
      return;
    }

    try {
      setIsLoading(true);

      // Open Google OAuth via our server.
      // Server handles PKCE with Google, then redirects to inmycity://oauth?token=SID.
      // WebBrowser intercepts the inmycity:// redirect before the OS handles it.
      const result = await WebBrowser.openAuthSessionAsync(
        `${apiBase}/api/auth/google?mobile=1`,
        "inmycity://",
      );

      if (result.type !== "success" || !result.url) return;

      // Extract session token from the redirect URL
      const url = new URL(result.url);
      const token = url.searchParams.get("token");
      if (!token) return;

      await saveToken(token);
      await fetchUser();
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
          method: "POST",
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
