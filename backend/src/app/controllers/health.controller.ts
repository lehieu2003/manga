import { prisma } from "../../infrastructure/database/client.js";
import { redis } from "../../infrastructure/cache/client.js";

type DependencyStatus = "ok" | "error";

export function getLiveness() {
  return { ok: true };
}

export async function getReadiness() {
  const checks = {
    postgres: await checkPostgres(),
    redis: await checkRedis()
  };
  return {
    ok: checks.postgres === "ok" && checks.redis === "ok",
    checks
  };
}

async function checkPostgres(): Promise<DependencyStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "error";
  }
}

async function checkRedis(): Promise<DependencyStatus> {
  try {
    const response = await redis.ping();
    return response === "PONG" ? "ok" : "error";
  } catch {
    return "error";
  }
}
