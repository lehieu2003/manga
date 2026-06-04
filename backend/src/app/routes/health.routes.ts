import type { FastifyInstance } from "fastify";
import { healthRouteSchemas } from "../docs/route-schemas.js";
import { getLiveness, getReadiness } from "../controllers/health.controller.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", { schema: healthRouteSchemas.liveness }, async () => getLiveness());

  app.get("/health/ready", { schema: healthRouteSchemas.readiness }, async (_request, reply) => {
    const readiness = await getReadiness();
    return reply.code(readiness.ok ? 200 : 503).send(readiness);
  });
}
