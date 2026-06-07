import { loadEnvFile } from "node:process";
import { z } from "zod";

try {
  loadEnvFile();
} catch {
  // Production deployments may inject environment variables without a .env file.
}

const optionalUrl = z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1).default("postgresql://manga:manga@localhost:5432/manga_reader?schema=public"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(16).default("local-development-secret"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  MANGADEX_BASE_URL: z.string().url().default("https://api.mangadex.org"),
  MANGADEX_UPLOADS_BASE_URL: optionalUrl,
  PUBLIC_MEDIA_BASE_URL: optionalUrl,
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  LOG_FILE: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  SYNC_ON_STARTUP: z.coerce.boolean().default(false),
  SYNC_LIMIT: z.coerce.number().int().min(1).max(100).default(48)
});

export const env = envSchema.parse(process.env);
