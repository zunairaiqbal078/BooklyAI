import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (req.path === "/health") {
    next();
    return;
  }

  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const start = Date.now();

  res.on("finish", () => {
    const payload = {
      requestId,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      durationMs: Date.now() - start,
      userId: req.user?.id,
    };

    if (res.statusCode >= 500) {
      logger.error(payload, "request_failed");
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn(payload, "request_client_error");
      return;
    }

    logger.info(payload, "request");
  });

  next();
}
