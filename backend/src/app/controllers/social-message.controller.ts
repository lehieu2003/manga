import type { FastifyRequest } from "fastify";
import { addSocialMessageReaction, deleteSocialMessage, listSocialMessages, markSocialConversationRead, removeSocialMessageReaction, sendSocialMessage } from "../../domain/services/social-message.service.js";
import { socialConversationParamsSchema } from "../validators/social-conversation.validator.js";
import { markSocialConversationReadSchema, sendSocialMessageSchema, socialMessageListQuerySchema, socialMessageParamsSchema, socialMessageReactionParamsSchema } from "../validators/social-message.validator.js";

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

export async function handleDeleteSocialMessage(request: FastifyRequest) {
  const { id } = socialMessageParamsSchema.parse(request.params);
  return deleteSocialMessage(request.user.sub, id);
}

export async function handleAddSocialMessageReaction(request: FastifyRequest) {
  const { id, emoji } = socialMessageReactionParamsSchema.parse(request.params);
  return addSocialMessageReaction(request.user.sub, id, emoji);
}

export async function handleRemoveSocialMessageReaction(request: FastifyRequest) {
  const { id, emoji } = socialMessageReactionParamsSchema.parse(request.params);
  return removeSocialMessageReaction(request.user.sub, id, emoji);
}
