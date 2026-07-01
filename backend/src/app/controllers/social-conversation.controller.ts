import type { FastifyRequest } from "fastify";
import { createSocialGroupConversation, createSocialGroupInvite, getSocialConversation, listSocialConversations, muteSocialConversation, resolveSocialGroupInvite } from "../../domain/services/social-conversation.service.js";
import {
  createSocialGroupConversationSchema,
  createSocialGroupInviteSchema,
  muteSocialConversationSchema,
  resolveSocialGroupInviteSchema,
  socialConversationInviteParamsSchema,
  socialConversationListQuerySchema,
  socialConversationParamsSchema
} from "../validators/social-conversation.validator.js";

export async function handleListSocialConversations(request: FastifyRequest) {
  const query = socialConversationListQuerySchema.parse(request.query ?? {});
  return listSocialConversations(request.user.sub, query);
}

export async function handleGetSocialConversation(request: FastifyRequest) {
  const { id } = socialConversationParamsSchema.parse(request.params);
  return getSocialConversation(request.user.sub, id);
}

export async function handleCreateSocialGroupConversation(request: FastifyRequest) {
  const body = createSocialGroupConversationSchema.parse(request.body);
  return createSocialGroupConversation(request.user.sub, body);
}

export async function handleCreateSocialGroupInvite(request: FastifyRequest) {
  const { id } = socialConversationParamsSchema.parse(request.params);
  const body = createSocialGroupInviteSchema.parse(request.body);
  return createSocialGroupInvite(request.user.sub, id, body);
}

export async function handleResolveSocialGroupInvite(request: FastifyRequest) {
  const { id, userId } = socialConversationInviteParamsSchema.parse(request.params);
  const body = resolveSocialGroupInviteSchema.parse(request.body);
  return resolveSocialGroupInvite(request.user.sub, id, { targetUserId: userId, action: body.action });
}

export async function handleMuteSocialConversation(request: FastifyRequest) {
  const { id } = socialConversationParamsSchema.parse(request.params);
  const body = muteSocialConversationSchema.parse(request.body);
  return muteSocialConversation(request.user.sub, id, body);
}
