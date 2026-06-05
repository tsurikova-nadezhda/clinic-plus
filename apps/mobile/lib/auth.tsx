/**
 * Auth-контекст: JWT хранится в AsyncStorage, токен прокидывается в api-клиент.
 * Из payload берём sub (userId) и role для UI. IDOR-защита — на бэкенде (§6.3);
 * мобайл всегда работает со «своими» данными через /plans/me, /wins и т.п.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

const TOKEN_KEY = "clinicplus.token";

export interface SessionUser {
  id: string;
  role: "doctor" | "admin";
}

interface AuthState {
  user: SessionUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Декодирует payload JWT без проверки подписи (подпись валидирует сервер). */
function decodeJwt(token: string): SessionUser | null {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(globalThis.atob(normalized));
    return { id: json.sub, role: json.role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  function apply(t: string | null) {
    setToken(t);
    setUser(t ? decodeJwt(t) : null);
    api.setToken(t);
  }

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      if (stored) apply(stored);
      setLoading(false);
    })();
  }, []);

  async function persist(t: string) {
    await AsyncStorage.setItem(TOKEN_KEY, t);
    apply(t);
  }

  const value: AuthState = {
    user,
    token,
    loading,
    login: async (email, password) => {
      const r = await api.login(email, password);
      await persist(r.token);
    },
    register: async (email, password, name) => {
      const r = await api.register(email, password, name);
      await persist(r.token);
    },
    logout: async () => {
      await AsyncStorage.removeItem(TOKEN_KEY);
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
