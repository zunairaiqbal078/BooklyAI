import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { UnauthorizedError } from "./app-error.js";

export interface JwtPayload {
  sub: string;
  role: "CUSTOMER" | "BUSINESS";
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: `${env.JWT_EXPIRES_IN_DAYS}d`,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (typeof decoded !== "object" || decoded === null || typeof decoded.sub !== "string") {
      throw new UnauthorizedError("Invalid authentication token.");
    }

    const role = (decoded as { role?: unknown }).role;
    if (role !== "CUSTOMER" && role !== "BUSINESS") {
      throw new UnauthorizedError("Invalid authentication token.");
    }

    return { sub: decoded.sub, role };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError("Invalid or expired authentication token.");
  }
}
