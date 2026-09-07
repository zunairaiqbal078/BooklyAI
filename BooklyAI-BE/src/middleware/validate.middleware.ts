import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "../utils/app-error.js";

type Source = "body" | "query" | "params";

declare module "express-serve-static-core" {
  interface Request {
    validatedQuery?: unknown;
    validatedParams?: unknown;
  }
}

export function validateRequest<T>(schema: ZodType<T>, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(new ValidationError("Request validation failed.", result.error.flatten()));
      return;
    }

    if (source === "body") {
      req.body = result.data;
    } else if (source === "query") {
      // Express 5: req.query is a getter — stash parsed values separately.
      req.validatedQuery = result.data;
    } else {
      req.validatedParams = result.data;
    }

    next();
  };
}
