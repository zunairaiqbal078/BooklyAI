import type { CookieOptions } from "express";
import { env } from "../config/env.js";

/**
 * HttpOnly JWT cookie. The frontend never reads this value.
 * Same-site localhost (FE :3000 / API :4000) uses Lax.
 * Cross-site production deployments should use None + Secure.
 */
export function authCookieOptions(): CookieOptions {
  const isProd = env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: env.JWT_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  };
}

export function clearAuthCookieOptions(): CookieOptions {
  const isProd = env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  };
}
