import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),
  AUTH_COOKIE_NAME: z.string().min(1).default("booklyai_token"),
  FRONTEND_URL: z.string().url(),
  /** Public origin for uploaded files (defaults to http://localhost:PORT). */
  PUBLIC_API_URL: z.string().url().optional(),
  GROQ_API_KEY: z.string().default(""),
  /** Groq retired llama-3.1-8b-instant (Aug 2026). Prefer openai/gpt-oss-20b. */
  GROQ_MODEL: z.string().default("openai/gpt-oss-20b"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return parsed.data;
}

export const env = loadEnv();
