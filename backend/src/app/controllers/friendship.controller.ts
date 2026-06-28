import type { FastifyRequest } from "fastify";
import { acceptFriendRequest, blockFriendship, listFriends, listIncomingFriendRequests, listSentFriendRequests, rejectFriendRequest, searchSocialUsers, sendFriendRequest, unfriend, unblockFriendship } from "../../domain/services/friendship.service.js";
import { friendshipParamsSchema, sendFriendRequestSchema, socialUserSearchQuerySchema } from "../validators/friendship.validator.js";

export async function handleSendFriendRequest(request: FastifyRequest) {
  const { addresseeId } = sendFriendRequestSchema.parse(request.body);
  return sendFriendRequest(request.user.sub, addresseeId);
}

export async function handleSearchSocialUsers(request: FastifyRequest) {
  const query = socialUserSearchQuerySchema.parse(request.query);
  return searchSocialUsers(request.user.sub, query);
}

export async function handleAcceptFriendRequest(request: FastifyRequest) {
  const { id } = friendshipParamsSchema.parse(request.params);
  return acceptFriendRequest(request.user.sub, id);
}

export async function handleRejectFriendRequest(request: FastifyRequest) {
  const { id } = friendshipParamsSchema.parse(request.params);
  return rejectFriendRequest(request.user.sub, id);
}

export async function handleBlockFriendship(request: FastifyRequest) {
  const { id } = friendshipParamsSchema.parse(request.params);
  return blockFriendship(request.user.sub, id);
}

export async function handleUnblockFriendship(request: FastifyRequest) {
  const { id } = friendshipParamsSchema.parse(request.params);
  return unblockFriendship(request.user.sub, id);
}
export async function handleUnfriend(request: FastifyRequest) { const { id } = friendshipParamsSchema.parse(request.params); return unfriend(request.user.sub, id); }

export async function handleListFriends(request: FastifyRequest) { return listFriends(request.user.sub); }
export async function handleListIncomingFriendRequests(request: FastifyRequest) { return listIncomingFriendRequests(request.user.sub); }
export async function handleListSentFriendRequests(request: FastifyRequest) { return listSentFriendRequests(request.user.sub); }
