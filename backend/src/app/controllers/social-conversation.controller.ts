import type { FastifyRequest } from "fastify";
import { getSocialConversation, listSocialConversations } from "../../domain/services/social-conversation.service.js";
import { socialConversationListQuerySchema, socialConversationParamsSchema } from "../validators/social-conversation.validator.js";

export async function handleListSocialConversations(request: FastifyRequest) {
  const query = socialConversationListQuerySchema.parse(request.query ?? {});
  return listSocialConversations(request.user.sub, query);
}

export async function handleGetSocialConversation(request: FastifyRequest) {
  const { id } = socialConversationParamsSchema.parse(request.params);
  return getSocialConversation(request.user.sub, id);
}
