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

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthContextValue {
  user: User | null;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/auth/user`, {
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

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async () => {
    try {
      const apiBase = getApiBaseUrl();
      if (!apiBase) return;
      const loginUrl = `${apiBase}/api/auth/login?mobile=1`;
      const result = await WebBrowser.openAuthSessionAsync(loginUrl, apiBase);
      if (result.type === "success") {
        await fetchUser();
      }
    } catch (err) {
      console.error("Login error:", err);
    }
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      const token = await getToken();
      const apiBase = getApiBaseUrl();
      if (token && apiBase) {
        await fetch(`${apiBase}/api/mobile-auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
    await deleteToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
