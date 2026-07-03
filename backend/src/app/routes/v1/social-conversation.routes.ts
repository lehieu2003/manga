import type { FastifyInstance } from "fastify";
import { handleDeclineSocialCall, handleGetSocialCall, handleJoinSocialCall, handleLeaveSocialCall, handleListSocialCallHistory, handleStartSocialCall } from "../../controllers/social-call.controller.js";
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

const callStartRateLimit = {
  max: 10,
  timeWindow: "1 minute"
};

export async function socialConversationRoutes(app: FastifyInstance) {
  app.get("/social/conversations", { preHandler: app.authenticate }, handleListSocialConversations);
  app.post("/social/conversations", { preHandler: app.authenticate, config: { rateLimit: groupCreateRateLimit } }, handleCreateSocialGroupConversation);
  app.get("/social/conversations/:id", { preHandler: app.authenticate }, handleGetSocialConversation);
  app.post("/social/conversations/:id/invites", { preHandler: app.authenticate, config: { rateLimit: groupInviteRateLimit } }, handleCreateSocialGroupInvite);
  app.patch("/social/conversations/:id/invites/:userId", { preHandler: app.authenticate, config: { rateLimit: groupInviteRateLimit } }, handleResolveSocialGroupInvite);
  app.patch("/social/conversations/:id/mute", { preHandler: app.authenticate }, handleMuteSocialConversation);
  app.post("/social/conversations/:id/calls", { preHandler: app.authenticate, config: { rateLimit: callStartRateLimit } }, handleStartSocialCall);
  app.get("/social/conversations/:id/calls", { preHandler: app.authenticate }, handleListSocialCallHistory);
  app.get("/social/calls/:id", { preHandler: app.authenticate }, handleGetSocialCall);
  app.patch("/social/calls/:id/join", { preHandler: app.authenticate }, handleJoinSocialCall);
  app.patch("/social/calls/:id/decline", { preHandler: app.authenticate }, handleDeclineSocialCall);
  app.patch("/social/calls/:id/leave", { preHandler: app.authenticate }, handleLeaveSocialCall);
  app.get("/social/conversations/:id/messages", { preHandler: app.authenticate }, handleListSocialMessages);
  app.post("/social/conversations/:id/messages", { preHandler: app.authenticate, config: { rateLimit: messageRateLimit } }, handleSendSocialMessage);
  app.patch("/social/conversations/:id/read", { preHandler: app.authenticate }, handleMarkSocialConversationRead);
  app.delete("/social/messages/:id", { preHandler: app.authenticate }, handleDeleteSocialMessage);
  app.put("/social/messages/:id/reactions/:emoji", { preHandler: app.authenticate, config: { rateLimit: reactionRateLimit } }, handleAddSocialMessageReaction);
  app.delete("/social/messages/:id/reactions/:emoji", { preHandler: app.authenticate, config: { rateLimit: reactionRateLimit } }, handleRemoveSocialMessageReaction);
}
