import type { FastifyRequest } from "fastify";
import { listSocialMessages, markSocialConversationRead, sendSocialMessage } from "../../domain/services/social-message.service.js";
import { socialConversationParamsSchema } from "../validators/social-conversation.validator.js";
import { markSocialConversationReadSchema, sendSocialMessageSchema, socialMessageListQuerySchema } from "../validators/social-message.validator.js";

export async function handleListSocialMessages(request: FastifyRequest) {
  const { id } = socialConversationParamsSchema.parse(request.params);
  const query = socialMessageListQuerySchema.parse(request.query ?? {});
  return listSocialMessages(request.user.sub, id, query);
}

export async function handleSendSocialMessage(request: FastifyRequest) {
  const { id } = socialConversationParamsSchema.parse(request.params);
  const body = sendSocialMessageSchema.parse(request.body);
  return sendSocialMessage(request.user.sub, id, body);
}

export async function handleMarkSocialConversationRead(request: FastifyRequest) {
  const { id } = socialConversationParamsSchema.parse(request.params);
  const body = markSocialConversationReadSchema.parse(request.body);
  return markSocialConversationRead(request.user.sub, id, body);
}
