import type { FastifyInstance } from "fastify";
import { handleArchiveChatConversation, handleGetRagChatStatus, handleListChatConversations, handleListChatMessages, handleSendChatMessage } from "../../controllers/chat.controller.js";

const chatRateLimit = {
  max: 20,
  timeWindow: "1 minute"
};

export async function chatRoutes(app: FastifyInstance) {
  app.post(
    "/chat/messages",
    { preHandler: [app.authenticate], config: { rateLimit: chatRateLimit } },
    handleSendChatMessage
  );

  app.get("/chat/conversations", { preHandler: [app.authenticate], config: { rateLimit: chatRateLimit } }, handleListChatConversations);
  app.get("/chat/rag/status", { preHandler: [app.authenticate], config: { rateLimit: chatRateLimit } }, handleGetRagChatStatus);
  app.get("/chat/conversations/:id/messages", { preHandler: [app.authenticate], config: { rateLimit: chatRateLimit } }, handleListChatMessages);
  app.delete("/chat/conversations/:id", { preHandler: [app.authenticate], config: { rateLimit: chatRateLimit } }, handleArchiveChatConversation);
}
