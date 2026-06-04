import type { FastifyInstance } from "fastify";
import { getLiveness, getReadiness } from "../controllers/health.controller.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => getLiveness());

  app.get("/health/ready", async (_request, reply) => {
    const readiness = await getReadiness();
    return reply.code(readiness.ok ? 200 : 503).send(readiness);
  });
}
