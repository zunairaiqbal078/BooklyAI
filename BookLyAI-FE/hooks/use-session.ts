"use client";

import { useAuth } from "@/features/auth/auth-provider";

/** Session helper derived from AuthProvider / GET /api/auth/me. */
export function useSession() {
  const { user, isLoading, refresh, logout } = useAuth();
  return { user, isLoading, refresh, logout };
}
