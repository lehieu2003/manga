import type { FastifyInstance } from "fastify";
import { handleCreateSocialGroupConversation, handleCreateSocialGroupInvite, handleGetSocialConversation, handleListSocialConversations, handleMuteSocialConversation, handleResolveSocialGroupInvite } from "../../controllers/social-conversation.controller.js";
import { handleAddSocialMessageReaction, handleDeleteSocialMessage, handleListSocialMessages, handleMarkSocialConversationRead, handleRemoveSocialMessageReaction, handleSendSocialMessage } from "../../controllers/social-message.controller.js";

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

const reactionRateLimit = {
  max: 120,
  timeWindow: "1 minute"
};

export async function socialConversationRoutes(app: FastifyInstance) {
  app.get("/social/conversations", { preHandler: app.authenticate }, handleListSocialConversations);
  app.post("/social/conversations", { preHandler: app.authenticate, config: { rateLimit: groupCreateRateLimit } }, handleCreateSocialGroupConversation);
  app.get("/social/conversations/:id", { preHandler: app.authenticate }, handleGetSocialConversation);
  app.post("/social/conversations/:id/invites", { preHandler: app.authenticate, config: { rateLimit: groupInviteRateLimit } }, handleCreateSocialGroupInvite);
  app.patch("/social/conversations/:id/invites/:userId", { preHandler: app.authenticate, config: { rateLimit: groupInviteRateLimit } }, handleResolveSocialGroupInvite);
  app.patch("/social/conversations/:id/mute", { preHandler: app.authenticate }, handleMuteSocialConversation);
  app.get("/social/conversations/:id/messages", { preHandler: app.authenticate }, handleListSocialMessages);
  app.post("/social/conversations/:id/messages", { preHandler: app.authenticate, config: { rateLimit: messageRateLimit } }, handleSendSocialMessage);
  app.patch("/social/conversations/:id/read", { preHandler: app.authenticate }, handleMarkSocialConversationRead);
  app.delete("/social/messages/:id", { preHandler: app.authenticate }, handleDeleteSocialMessage);
  app.put("/social/messages/:id/reactions/:emoji", { preHandler: app.authenticate, config: { rateLimit: reactionRateLimit } }, handleAddSocialMessageReaction);
  app.delete("/social/messages/:id/reactions/:emoji", { preHandler: app.authenticate, config: { rateLimit: reactionRateLimit } }, handleRemoveSocialMessageReaction);
}
