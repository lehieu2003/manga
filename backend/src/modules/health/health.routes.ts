import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";

type DependencyStatus = "ok" | "error";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ ok: true }));

  app.get("/health/ready", async (_request, reply) => {
    const checks = {
      postgres: await checkPostgres(),
      redis: await checkRedis()
    };
    const ok = checks.postgres === "ok" && checks.redis === "ok";
    return reply.code(ok ? 200 : 503).send({ ok, checks });
  });
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
