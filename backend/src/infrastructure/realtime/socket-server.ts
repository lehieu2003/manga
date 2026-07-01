import { createAdapter } from "@socket.io/redis-adapter";
import type { FastifyInstance } from "fastify";
import { Redis } from "ioredis";
import { Server, type Socket } from "socket.io";
import { prisma } from "../database/client.js";
import { env } from "../../shared/configs/app.config.js";
import { redis, redisReady } from "../cache/client.js";

type NotificationPayload = {
  id: string;
  userId: string;
  actorId: string;
  type: string;
  subjectType: string;
  subjectId: string;
  payload: unknown;
  readAt: Date | null;
  createdAt: Date;
};

type FriendIncomingPayload = {
  friendshipId: string;
  requesterId: string;
};

type FriendAcceptedPayload = {
  friendshipId: string;
  friendId: string;
  conversationId: string;
};

type SocialMessagePayload = {
  id: string;
  conversationId: string;
  senderId: string | null;
  type: string;
  content: string | null;
  attachments: unknown;
  replyToId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sender: { id: string; displayName: string; avatarUrl: string | null } | null;
  reactionCounts?: Record<string, number>;
  currentUserReactions?: string[];
};

type ReadUpdatedPayload = {
  conversationId: string;
  userId: string;
  lastReadMessageId: string;
  lastReadAt: Date;
};

type UserSummaryPayload = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

type TypingIndicatorPayload = {
  conversationId: string;
  user: UserSummaryPayload;
  typing: boolean;
};

type SocialMemberPayload = {
  id: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: Date;
  user: UserSummaryPayload;
};

type ReactionUpdatedPayload = {
  conversationId: string;
  messageId: string;
  reactionCounts: Record<string, number>;
};

type CallPayload = {
  id: string;
  conversationId: string;
  initiatorId: string;
  status: string;
  mediaType: string;
  startedAt: Date;
  answeredAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  initiator: UserSummaryPayload;
  participants: Array<{
    id: string;
    callId: string;
    userId: string;
    status: string;
    joinedAt: Date | null;
    leftAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    user: UserSummaryPayload;
  }>;
};

type CallSignalPayload = {
  callId: string;
  toUserId: string;
  fromUserId?: string;
  description?: unknown;
  candidate?: unknown;
  mediaState?: {
    audioEnabled?: boolean;
    videoEnabled?: boolean;
  };
};

type RealtimeAck<TData> =
  | { ok: true; data: TData }
  | { ok: false; error: { code: string; message: string } };

type ReadStatePayload = {
  readState: {
    conversationId: string;
    userId: string;
    lastReadMessageId: string | null;
    lastReadAt: Date | null;
  };
};

type ReadAck = (result: RealtimeAck<ReadStatePayload>) => void;
type CallSignalAck = (result: RealtimeAck<{ relayed: true }>) => void;

type ServerToClientEvents = {
  "notification:new": (payload: NotificationPayload) => void;
  "friend:incoming": (payload: FriendIncomingPayload) => void;
  "friend:accepted": (payload: FriendAcceptedPayload) => void;
  "message:new": (payload: { conversationId: string; message: SocialMessagePayload }) => void;
  "message:deleted": (payload: { conversationId: string; messageId: string }) => void;
  "typing:indicator": (payload: TypingIndicatorPayload) => void;
  "read:updated": (payload: ReadUpdatedPayload) => void;
  "member:invited": (payload: { conversationId: string; member: SocialMemberPayload }) => void;
  "member:added": (payload: { conversationId: string; member: SocialMemberPayload }) => void;
  "member:removed": (payload: { conversationId: string; userId: string }) => void;
  "reaction:updated": (payload: ReactionUpdatedPayload) => void;
  "presence:update": (payload: { userId: string; online: boolean; lastSeenAt: Date }) => void;
  "call:incoming": (payload: CallPayload) => void;
  "call:participant-joined": (payload: { callId: string; userId: string; call: CallPayload }) => void;
  "call:participant-left": (payload: { callId: string; userId: string; status: string; call: CallPayload }) => void;
  "call:ended": (payload: { callId: string; reason: string; call: CallPayload }) => void;
  "call:offer": (payload: CallSignalPayload) => void;
  "call:answer": (payload: CallSignalPayload) => void;
  "call:ice-candidate": (payload: CallSignalPayload) => void;
  "call:media-state": (payload: CallSignalPayload) => void;
};

type ClientToServerEvents = {
  "typing:start": (payload: { conversationId: string }) => void;
  "typing:stop": (payload: { conversationId: string }) => void;
  "message:read": (payload: { conversationId: string; lastMessageId: string }, ack?: ReadAck) => void;
  "presence:ping": () => void;
  "call:offer": (payload: CallSignalPayload, ack?: CallSignalAck) => void;
  "call:answer": (payload: CallSignalPayload, ack?: CallSignalAck) => void;
  "call:ice-candidate": (payload: CallSignalPayload, ack?: CallSignalAck) => void;
  "call:media-state": (payload: CallSignalPayload, ack?: CallSignalAck) => void;
};

type InterServerEvents = Record<string, never>;

type SocketData = {
  userId: string;
  conversationIds: string[];
};

type RealtimeServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

let io: RealtimeServer | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;
const presenceSocketsByUser = new Map<string, Set<string>>();

export async function registerRealtimeServer(app: FastifyInstance) {
  const server: RealtimeServer = new Server(app.server, {
    cors: {
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true
    }
  });

  server.use(async (socket, next) => {
    const token = readHandshakeToken(socket);
    if (!token) {
      next(new Error("UNAUTHORIZED"));
      return;
    }

    try {
      const payload = await app.jwt.verify<{ sub: string }>(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  if (redisReady) {
    try {
      pubClient = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2, enableOfflineQueue: false });
      subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      server.adapter(createAdapter(pubClient, subClient));
      app.log.info("Socket.io Redis adapter enabled");
    } catch (error) {
      pubClient?.disconnect();
      subClient?.disconnect();
      pubClient = null;
      subClient = null;
      app.log.warn({ error }, "Socket.io Redis adapter unavailable; using single-instance realtime delivery");
    }
  } else {
    app.log.warn("Redis is not ready; using single-instance realtime delivery");
  }

  server.on("connection", async (socket) => {
    const { userId } = socket.data;
    socket.data.conversationIds = [];
    await socket.join(userRoom(userId));

    try {
      const memberships = await prisma.socialConversationMember.findMany({
        where: { userId, status: "ACTIVE" },
        select: { conversationId: true }
      });
      socket.data.conversationIds = memberships.map((membership) => membership.conversationId);
      await Promise.all(memberships.map((membership) => socket.join(conversationRoom(membership.conversationId))));
    } catch (error) {
      app.log.warn({ error, userId }, "Failed to join realtime conversation rooms");
    }

    const cameOnline = await markSocketOnline(socket.id, userId, app);
    if (cameOnline) emitPresenceUpdate(socket.data.conversationIds, { userId, online: true, lastSeenAt: new Date() });

    socket.on("presence:ping", () => {
      void refreshSocketPresence(socket.id, userId, app);
      socket.emit("presence:update", { userId, online: true, lastSeenAt: new Date() });
    });

    socket.on("typing:start", (payload) => {
      void handleTypingEvent(socket, payload, true, app);
    });

    socket.on("typing:stop", (payload) => {
      void handleTypingEvent(socket, payload, false, app);
    });

    socket.on("message:read", (payload, ack) => {
      void handleReadEvent(socket, payload, ack, app);
    });

    socket.on("call:offer", (payload, ack) => {
      void handleCallSignalEvent(socket, "call:offer", payload, ack, app);
    });

    socket.on("call:answer", (payload, ack) => {
      void handleCallSignalEvent(socket, "call:answer", payload, ack, app);
    });

    socket.on("call:ice-candidate", (payload, ack) => {
      void handleCallSignalEvent(socket, "call:ice-candidate", payload, ack, app);
    });

    socket.on("call:media-state", (payload, ack) => {
      void handleCallSignalEvent(socket, "call:media-state", payload, ack, app);
    });

    socket.on("disconnect", () => {
      void handleSocketDisconnect(socket, app);
    });
  });

  io = server;
  return server;
}

export async function closeRealtimeServer() {
  const server = io;
  io = null;

  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  pubClient?.disconnect();
  subClient?.disconnect();
  pubClient = null;
  subClient = null;
}

export function emitToUser(userId: string, event: "notification:new", payload: NotificationPayload): void;
export function emitToUser(userId: string, event: "friend:incoming", payload: FriendIncomingPayload): void;
export function emitToUser(userId: string, event: "friend:accepted", payload: FriendAcceptedPayload): void;
export function emitToUser(userId: string, event: "notification:new" | "friend:incoming" | "friend:accepted", payload: NotificationPayload | FriendIncomingPayload | FriendAcceptedPayload) {
  const server = io;
  if (!server) return;

  if (event === "notification:new") {
    server.to(userRoom(userId)).emit(event, payload as NotificationPayload);
    return;
  }

  if (event === "friend:incoming") {
    server.to(userRoom(userId)).emit(event, payload as FriendIncomingPayload);
    return;
  }

  server.to(userRoom(userId)).emit(event, payload as FriendAcceptedPayload);
}

export function emitNotification(payload: NotificationPayload) {
  emitToUser(payload.userId, "notification:new", payload);
}

export function emitFriendIncoming(userId: string, payload: FriendIncomingPayload) {
  emitToUser(userId, "friend:incoming", payload);
}

export function emitFriendAccepted(userId: string, payload: FriendAcceptedPayload) {
  emitToUser(userId, "friend:accepted", payload);
}

export function emitMessageNew(conversationId: string, message: SocialMessagePayload) {
  io?.to(conversationRoom(conversationId)).emit("message:new", { conversationId, message });
}

export function emitMessageDeleted(conversationId: string, messageId: string) {
  io?.to(conversationRoom(conversationId)).emit("message:deleted", { conversationId, messageId });
}

export function emitReactionUpdated(payload: ReactionUpdatedPayload) {
  io?.to(conversationRoom(payload.conversationId)).emit("reaction:updated", payload);
}

export function emitCallIncoming(userId: string, call: CallPayload) {
  io?.to(userRoom(userId)).emit("call:incoming", call);
}

export function emitCallParticipantJoined(conversationId: string, payload: { callId: string; userId: string; call: CallPayload }) {
  io?.to(conversationRoom(conversationId)).emit("call:participant-joined", payload);
}

export function emitCallParticipantLeft(conversationId: string, payload: { callId: string; userId: string; status: string; call: CallPayload }) {
  io?.to(conversationRoom(conversationId)).emit("call:participant-left", payload);
}

export function emitCallEnded(conversationId: string, payload: { callId: string; reason: string; call: CallPayload }) {
  io?.to(conversationRoom(conversationId)).emit("call:ended", payload);
}

export function emitReadUpdated(payload: ReadUpdatedPayload) {
  io?.to(conversationRoom(payload.conversationId)).emit("read:updated", payload);
}

export function emitMemberInvited(conversationId: string, targetUserId: string, member: SocialMemberPayload) {
  const server = io;
  if (!server) return;
  server.to(conversationRoom(conversationId)).to(userRoom(targetUserId)).emit("member:invited", { conversationId, member });
}

export function emitMemberAdded(conversationId: string, userId: string, member: SocialMemberPayload) {
  const server = io;
  if (!server) return;
  server.in(userRoom(userId)).socketsJoin(conversationRoom(conversationId));
  server.to(conversationRoom(conversationId)).to(userRoom(userId)).emit("member:added", { conversationId, member });
}

export function emitMemberRemoved(conversationId: string, userId: string) {
  const server = io;
  if (!server) return;
  server.in(userRoom(userId)).socketsLeave(conversationRoom(conversationId));
  server.to(conversationRoom(conversationId)).to(userRoom(userId)).emit("member:removed", { conversationId, userId });
}

function emitPresenceUpdate(conversationIds: string[], payload: { userId: string; online: boolean; lastSeenAt: Date }) {
  const server = io;
  if (!server) return;
  for (const conversationId of conversationIds) server.to(conversationRoom(conversationId)).emit("presence:update", payload);
}

async function markSocketOnline(socketId: string, userId: string, app: FastifyInstance) {
  if (!redisReady) {
    const sockets = presenceSocketsByUser.get(userId) ?? new Set<string>();
    const wasOffline = sockets.size === 0;
    sockets.add(socketId);
    presenceSocketsByUser.set(userId, sockets);
    return wasOffline;
  }

  try {
    const userKey = userPresenceKey(userId);
    const socketKey = socketPresenceKey(socketId);
    const previousCount = await redis.scard(userKey);
    await redis.sadd(userKey, socketId);
    await redis.set(socketKey, userId, "EX", 35);
    return previousCount === 0;
  } catch (error) {
    app.log.warn({ error, userId, socketId }, "Failed to mark realtime socket online");
    return false;
  }
}

async function refreshSocketPresence(socketId: string, userId: string, app: FastifyInstance) {
  if (!redisReady) return;

  try {
    await redis.set(socketPresenceKey(socketId), userId, "EX", 35);
  } catch (error) {
    app.log.warn({ error, userId, socketId }, "Failed to refresh realtime socket presence");
  }
}

async function handleSocketDisconnect(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, app: FastifyInstance) {
  const { userId, conversationIds } = socket.data;
  const wentOffline = await markSocketOffline(socket.id, userId, app);
  if (wentOffline) emitPresenceUpdate(conversationIds, { userId, online: false, lastSeenAt: new Date() });
}

async function markSocketOffline(socketId: string, userId: string, app: FastifyInstance) {
  if (!redisReady) {
    const sockets = presenceSocketsByUser.get(userId);
    if (!sockets) return false;

    sockets.delete(socketId);
    if (sockets.size) return false;

    presenceSocketsByUser.delete(userId);
    return true;
  }

  try {
    const userKey = userPresenceKey(userId);
    await redis.srem(userKey, socketId);
    await redis.del(socketPresenceKey(socketId));
    const remainingCount = await redis.scard(userKey);
    return remainingCount === 0;
  } catch (error) {
    app.log.warn({ error, userId, socketId }, "Failed to mark realtime socket offline");
    return false;
  }
}

async function handleTypingEvent(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  payload: { conversationId: string },
  typing: boolean,
  app: FastifyInstance
) {
  const conversationId = typeof payload?.conversationId === "string" ? payload.conversationId.trim() : "";
  if (!conversationId) return;

  const membership = await prisma.socialConversationMember.findFirst({
    where: { conversationId, userId: socket.data.userId, status: "ACTIVE" },
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } }
    }
  });
  if (!membership) return;

  await socket.join(conversationRoom(conversationId));
  await writeTypingState(conversationId, socket.data.userId, typing, app);
  socket.to(conversationRoom(conversationId)).emit("typing:indicator", { conversationId, user: membership.user, typing });
}

async function writeTypingState(conversationId: string, userId: string, typing: boolean, app: FastifyInstance) {
  if (!redisReady) return;

  const key = `social:typing:${conversationId}:${userId}`;
  try {
    if (typing) {
      await redis.set(key, "1", "EX", 4);
    } else {
      await redis.del(key);
    }
  } catch (error) {
    app.log.warn({ error, conversationId, userId }, "Failed to update realtime typing state");
  }
}

async function handleReadEvent(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  payload: { conversationId: string; lastMessageId: string },
  ack: ReadAck | undefined,
  app: FastifyInstance
) {
  const conversationId = typeof payload?.conversationId === "string" ? payload.conversationId.trim() : "";
  const lastMessageId = typeof payload?.lastMessageId === "string" ? payload.lastMessageId.trim() : "";
  if (!conversationId || !lastMessageId) {
    ack?.({ ok: false, error: { code: "SOCIAL_READ_PAYLOAD_INVALID", message: "conversationId and lastMessageId are required" } });
    return;
  }

  try {
    const { markSocialConversationRead } = await import("../../domain/services/social-message.service.js");
    const data = await markSocialConversationRead(socket.data.userId, conversationId, { lastMessageId });
    ack?.({ ok: true, data });
  } catch (error) {
    app.log.warn({ error, userId: socket.data.userId, conversationId, lastMessageId }, "Failed to mark realtime message read");
    ack?.({
      ok: false,
      error: {
        code: readErrorCode(error),
        message: error instanceof Error ? error.message : "Failed to mark message read"
      }
    });
  }
}

async function handleCallSignalEvent(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  event: "call:offer" | "call:answer" | "call:ice-candidate" | "call:media-state",
  payload: CallSignalPayload,
  ack: CallSignalAck | undefined,
  app: FastifyInstance
) {
  const callId = typeof payload?.callId === "string" ? payload.callId.trim() : "";
  const toUserId = typeof payload?.toUserId === "string" ? payload.toUserId.trim() : "";
  if (!callId || !toUserId || toUserId === socket.data.userId) {
    ack?.({ ok: false, error: { code: "SOCIAL_CALL_SIGNAL_PAYLOAD_INVALID", message: "callId and a different toUserId are required" } });
    return;
  }

  try {
    const { verifyCallSignalParticipant } = await import("../../domain/services/social-call.service.js");
    await verifyCallSignalParticipant(callId, socket.data.userId, toUserId);
    const relayed = { ...payload, callId, toUserId, fromUserId: socket.data.userId };
    emitCallSignal(event, toUserId, relayed);
    ack?.({ ok: true, data: { relayed: true } });
  } catch (error) {
    app.log.warn({ error, userId: socket.data.userId, callId, toUserId, event }, "Failed to relay call signaling event");
    ack?.({
      ok: false,
      error: {
        code: readErrorCode(error),
        message: error instanceof Error ? error.message : "Failed to relay call signaling event"
      }
    });
  }
}

function emitCallSignal(event: "call:offer" | "call:answer" | "call:ice-candidate" | "call:media-state", toUserId: string, payload: CallSignalPayload) {
  const server = io;
  if (!server) return;

  if (event === "call:offer") {
    server.to(userRoom(toUserId)).emit("call:offer", payload);
    return;
  }

  if (event === "call:answer") {
    server.to(userRoom(toUserId)).emit("call:answer", payload);
    return;
  }

  if (event === "call:ice-candidate") {
    server.to(userRoom(toUserId)).emit("call:ice-candidate", payload);
    return;
  }

  server.to(userRoom(toUserId)).emit("call:media-state", payload);
}

function readErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") return error.code;
  return "SOCIAL_READ_FAILED";
}

function readHandshakeToken(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
  const authToken = socket.handshake.auth.token;
  if (typeof authToken === "string") return authToken;

  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) return header.slice("Bearer ".length);

  return undefined;
}

function userRoom(userId: string) {
  return `user:${userId}`;
}

function conversationRoom(conversationId: string) {
  return `conv:${conversationId}`;
}

function socketPresenceKey(socketId: string) {
  return `social:presence:socket:${socketId}`;
}

function userPresenceKey(userId: string) {
  return `social:presence:user:${userId}`;
}
