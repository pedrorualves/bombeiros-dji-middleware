import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import {
  apiFetch,
  getToken,
  getStoredUser,
  setToken,
  setStoredUser,
  clearAuth,
} from "./api-client";

interface AuthUser {
  id: string;
  org_id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  bootstrap: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [token, setTokenState] = useState<string | null>(getToken);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, status } = await apiFetch<{
        token: string;
        user: AuthUser;
        error?: string;
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (status !== 200 || !data.token) {
        throw new Error(data.error || "Login failed");
      }
      setToken(data.token);
      setStoredUser(data.user);
      setTokenState(data.token);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const bootstrap = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, status } = await apiFetch<{
        token: string;
        user: AuthUser;
        bootstrap?: boolean;
        error?: string;
      }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (status !== 201 || !data.token) {
        throw new Error(data.error || "Registration failed");
      }
      setToken(data.token);
      setStoredUser(data.user);
      setTokenState(data.token);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setTokenState(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ user: AuthUser; renewedToken?: string }>("/api/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        setStoredUser(data.user);
      })
      .catch(() => {
        clearAuth();
        setTokenState(null);
        setUser(null);
      });
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, bootstrap }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
