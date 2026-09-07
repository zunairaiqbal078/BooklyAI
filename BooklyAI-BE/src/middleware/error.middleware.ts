import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { sendError } from "../utils/api-response.js";
import { AppError } from "../utils/app-error.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image must be 5 MB or smaller."
        : err.message;
    sendError(res, 400, "VALIDATION_ERROR", message);
    return;
  }

  logger.error({ err }, "Unhandled error");

  const message =
    env.NODE_ENV === "production"
      ? "An unexpected error occurred."
      : err instanceof Error
        ? err.message
        : "An unexpected error occurred.";

  sendError(res, 500, "INTERNAL_ERROR", message);
}
