import pino from "pino";
import { env } from "./env.js";

const isTest = env.NODE_ENV === "test";
const isDev = env.NODE_ENV === "development";

export const logger = pino({
  level: isTest ? "silent" : isDev ? "debug" : "info",
  base: {
    service: "booklyai-api",
  },
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "password",
      "token",
      "jwt",
      "secret",
      "GROQ_API_KEY",
      "MISTRAL_API_KEY",
      "*.password",
      "*.token",
    ],
    remove: true,
  },
  ...(isDev
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
});
