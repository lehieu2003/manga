import type { FastifyInstance } from "fastify";
import { handleRegisterPushToken, handleUnregisterPushToken } from "../../controllers/push-token.controller.js";

const pushTokenRateLimit = {
  max: 30,
  timeWindow: "1 minute"
};

export async function pushTokenRoutes(app: FastifyInstance) {
  app.post("/push-tokens", { preHandler: app.authenticate, config: { rateLimit: pushTokenRateLimit } }, handleRegisterPushToken);
  app.post("/push-tokens/unregister", { preHandler: app.authenticate, config: { rateLimit: pushTokenRateLimit } }, handleUnregisterPushToken);
}
