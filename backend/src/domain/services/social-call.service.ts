import {
  CallMediaType,
  CallParticipantStatus,
  CallStatus,
  FriendshipStatus,
  Prisma,
  SocialConversationType,
  SocialMembershipStatus
} from "@prisma/client";
import { prisma } from "../../infrastructure/database/client.js";
import { emitCallEnded, emitCallIncoming, emitCallParticipantJoined, emitCallParticipantLeft } from "../../infrastructure/realtime/socket-server.js";
import { env } from "../../shared/configs/app.config.js";
import { HttpError } from "../../shared/errors/http-error.js";
import { canonicalPair } from "./friendship.service.js";

type CallCursor = {
  id: string;
};

type StartCallInput = {
  mediaType: CallMediaType;
};

type ListCallHistoryInput = {
  limit: number;
  cursor?: string;
};

const callInclude = {
  initiator: { select: { id: true, displayName: true, avatarUrl: true } },
  participants: {
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } }
    },
    orderBy: { createdAt: "asc" as const }
  }
};

const liveCallStatuses = [CallStatus.RINGING, CallStatus.ACTIVE];

export async function startSocialCall(userId: string, conversationId: string, input: StartCallInput) {
  try {
    const call = await prisma.$transaction(async (tx) => {
      const conversation = await loadActiveConversationForUser(tx, conversationId, userId);
      await assertDmNotBlocked(tx, conversation, userId);

      const existing = await tx.callSession.findFirst({
        where: { conversationId, status: { in: liveCallStatuses } },
        select: { id: true }
      });
      if (existing) throw new HttpError(409, "A call is already active for this conversation", "SOCIAL_CALL_ALREADY_ACTIVE");

      return tx.callSession.create({
        data: {
          conversationId,
          initiatorId: userId,
          mediaType: input.mediaType,
          status: CallStatus.RINGING,
          participants: {
            create: conversation.members.map((member) => ({
              userId: member.userId,
              status: member.userId === userId ? CallParticipantStatus.JOINED : CallParticipantStatus.INVITED,
              joinedAt: member.userId === userId ? new Date() : null
            }))
          }
        },
        include: callInclude
      });
    });

    for (const participant of call.participants) {
      if (participant.userId !== userId && participant.status === CallParticipantStatus.INVITED) {
        emitCallIncoming(participant.userId, serializeCall(call));
      }
    }

    return { call: serializeCall(call), iceServers: getIceServers() };
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new HttpError(409, "A call is already active for this conversation", "SOCIAL_CALL_ALREADY_ACTIVE");
    throw error;
  }
}

export async function joinSocialCall(userId: string, callId: string) {
  const call = await prisma.$transaction(async (tx) => {
    const existing = await loadCallForParticipant(tx, callId, userId);
    assertCallCanBeJoined(existing);

    const now = new Date();
    await tx.callParticipant.update({
      where: { callId_userId: { callId, userId } },
      data: { status: CallParticipantStatus.JOINED, joinedAt: now, leftAt: null }
    });

    if (existing.status === CallStatus.RINGING) {
      await tx.callSession.update({
        where: { id: callId },
        data: { status: CallStatus.ACTIVE, answeredAt: now }
      });
    }

    return loadCallOrThrow(tx, callId);
  });

  const serialized = serializeCall(call);
  emitCallParticipantJoined(call.conversationId, { callId, userId, call: serialized });
  return { call: serialized, iceServers: getIceServers() };
}

export async function declineSocialCall(userId: string, callId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await loadCallForParticipant(tx, callId, userId);
    assertCallCanBeChanged(existing);

    await tx.callParticipant.update({
      where: { callId_userId: { callId, userId } },
      data: { status: CallParticipantStatus.DECLINED, leftAt: new Date() }
    });

    const shouldEnd = await shouldEndAfterParticipantExit(tx, callId);
    if (shouldEnd) {
      await tx.callSession.update({ where: { id: callId }, data: { status: CallStatus.DECLINED, endedAt: new Date() } });
    }

    const call = await loadCallOrThrow(tx, callId);
    return { call, ended: shouldEnd };
  });

  const serialized = serializeCall(result.call);
  emitCallParticipantLeft(result.call.conversationId, { callId, userId, status: CallParticipantStatus.DECLINED, call: serialized });
  if (result.ended) emitCallEnded(result.call.conversationId, { callId, reason: "declined", call: serialized });
  return { call: serialized };
}

export async function leaveSocialCall(userId: string, callId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await loadCallForParticipant(tx, callId, userId);
    assertCallCanBeChanged(existing);

    await tx.callParticipant.update({
      where: { callId_userId: { callId, userId } },
      data: { status: CallParticipantStatus.LEFT, leftAt: new Date() }
    });

    const remainingJoined = await tx.callParticipant.count({
      where: { callId, status: CallParticipantStatus.JOINED }
    });
    const ended = remainingJoined === 0;
    if (ended) await tx.callSession.update({ where: { id: callId }, data: { status: CallStatus.ENDED, endedAt: new Date() } });

    const call = await loadCallOrThrow(tx, callId);
    return { call, ended };
  });

  const serialized = serializeCall(result.call);
  emitCallParticipantLeft(result.call.conversationId, { callId, userId, status: CallParticipantStatus.LEFT, call: serialized });
  if (result.ended) emitCallEnded(result.call.conversationId, { callId, reason: "left", call: serialized });
  return { call: serialized };
}

export async function getSocialCall(userId: string, callId: string) {
  const call = await loadCallForParticipant(prisma, callId, userId);
  return { call: serializeCall(call), iceServers: getIceServers() };
}

export async function listSocialCallHistory(userId: string, conversationId: string, input: ListCallHistoryInput) {
  await assertActiveConversationMembership(prisma, conversationId, userId);
  const cursor = input.cursor ? decodeCallCursor(input.cursor) : undefined;
  const rows = await prisma.callSession.findMany({
    where: { conversationId },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
    take: input.limit + 1,
    include: callInclude
  });

  const page = rows.slice(0, input.limit);
  const next = rows.length > input.limit ? page.at(-1) : undefined;

  return {
    data: page.map(serializeCall),
    nextCursor: next ? encodeCallCursor({ id: next.id }) : null
  };
}

export async function verifyCallSignalParticipant(callId: string, fromUserId: string, toUserId: string) {
  const call = await prisma.callSession.findFirst({
    where: {
      id: callId,
      status: { in: liveCallStatuses },
      conversation: {
        AND: [
          { members: { some: { userId: fromUserId, status: SocialMembershipStatus.ACTIVE } } },
          { members: { some: { userId: toUserId, status: SocialMembershipStatus.ACTIVE } } }
        ]
      },
      AND: [
        { participants: { some: { userId: fromUserId, status: { in: [CallParticipantStatus.INVITED, CallParticipantStatus.JOINED] } } } },
        { participants: { some: { userId: toUserId, status: { in: [CallParticipantStatus.INVITED, CallParticipantStatus.JOINED] } } } }
      ]
    },
    select: {
      id: true,
      conversationId: true,
      participants: { where: { userId: toUserId }, select: { userId: true, status: true } }
    }
  });

  const target = call?.participants[0];
  if (!call || !target || (target.status !== CallParticipantStatus.INVITED && target.status !== CallParticipantStatus.JOINED)) {
    throw new HttpError(403, "Call signaling target is not an active participant", "SOCIAL_CALL_SIGNAL_FORBIDDEN");
  }

  return { callId: call.id, conversationId: call.conversationId };
}

function serializeCall(call: {
  id: string;
  conversationId: string;
  initiatorId: string;
  status: CallStatus;
  mediaType: CallMediaType;
  startedAt: Date;
  answeredAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  initiator: { id: string; displayName: string; avatarUrl: string | null };
  participants: Array<{
    id: string;
    callId: string;
    userId: string;
    status: CallParticipantStatus;
    joinedAt: Date | null;
    leftAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    user: { id: string; displayName: string; avatarUrl: string | null };
  }>;
}) {
  return {
    id: call.id,
    conversationId: call.conversationId,
    initiatorId: call.initiatorId,
    status: call.status,
    mediaType: call.mediaType,
    startedAt: call.startedAt,
    answeredAt: call.answeredAt,
    endedAt: call.endedAt,
    createdAt: call.createdAt,
    updatedAt: call.updatedAt,
    initiator: call.initiator,
    participants: call.participants.map((participant) => ({
      id: participant.id,
      callId: participant.callId,
      userId: participant.userId,
      status: participant.status,
      joinedAt: participant.joinedAt,
      leftAt: participant.leftAt,
      createdAt: participant.createdAt,
      updatedAt: participant.updatedAt,
      user: participant.user
    }))
  };
}

async function loadActiveConversationForUser(tx: Prisma.TransactionClient, conversationId: string, userId: string) {
  const conversation = await tx.socialConversation.findFirst({
    where: {
      id: conversationId,
      members: { some: { userId, status: SocialMembershipStatus.ACTIVE } }
    },
    select: {
      id: true,
      type: true,
      members: {
        where: { status: SocialMembershipStatus.ACTIVE },
        select: { userId: true }
      }
    }
  });
  if (!conversation) throw new HttpError(404, "Conversation not found", "SOCIAL_CONVERSATION_NOT_FOUND");
  if (conversation.members.length < 2) throw new HttpError(409, "A call requires at least two active members", "SOCIAL_CALL_MIN_MEMBERS");
  return conversation;
}

async function assertActiveConversationMembership(client: Prisma.TransactionClient | typeof prisma, conversationId: string, userId: string) {
  const membership = await client.socialConversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { status: true }
  });
  if (membership?.status !== SocialMembershipStatus.ACTIVE) throw new HttpError(404, "Conversation not found", "SOCIAL_CONVERSATION_NOT_FOUND");
}

async function assertDmNotBlocked(tx: Prisma.TransactionClient, conversation: Awaited<ReturnType<typeof loadActiveConversationForUser>>, userId: string) {
  if (conversation.type !== SocialConversationType.DM) return;
  const otherMember = conversation.members.find((member) => member.userId !== userId);
  if (!otherMember) return;

  const [userAId, userBId] = canonicalPair(userId, otherMember.userId);
  const friendship = await tx.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { status: true }
  });
  if (friendship?.status === FriendshipStatus.BLOCKED) {
    throw new HttpError(403, "This conversation is blocked", "SOCIAL_CALL_BLOCKED");
  }
}

async function loadCallForParticipant(client: Prisma.TransactionClient | typeof prisma, callId: string, userId: string) {
  const call = await client.callSession.findFirst({
    where: {
      id: callId,
      conversation: { members: { some: { userId, status: SocialMembershipStatus.ACTIVE } } },
      participants: { some: { userId } }
    },
    include: callInclude
  });
  if (!call) throw new HttpError(404, "Call not found", "SOCIAL_CALL_NOT_FOUND");
  return call;
}

async function loadCallOrThrow(tx: Prisma.TransactionClient, callId: string) {
  const call = await tx.callSession.findUnique({ where: { id: callId }, include: callInclude });
  if (!call) throw new HttpError(404, "Call not found", "SOCIAL_CALL_NOT_FOUND");
  return call;
}

function assertCallCanBeJoined(call: Awaited<ReturnType<typeof loadCallForParticipant>>) {
  if (call.status !== CallStatus.RINGING && call.status !== CallStatus.ACTIVE) {
    throw new HttpError(409, "Call is no longer joinable", "SOCIAL_CALL_NOT_JOINABLE");
  }
}

function assertCallCanBeChanged(call: Awaited<ReturnType<typeof loadCallForParticipant>>) {
  if (call.status !== CallStatus.RINGING && call.status !== CallStatus.ACTIVE) {
    throw new HttpError(409, "Call is already ended", "SOCIAL_CALL_ENDED");
  }
}

async function shouldEndAfterParticipantExit(tx: Prisma.TransactionClient, callId: string) {
  const activeParticipants = await tx.callParticipant.count({
    where: { callId, status: { in: [CallParticipantStatus.INVITED, CallParticipantStatus.JOINED] } }
  });
  const joinedParticipants = await tx.callParticipant.count({
    where: { callId, status: CallParticipantStatus.JOINED }
  });
  return activeParticipants <= 1 && joinedParticipants <= 1;
}

function getIceServers() {
  const servers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [];
  const stunUrls = splitCsv(env.CALL_STUN_URLS);
  if (stunUrls.length) servers.push({ urls: stunUrls });

  const turnUrls = splitCsv(env.CALL_TURN_URLS);
  if (turnUrls.length && env.CALL_TURN_USERNAME && env.CALL_TURN_CREDENTIAL) {
    servers.push({ urls: turnUrls, username: env.CALL_TURN_USERNAME, credential: env.CALL_TURN_CREDENTIAL });
  }

  return servers;
}

function splitCsv(value: string | undefined) {
  return value
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
}

function encodeCallCursor(cursor: CallCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCallCursor(cursor: string): CallCursor {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<CallCursor>;
    if (!parsed.id || typeof parsed.id !== "string") throw new Error("Invalid cursor");
    return { id: parsed.id };
  } catch {
    throw new HttpError(400, "Invalid call cursor", "SOCIAL_CALL_CURSOR_INVALID");
  }
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
