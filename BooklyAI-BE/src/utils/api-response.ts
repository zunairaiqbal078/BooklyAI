import type { Response } from "express";
import type { ApiErrorBody, ApiSuccess } from "../types/index.js";

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  const body: ApiSuccess<T> = { success: true, data };
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const body: ApiErrorBody = {
    success: false,
    error: details === undefined ? { code, message } : { code, message, details },
  };
  return res.status(statusCode).json(body);
}
