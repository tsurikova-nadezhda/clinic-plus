/**
 * Auth админки. Только role=admin допускается (SPEC §1, §6.3).
 * Токен в localStorage, прокидывается в api-клиент.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "./api";

const TOKEN_KEY = "clinicplus.admin.token";

interface AdminUser { id: string; role: "doctor" | "admin" }
interface AuthState {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function decode(token: string): AdminUser | null {
  try {
    const p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(p));
    return { id: json.sub, role: json.role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  function apply(token: string | null) {
    api.setToken(token);
    setUser(token ? decode(token) : null);
  }

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) {
      const u = decode(t);
      if (u?.role === "admin") apply(t);
      else localStorage.removeItem(TOKEN_KEY);
    }
    setLoading(false);
  }, []);

  const value: AuthState = {
    user,
    loading,
    login: async (email, password) => {
      const r = await api.login(email, password);
      const u = decode(r.token);
      if (u?.role !== "admin") {
        throw new ApiError(403, "Доступ только для руководителя (admin).");
      }
      localStorage.setItem(TOKEN_KEY, r.token);
      apply(r.token);
    },
    logout: () => {
      localStorage.removeItem(TOKEN_KEY);
      apply(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
