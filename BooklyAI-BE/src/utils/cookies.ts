import type { CookieOptions } from "express";
import { env } from "../config/env.js";

function cookieHostsDiffer(): boolean {
  try {
    const fe = new URL(env.FRONTEND_URL);
    const api = new URL(env.PUBLIC_API_URL ?? `http://localhost:${env.PORT}`);
    return fe.host !== api.host;
  } catch {
    return true;
  }
}

/**
 * HttpOnly JWT cookie. The frontend never reads this value.
 * - Localhost (different ports): SameSite=Lax
 * - Same-domain EC2 (nginx): SameSite=Lax + Secure in production
 * - Separate FE/API hosts: SameSite=None + Secure (requires HTTPS)
 */
export function authCookieOptions(): CookieOptions {
  const isProd = env.NODE_ENV === "production";
  const crossSite = isProd && cookieHostsDiffer();

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: crossSite ? "none" : "lax",
    path: "/",
    maxAge: env.JWT_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  };
}

export function clearAuthCookieOptions(): CookieOptions {
  const isProd = env.NODE_ENV === "production";
  const crossSite = isProd && cookieHostsDiffer();

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: crossSite ? "none" : "lax",
    path: "/",
  };
}
