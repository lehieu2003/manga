import type { FastifyInstance } from "fastify";
import { handleCreateSocialGroupConversation, handleCreateSocialGroupInvite, handleGetSocialConversation, handleListSocialConversations, handleResolveSocialGroupInvite } from "../../controllers/social-conversation.controller.js";
import { handleDeleteSocialMessage, handleListSocialMessages, handleMarkSocialConversationRead, handleSendSocialMessage } from "../../controllers/social-message.controller.js";

const messageRateLimit = {
  max: 60,
  timeWindow: "1 minute"
};

const groupCreateRateLimit = {
  max: 10,
  timeWindow: "1 minute"
};

const groupInviteRateLimit = {
  max: 20,
  timeWindow: "1 minute"
};

export async function socialConversationRoutes(app: FastifyInstance) {
  app.get("/social/conversations", { preHandler: app.authenticate }, handleListSocialConversations);
  app.post("/social/conversations", { preHandler: app.authenticate, config: { rateLimit: groupCreateRateLimit } }, handleCreateSocialGroupConversation);
  app.get("/social/conversations/:id", { preHandler: app.authenticate }, handleGetSocialConversation);
  app.post("/social/conversations/:id/invites", { preHandler: app.authenticate, config: { rateLimit: groupInviteRateLimit } }, handleCreateSocialGroupInvite);
  app.patch("/social/conversations/:id/invites/:userId", { preHandler: app.authenticate, config: { rateLimit: groupInviteRateLimit } }, handleResolveSocialGroupInvite);
  app.get("/social/conversations/:id/messages", { preHandler: app.authenticate }, handleListSocialMessages);
  app.post("/social/conversations/:id/messages", { preHandler: app.authenticate, config: { rateLimit: messageRateLimit } }, handleSendSocialMessage);
  app.patch("/social/conversations/:id/read", { preHandler: app.authenticate }, handleMarkSocialConversationRead);
  app.delete("/social/messages/:id", { preHandler: app.authenticate }, handleDeleteSocialMessage);
}
