import { archiveChatConversation, getRagChatStatus, listChatConversations, listChatMessages, sendChatMessage } from "../../domain/services/chat.service.js";

export const chatController = {
  sendMessage: sendChatMessage,
  listConversations: listChatConversations,
  listMessages: listChatMessages,
  archiveConversation: archiveChatConversation,
  getStatus: getRagChatStatus
};
