import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  await request.jwtVerify();
}

export function registerAuthMiddleware(app: FastifyInstance) {
  app.decorate("authenticate", authenticate);
}
