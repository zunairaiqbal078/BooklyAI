import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { authService } from "../modules/auth/auth.service.js";
import type { UserRole } from "../types/index.js";
import { ForbiddenError, UnauthorizedError } from "../utils/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";

/**
 * Validates the HttpOnly JWT cookie and attaches the current user.
 * Identity always comes from the verified session — never from a client-supplied userId.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[env.AUTH_COOKIE_NAME];

    if (typeof token !== "string" || token.length === 0) {
      next(new UnauthorizedError("Authentication required."));
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await authService.getUserFromTokenSubject(payload.sub);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError("Authentication required."));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError("You do not have permission to perform this action."));
      return;
    }

    next();
  };
}
