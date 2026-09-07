import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { authRateLimiter } from "../../middleware/rate-limit.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { authController } from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimiter,
  validateRequest(registerSchema),
  asyncHandler((req, res) => authController.register(req, res)),
);

authRouter.post(
  "/login",
  authRateLimiter,
  validateRequest(loginSchema),
  asyncHandler((req, res) => authController.login(req, res)),
);

authRouter.post(
  "/logout",
  asyncHandler((req, res) => authController.logout(req, res)),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler((req, res) => authController.me(req, res)),
);
