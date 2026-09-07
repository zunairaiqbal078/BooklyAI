import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { sendSuccess } from "../../utils/api-response.js";
import { authCookieOptions, clearAuthCookieOptions } from "../../utils/cookies.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";
import { authService } from "./auth.service.js";

function setAuthCookie(res: Response, token: string): void {
  res.cookie(env.AUTH_COOKIE_NAME, token, authCookieOptions());
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(env.AUTH_COOKIE_NAME, clearAuthCookieOptions());
}

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const body = req.body as RegisterInput;
    const { user, token } = await authService.register(body);
    setAuthCookie(res, token);
    sendSuccess(res, { user }, 201);
  }

  async login(req: Request, res: Response): Promise<void> {
    const body = req.body as LoginInput;
    const { user, token } = await authService.login(body);
    setAuthCookie(res, token);
    sendSuccess(res, { user });
  }

  async logout(_req: Request, res: Response): Promise<void> {
    clearAuthCookie(res);
    logger.info({ event: "auth.logout" }, "User logged out");
    sendSuccess(res, { ok: true });
  }

  async me(req: Request, res: Response): Promise<void> {
    // req.user is set by requireAuth
    sendSuccess(res, { user: req.user! });
  }
}

export const authController = new AuthController();
