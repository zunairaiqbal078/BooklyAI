import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { sendSuccess } from "../../utils/api-response.js";
import { ValidationError } from "../../utils/app-error.js";

function publicApiBase(): string {
  return env.PUBLIC_API_URL ?? `http://localhost:${env.PORT}`;
}

export const uploadController = {
  uploadImage(req: Request, res: Response): void {
    if (!req.file) {
      throw new ValidationError("Choose an image file to upload.");
    }

    const url = `${publicApiBase()}/uploads/${req.file.filename}`;
    sendSuccess(res, { url, filename: req.file.filename }, 201);
  },
};
