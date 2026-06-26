import type { FastifyRequest } from "fastify";
import { archiveChatConversation, getRagChatStatus, listChatConversations, listChatMessages, sendChatMessage } from "../../domain/services/chat.service.js";
import { chatConversationParamsSchema, sendChatMessageSchema } from "../validators/chat.validator.js";

export async function handleSendChatMessage(request: FastifyRequest) {
  const body = sendChatMessageSchema.parse(request.body);
  return chatController.sendMessage({
    userId: request.user.sub,
    conversationId: body.conversationId,
    message: body.message,
    routeContext: body.routeContext
  });
}

export async function handleListChatConversations(request: FastifyRequest) {
  const data = await chatController.listConversations(request.user.sub);
  return { data };
}

export async function handleGetRagChatStatus() {
  return chatController.getStatus();
}

export async function handleListChatMessages(request: FastifyRequest) {
  const { id } = chatConversationParamsSchema.parse(request.params);
  return chatController.listMessages(request.user.sub, id);
}

export async function handleArchiveChatConversation(request: FastifyRequest) {
  const { id } = chatConversationParamsSchema.parse(request.params);
  return chatController.archiveConversation(request.user.sub, id);
}

export const chatController = {
  sendMessage: sendChatMessage,
  listConversations: listChatConversations,
  listMessages: listChatMessages,
  archiveConversation: archiveChatConversation,
  getStatus: getRagChatStatus
};
