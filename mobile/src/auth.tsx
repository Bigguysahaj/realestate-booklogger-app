import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setAuthToken, setUnauthorizedHandler } from "./api";

const TOKEN_KEY = "booklogger_token";
const EMAIL_KEY = "booklogger_email";

interface AuthState {
  token: string | null;
  email: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>(null as never);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (stored) {
        setAuthToken(stored);
        setToken(stored);
        setEmail(await SecureStore.getItemAsync(EMAIL_KEY));
      }
      setLoading(false);
    })();
    setUnauthorizedHandler(() => {
      logout();
    });
  }, []);

  async function login(loginEmail: string, password: string) {
    const data = await api<{ access_token: string; email: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: loginEmail, password }),
    });
    setAuthToken(data.access_token);
    setToken(data.access_token);
    setEmail(data.email);
    await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
    await SecureStore.setItemAsync(EMAIL_KEY, data.email);
  }

  async function logout() {
    setAuthToken(null);
    setToken(null);
    setEmail(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(EMAIL_KEY);
  }

  return (
    <AuthContext.Provider value={{ token, email, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
