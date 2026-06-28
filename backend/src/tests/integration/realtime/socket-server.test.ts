import jwt from "@fastify/jwt";
import { SocialMembershipStatus } from "@prisma/client";
import Fastify from "fastify";
import { io as connectSocket, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  socialConversationMemberFindMany: vi.fn(),
  socialConversationMemberFindFirst: vi.fn(),
  socialConversationMemberUpdate: vi.fn(),
  socialConversationFindFirst: vi.fn(),
  socialMessageFindFirst: vi.fn()
}));

vi.mock("../../../infrastructure/database/client.js", () => ({
  prisma: {
    socialConversationMember: {
      findMany: prismaMocks.socialConversationMemberFindMany,
      findFirst: prismaMocks.socialConversationMemberFindFirst,
      update: prismaMocks.socialConversationMemberUpdate
    },
    socialConversation: {
      findFirst: prismaMocks.socialConversationFindFirst
    },
    socialMessage: {
      findFirst: prismaMocks.socialMessageFindFirst
    }
  }
}));

vi.mock("../../../infrastructure/cache/client.js", () => ({
  redisReady: false,
  redis: {}
}));

describe("realtime socket server", () => {
  afterEach(async () => {
    const { closeRealtimeServer } = await import("../../../infrastructure/realtime/socket-server.js");
    await closeRealtimeServer();
    vi.clearAllMocks();
  });

  it("rejects sockets without a valid JWT", async () => {
    const context = await makeRealtimeContext();
    const socket = connectSocket(context.url, { auth: { token: "invalid" }, reconnection: false, timeout: 500 });

    await expect(waitForConnectError(socket)).resolves.toBe("UNAUTHORIZED");
    socket.disconnect();
    await context.app.close();
  });

  it("broadcasts typing indicators only after confirming active membership", async () => {
    const context = await makeRealtimeContext();
    prismaMocks.socialConversationMemberFindMany.mockImplementation(({ where }: { where: { userId: string } }) => {
      if (where.userId === "user-1" || where.userId === "user-2") return Promise.resolve([{ conversationId: "conv-1" }]);
      return Promise.resolve([]);
    });
    prismaMocks.socialConversationMemberFindFirst.mockResolvedValue({
      conversationId: "conv-1",
      userId: "user-1",
      status: SocialMembershipStatus.ACTIVE,
      user: { id: "user-1", displayName: "Reader One", avatarUrl: null }
    });

    const sender = connectSocket(context.url, { auth: { token: context.signToken("user-1") }, reconnection: false });
    const receiver = connectSocket(context.url, { auth: { token: context.signToken("user-2") }, reconnection: false });
    await Promise.all([waitForConnect(sender), waitForConnect(receiver)]);

    const indicatorPromise = waitForEvent(receiver, "typing:indicator");
    sender.emit("typing:start", { conversationId: "conv-1" });

    await expect(indicatorPromise).resolves.toMatchObject({
      conversationId: "conv-1",
      typing: true,
      user: { id: "user-1", displayName: "Reader One", avatarUrl: null }
    });
    expect(prismaMocks.socialConversationMemberFindFirst).toHaveBeenCalledWith({
      where: { conversationId: "conv-1", userId: "user-1", status: "ACTIVE" },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } }
    });

    sender.disconnect();
    receiver.disconnect();
    await context.app.close();
  });

  it("marks messages read through the socket command service path", async () => {
    const context = await makeRealtimeContext();
    prismaMocks.socialConversationMemberFindMany.mockResolvedValue([{ conversationId: "conv-1" }]);
    prismaMocks.socialConversationFindFirst.mockResolvedValue({
      id: "conv-1",
      members: [
        {
          id: "member-1",
          conversationId: "conv-1",
          userId: "user-1",
          status: SocialMembershipStatus.ACTIVE,
          lastReadMessageId: null,
          lastReadAt: null
        }
      ]
    });
    prismaMocks.socialMessageFindFirst.mockResolvedValue({ id: "msg-1", createdAt: new Date("2024-01-04T00:00:00.000Z") });
    prismaMocks.socialConversationMemberUpdate.mockResolvedValue({
      id: "member-1",
      conversationId: "conv-1",
      userId: "user-1",
      lastReadMessageId: "msg-1",
      lastReadAt: new Date("2024-01-04T00:01:00.000Z")
    });

    const socket = connectSocket(context.url, { auth: { token: context.signToken("user-1") }, reconnection: false });
    await waitForConnect(socket);

    const ack = await emitWithAck(socket, "message:read", { conversationId: "conv-1", lastMessageId: "msg-1" });

    expect(ack).toMatchObject({
      ok: true,
      data: { readState: { conversationId: "conv-1", userId: "user-1", lastReadMessageId: "msg-1" } }
    });
    expect(prismaMocks.socialConversationMemberUpdate).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId: "conv-1", userId: "user-1" } },
      data: { lastReadMessageId: "msg-1", lastReadAt: expect.any(Date) },
      select: { id: true, conversationId: true, userId: true, lastReadMessageId: true, lastReadAt: true }
    });

    socket.disconnect();
    await context.app.close();
  });
});

async function makeRealtimeContext() {
  const { registerRealtimeServer } = await import("../../../infrastructure/realtime/socket-server.js");
  const app = Fastify({ logger: false });
  await app.register(jwt, { secret: "test-secret" });
  await registerRealtimeServer(app);
  await app.listen({ host: "127.0.0.1", port: 0 });

  const address = app.server.address();
  if (!address || typeof address === "string") throw new Error("Expected test server address");

  return {
    app,
    url: `http://127.0.0.1:${address.port}`,
    signToken(userId: string) {
      return app.jwt.sign({ sub: userId, email: `${userId}@example.com`, role: "USER" });
    }
  };
}

function waitForConnect(socket: Socket) {
  return new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
}

function waitForConnectError(socket: Socket) {
  return new Promise<string>((resolve) => {
    socket.once("connect_error", (error) => resolve(error.message));
  });
}

function waitForEvent<TPayload>(socket: Socket, event: string) {
  return new Promise<TPayload>((resolve) => {
    socket.once(event, resolve);
  });
}

function emitWithAck<TPayload, TAck>(socket: Socket, event: string, payload: TPayload) {
  return new Promise<TAck>((resolve) => {
    socket.emit(event, payload, resolve);
  });
}
