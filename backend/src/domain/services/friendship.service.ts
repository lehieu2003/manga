import { FriendshipStatus, NotificationSubjectType, NotificationType, SocialConversationType, type Friendship } from "@prisma/client";
import { prisma } from "../../infrastructure/database/client.js";
import { emitFriendAccepted, emitFriendIncoming } from "../../infrastructure/realtime/socket-server.js";
import { HttpError } from "../../shared/errors/http-error.js";
import { publishNotification } from "./notification-stream.service.js";

export async function sendFriendRequest(requesterId: string, addresseeId: string) {
  if (requesterId === addresseeId) throw new HttpError(400, "You cannot send a friend request to yourself", "FRIEND_REQUEST_SELF");

  const addressee = await prisma.user.findUnique({ where: { id: addresseeId }, select: { id: true } });
  if (!addressee) throw new HttpError(404, "User not found", "FRIEND_ADDRESSEE_NOT_FOUND");

  const [userAId, userBId] = canonicalPair(requesterId, addresseeId);
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
    if (existing?.status === FriendshipStatus.BLOCKED) throw new HttpError(403, "This friendship is blocked", "FRIENDSHIP_BLOCKED");
    if (existing?.status === FriendshipStatus.ACCEPTED) throw new HttpError(409, "You are already friends", "FRIENDSHIP_EXISTS");
    if (existing?.status === FriendshipStatus.PENDING) return { friendship: existing, notification: null };

    const saved = existing
      ? await tx.friendship.update({
          where: { id: existing.id },
          data: { requestedById: requesterId, blockedById: null, status: FriendshipStatus.PENDING }
        })
      : await tx.friendship.create({
          data: { userAId, userBId, requestedById: requesterId, status: FriendshipStatus.PENDING }
        });

    const notification = await tx.notification.create({
      data: {
        userId: addresseeId,
        actorId: requesterId,
        type: NotificationType.FRIEND_REQUEST,
        subjectType: NotificationSubjectType.FRIENDSHIP,
        subjectId: saved.id,
        payload: { friendshipId: saved.id }
      }
    });
    return { friendship: saved, notification };
  });

  if (result.notification) {
    publishNotification(result.notification);
    emitFriendIncoming(addresseeId, { friendshipId: result.friendship.id, requesterId });
  }

  return { friendship: result.friendship };
}

export async function acceptFriendRequest(userId: string, friendshipId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const friendship = await tx.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship) throw new HttpError(404, "Friend request not found", "FRIEND_REQUEST_NOT_FOUND");
    if (friendship.requestedById === userId) throw new HttpError(403, "Only the request recipient can accept", "FRIEND_REQUEST_ACCEPT_FORBIDDEN");
    if (friendship.status !== FriendshipStatus.PENDING) throw new HttpError(409, "Friend request is no longer pending", "FRIEND_REQUEST_NOT_PENDING");

    const directKey = `${friendship.userAId}:${friendship.userBId}`;
    let conversation = await tx.socialConversation.findFirst({ where: { type: SocialConversationType.DM, directKey } });
    if (!conversation) {
      conversation = await tx.socialConversation.create({
        data: {
          type: SocialConversationType.DM,
          directKey,
          members: { create: [{ userId: friendship.userAId }, { userId: friendship.userBId }] }
        }
      });
    }

    const accepted = await tx.friendship.update({
      where: { id: friendship.id },
      data: { status: FriendshipStatus.ACCEPTED, blockedById: null }
    });
    const notification = await tx.notification.create({
      data: {
        userId: friendship.requestedById,
        actorId: userId,
        type: NotificationType.FRIEND_ACCEPTED,
        subjectType: NotificationSubjectType.FRIENDSHIP,
        subjectId: friendship.id,
        payload: { friendshipId: friendship.id, conversationId: conversation.id }
      }
    });
    return { friendship: accepted, conversation, notification };
  });

  publishNotification(result.notification);
  emitFriendAccepted(result.notification.userId, {
    friendshipId: result.friendship.id,
    friendId: userId,
    conversationId: result.conversation.id
  });

  return { friendship: result.friendship, conversation: result.conversation };
}

export async function rejectFriendRequest(userId: string, friendshipId: string) {
  return updatePendingRequest(userId, friendshipId);
}

export async function blockFriendship(userId: string, friendshipId: string) {
  const friendship = await prisma.$transaction(async (tx) => {
    const existing = await tx.friendship.findUnique({ where: { id: friendshipId } });
    assertParticipant(existing, userId);
    return tx.friendship.update({ where: { id: friendshipId }, data: { status: FriendshipStatus.BLOCKED, blockedById: userId } });
  });
  return { friendship };
}

export async function unblockFriendship(userId: string, friendshipId: string) {
  const friendship = await prisma.$transaction(async (tx) => {
    const existing = await tx.friendship.findUnique({ where: { id: friendshipId } });
    assertParticipant(existing, userId);
    if (existing.status !== FriendshipStatus.BLOCKED || existing.blockedById !== userId) throw new HttpError(403, "Only the blocking user can unblock", "FRIENDSHIP_UNBLOCK_FORBIDDEN");
    return tx.friendship.update({ where: { id: friendshipId }, data: { status: FriendshipStatus.REJECTED, blockedById: null } });
  });
  return { friendship };
}

export async function unfriend(userId: string, friendshipId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.friendship.findUnique({ where: { id: friendshipId } });
    assertParticipant(existing, userId);
    if (existing.status !== FriendshipStatus.ACCEPTED) throw new HttpError(409, "Only accepted friendships can be removed", "FRIENDSHIP_NOT_ACCEPTED");
    return tx.friendship.delete({ where: { id: friendshipId } });
  });
  return { friendship: result };
}

export async function listFriends(userId: string) {
  return listFriendships(userId, FriendshipStatus.ACCEPTED);
}

export async function listIncomingFriendRequests(userId: string) {
  return listFriendships(userId, FriendshipStatus.PENDING, "incoming");
}

export async function listSentFriendRequests(userId: string) {
  return listFriendships(userId, FriendshipStatus.PENDING, "sent");
}

export async function searchSocialUsers(userId: string, input: { query?: string; limit: number }) {
  const query = input.query?.trim();
  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      ...(query
        ? {
            OR: [
              { displayName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: [{ displayName: "asc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(input.limit, 1), 20),
    select: { id: true, displayName: true, avatarUrl: true }
  });
  return { data: users };
}

async function listFriendships(userId: string, status: FriendshipStatus, direction?: "incoming" | "sent") {
  const rows = await prisma.friendship.findMany({
    where: {
      status,
      ...(direction === "sent" ? { requestedById: userId } : { OR: [{ userAId: userId }, { userBId: userId }] })
    },
    orderBy: { updatedAt: "desc" },
    include: { userA: { select: { id: true, displayName: true, avatarUrl: true } }, userB: { select: { id: true, displayName: true, avatarUrl: true } } }
  });
  return {
    data: rows
      .filter((row) => direction !== "incoming" || row.requestedById !== userId)
      .map((row) => ({ ...row, friend: row.userAId === userId ? row.userB : row.userA, userA: undefined, userB: undefined }))
  };
}

async function updatePendingRequest(userId: string, friendshipId: string) {
  const friendship = await prisma.$transaction(async (tx) => {
    const existing = await tx.friendship.findUnique({ where: { id: friendshipId } });
    assertParticipant(existing, userId);
    if (existing.requestedById === userId || existing.status !== FriendshipStatus.PENDING) throw new HttpError(409, "Friend request is no longer pending", "FRIEND_REQUEST_NOT_PENDING");
    return tx.friendship.update({ where: { id: friendshipId }, data: { status: FriendshipStatus.REJECTED, blockedById: null } });
  });
  return { friendship };
}

function assertParticipant(friendship: Friendship | null, userId: string): asserts friendship is Friendship {
  if (!friendship) throw new HttpError(404, "Friendship not found", "FRIENDSHIP_NOT_FOUND");
  if (friendship.userAId !== userId && friendship.userBId !== userId) throw new HttpError(403, "You are not part of this friendship", "FRIENDSHIP_FORBIDDEN");
}

export function canonicalPair(firstUserId: string, secondUserId: string): [string, string] {
  return firstUserId < secondUserId ? [firstUserId, secondUserId] : [secondUserId, firstUserId];
}
