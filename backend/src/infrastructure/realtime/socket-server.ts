import { createAdapter } from "@socket.io/redis-adapter";
import type { FastifyInstance } from "fastify";
import { Redis } from "ioredis";
import { Server, type Socket } from "socket.io";
import { prisma } from "../database/client.js";
import { env } from "../../shared/configs/app.config.js";
import { redisReady } from "../cache/client.js";

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
};

type ReadUpdatedPayload = {
  conversationId: string;
  userId: string;
  lastReadMessageId: string;
  lastReadAt: Date;
};

type ServerToClientEvents = {
  "notification:new": (payload: NotificationPayload) => void;
  "friend:incoming": (payload: FriendIncomingPayload) => void;
  "friend:accepted": (payload: FriendAcceptedPayload) => void;
  "message:new": (payload: { conversationId: string; message: SocialMessagePayload }) => void;
  "read:updated": (payload: ReadUpdatedPayload) => void;
  "presence:update": (payload: { userId: string; online: boolean; lastSeenAt: Date }) => void;
};

type ClientToServerEvents = {
  "presence:ping": () => void;
};

type InterServerEvents = Record<string, never>;

type SocketData = {
  userId: string;
};

type RealtimeServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

let io: RealtimeServer | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

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
    await socket.join(userRoom(userId));

    try {
      const memberships = await prisma.socialConversationMember.findMany({
        where: { userId, status: "ACTIVE" },
        select: { conversationId: true }
      });
      await Promise.all(memberships.map((membership) => socket.join(conversationRoom(membership.conversationId))));
    } catch (error) {
      app.log.warn({ error, userId }, "Failed to join realtime conversation rooms");
    }

    socket.on("presence:ping", () => {
      socket.emit("presence:update", { userId, online: true, lastSeenAt: new Date() });
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

export function emitReadUpdated(payload: ReadUpdatedPayload) {
  io?.to(conversationRoom(payload.conversationId)).emit("read:updated", payload);
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
