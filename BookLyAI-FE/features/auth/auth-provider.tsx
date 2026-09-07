"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMe, logout as logoutRequest } from "@/features/auth/api";
import { useAuthStore } from "@/stores/auth.store";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const [bootstrapped, setBootstrapped] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { user: me } = await getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
      setBootstrapped(true);
    }
  }, [setLoading, setUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }, [setUser]);

  const value = useMemo(
    () => ({
      user,
      isLoading: !bootstrapped || isLoading,
      refresh,
      setUser,
      logout,
    }),
    [bootstrapped, isLoading, logout, refresh, setUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
