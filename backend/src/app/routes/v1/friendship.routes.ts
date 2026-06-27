import type { FastifyInstance } from "fastify";
import { handleAcceptFriendRequest, handleBlockFriendship, handleListFriends, handleListIncomingFriendRequests, handleListSentFriendRequests, handleRejectFriendRequest, handleSendFriendRequest, handleUnfriend, handleUnblockFriendship } from "../../controllers/friendship.controller.js";

const friendRequestRateLimit = {
  max: 10,
  timeWindow: "1 minute"
};

export async function friendshipRoutes(app: FastifyInstance) {
  app.get("/social/friends", { preHandler: app.authenticate }, handleListFriends);
  app.get("/social/friends/requests", { preHandler: app.authenticate }, handleListIncomingFriendRequests);
  app.get("/social/friends/sent", { preHandler: app.authenticate }, handleListSentFriendRequests);
  app.post("/social/friends/requests", { preHandler: app.authenticate, config: { rateLimit: friendRequestRateLimit } }, handleSendFriendRequest);
  app.patch("/social/friends/:id/accept", { preHandler: app.authenticate, config: { rateLimit: friendRequestRateLimit } }, handleAcceptFriendRequest);
  app.patch("/social/friends/:id/reject", { preHandler: app.authenticate, config: { rateLimit: friendRequestRateLimit } }, handleRejectFriendRequest);
  app.patch("/social/friends/:id/block", { preHandler: app.authenticate, config: { rateLimit: friendRequestRateLimit } }, handleBlockFriendship);
  app.patch("/social/friends/:id/unblock", { preHandler: app.authenticate, config: { rateLimit: friendRequestRateLimit } }, handleUnblockFriendship);
  app.delete("/social/friends/:id", { preHandler: app.authenticate, config: { rateLimit: friendRequestRateLimit } }, handleUnfriend);
}
