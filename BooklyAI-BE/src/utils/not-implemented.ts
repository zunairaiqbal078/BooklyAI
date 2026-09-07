import type { Request, Response } from "express";
import { sendError } from "./api-response.js";

export function notImplemented(feature: string, phase: string) {
  return (_req: Request, res: Response): void => {
    sendError(
      res,
      501,
      "NOT_IMPLEMENTED",
      `${feature} will be implemented in ${phase}.`,
    );
  };
}
