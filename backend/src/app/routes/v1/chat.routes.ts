import type { FastifyInstance } from "fastify";
import { chatController } from "../../controllers/chat.controller.js";
import { chatConversationParamsSchema, sendChatMessageSchema } from "../../validators/chat.validator.js";

const chatRateLimit = {
  max: 20,
  timeWindow: "1 minute"
};

export async function chatRoutes(app: FastifyInstance) {
  app.post(
    "/chat/messages",
    { preHandler: [app.authenticate], config: { rateLimit: chatRateLimit } },
    async (request) => {
      const body = sendChatMessageSchema.parse(request.body);
      return chatController.sendMessage({
        userId: request.user.sub,
        conversationId: body.conversationId,
        message: body.message,
        routeContext: body.routeContext
      });
    }
  );

  app.get("/chat/conversations", { preHandler: [app.authenticate], config: { rateLimit: chatRateLimit } }, async (request) => {
    const data = await chatController.listConversations(request.user.sub);
    return { data };
  });

  app.get("/chat/rag/status", { preHandler: [app.authenticate], config: { rateLimit: chatRateLimit } }, async () => {
    return chatController.getStatus();
  });

  app.get("/chat/conversations/:id/messages", { preHandler: [app.authenticate], config: { rateLimit: chatRateLimit } }, async (request) => {
    const { id } = chatConversationParamsSchema.parse(request.params);
    return chatController.listMessages(request.user.sub, id);
  });

  app.delete("/chat/conversations/:id", { preHandler: [app.authenticate], config: { rateLimit: chatRateLimit } }, async (request) => {
    const { id } = chatConversationParamsSchema.parse(request.params);
    return chatController.archiveConversation(request.user.sub, id);
  });
}
