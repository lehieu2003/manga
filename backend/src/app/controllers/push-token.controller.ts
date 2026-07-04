import type { FastifyRequest } from "fastify";
import { registerPushToken, unregisterPushToken } from "../../domain/services/push-device-token.service.js";
import { registerPushTokenSchema, unregisterPushTokenSchema } from "../validators/push-token.validator.js";

export async function handleRegisterPushToken(request: FastifyRequest) {
  const body = registerPushTokenSchema.parse(request.body);
  return registerPushToken(request.user.sub, body);
}

export async function handleUnregisterPushToken(request: FastifyRequest) {
  const body = unregisterPushTokenSchema.parse(request.body);
  return unregisterPushToken(request.user.sub, body.token);
}
