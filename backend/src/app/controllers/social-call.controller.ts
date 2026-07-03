import type { FastifyRequest } from "fastify";
import { declineSocialCall, getSocialCall, joinSocialCall, leaveSocialCall, listSocialCallHistory, startSocialCall } from "../../domain/services/social-call.service.js";
import { socialConversationParamsSchema } from "../validators/social-conversation.validator.js";
import { createSocialCallSchema, socialCallHistoryQuerySchema, socialCallParamsSchema } from "../validators/social-call.validator.js";

export async function handleStartSocialCall(request: FastifyRequest) {
  const { id } = socialConversationParamsSchema.parse(request.params);
  const body = createSocialCallSchema.parse(request.body ?? {});
  return startSocialCall(request.user.sub, id, body);
}

export async function handleJoinSocialCall(request: FastifyRequest) {
  const { id } = socialCallParamsSchema.parse(request.params);
  return joinSocialCall(request.user.sub, id);
}

export async function handleDeclineSocialCall(request: FastifyRequest) {
  const { id } = socialCallParamsSchema.parse(request.params);
  return declineSocialCall(request.user.sub, id);
}

export async function handleLeaveSocialCall(request: FastifyRequest) {
  const { id } = socialCallParamsSchema.parse(request.params);
  return leaveSocialCall(request.user.sub, id);
}

export async function handleGetSocialCall(request: FastifyRequest) {
  const { id } = socialCallParamsSchema.parse(request.params);
  return getSocialCall(request.user.sub, id);
}

export async function handleListSocialCallHistory(request: FastifyRequest) {
  const { id } = socialConversationParamsSchema.parse(request.params);
  const query = socialCallHistoryQuerySchema.parse(request.query ?? {});
  return listSocialCallHistory(request.user.sub, id, query);
}
