"use client";

import { api } from "@/lib/api";
import type { User, UserRole } from "@/types";

export interface AuthResponse {
  user: User;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  businessName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export function register(payload: RegisterPayload) {
  return api<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: payload,
  });
}

export function login(payload: LoginPayload) {
  return api<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function logout() {
  return api<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export function getMe() {
  return api<{ user: User }>("/api/auth/me");
}
