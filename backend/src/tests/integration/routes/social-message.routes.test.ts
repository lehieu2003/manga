import { FriendshipStatus, SocialConversationType, SocialMembershipStatus, SocialMessageType } from "@prisma/client";
import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  socialConversationFindFirst: vi.fn(),
  socialConversationUpdate: vi.fn(),
  socialConversationMemberUpdate: vi.fn(),
  socialMessageFindMany: vi.fn(),
  socialMessageFindUnique: vi.fn(),
  socialMessageFindUniqueOrThrow: vi.fn(),
  socialMessageFindFirst: vi.fn(),
  socialMessageCreate: vi.fn(),
  socialMessageUpdate: vi.fn(),
  messageReactionUpsert: vi.fn(),
  messageReactionDeleteMany: vi.fn(),
  friendshipFindUnique: vi.fn(),
  cachedMangaFindUnique: vi.fn(),
  cachedChapterFindFirst: vi.fn(),
  emitMessageNew: vi.fn(),
  emitMessageDeleted: vi.fn(),
  emitReadUpdated: vi.fn(),
  emitReactionUpdated: vi.fn(),
  emitCallEnded: vi.fn(),
  emitCallIncoming: vi.fn(),
  emitCallParticipantJoined: vi.fn(),
  emitCallParticipantLeft: vi.fn()
}));

vi.mock("../../../infrastructure/database/client.js", () => ({
  prisma: {
    $transaction: prismaMocks.transaction,
    socialConversation: {
      findFirst: prismaMocks.socialConversationFindFirst,
      update: prismaMocks.socialConversationUpdate
    },
    socialMessage: {
      findMany: prismaMocks.socialMessageFindMany,
      findUnique: prismaMocks.socialMessageFindUnique,
      findUniqueOrThrow: prismaMocks.socialMessageFindUniqueOrThrow,
      findFirst: prismaMocks.socialMessageFindFirst,
      create: prismaMocks.socialMessageCreate,
      update: prismaMocks.socialMessageUpdate
    },
    messageReaction: {
      upsert: prismaMocks.messageReactionUpsert,
      deleteMany: prismaMocks.messageReactionDeleteMany
    },
    socialConversationMember: {
      update: prismaMocks.socialConversationMemberUpdate
    },
    friendship: {
      findUnique: prismaMocks.friendshipFindUnique
    },
    cachedManga: {
      findUnique: prismaMocks.cachedMangaFindUnique
    },
    cachedChapter: {
      findFirst: prismaMocks.cachedChapterFindFirst
    }
  }
}));

vi.mock("../../../infrastructure/realtime/socket-server.js", () => ({
  emitMessageNew: prismaMocks.emitMessageNew,
  emitMessageDeleted: prismaMocks.emitMessageDeleted,
  emitReactionUpdated: prismaMocks.emitReactionUpdated,
  emitReadUpdated: prismaMocks.emitReadUpdated,
  emitCallEnded: prismaMocks.emitCallEnded,
  emitCallIncoming: prismaMocks.emitCallIncoming,
  emitCallParticipantJoined: prismaMocks.emitCallParticipantJoined,
  emitCallParticipantLeft: prismaMocks.emitCallParticipantLeft
}));

const expectedMessageInclude = {
  sender: { select: { id: true, displayName: true, avatarUrl: true } },
  reactions: { select: { userId: true, emoji: true } }
};

describe("social message routes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists messages for an active conversation member", async () => {
    const app = await makeSocialMessageApp();
    prismaMocks.socialConversationFindFirst.mockResolvedValue(makeConversation());
    prismaMocks.socialMessageFindMany.mockResolvedValue([makeMessage()]);

    const response = await app.inject({ method: "GET", url: "/api/social/conversations/conv-1/messages?limit=20" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: [{ id: "msg-1", conversationId: "conv-1", content: "hello", sender: { id: "user-1" } }],
      nextCursor: null
    });
    expect(prismaMocks.socialConversationFindFirst).toHaveBeenCalledWith({
      where: { id: "conv-1", members: { some: { userId: "user-1", status: SocialMembershipStatus.ACTIVE } } },
      include: { members: { select: { id: true, conversationId: true, userId: true, status: true, lastReadMessageId: true, lastReadAt: true } } }
    });
    expect(prismaMocks.socialMessageFindMany).toHaveBeenCalledWith({
      where: { conversationId: "conv-1" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 21,
      include: expectedMessageInclude
    });
    await app.close();
  });

  it("creates a text message idempotently and emits after commit", async () => {
    const app = await makeSocialMessageApp();
    prismaMocks.socialConversationFindFirst.mockResolvedValue(makeConversation());
    prismaMocks.friendshipFindUnique.mockResolvedValue({ status: FriendshipStatus.ACCEPTED });
    prismaMocks.socialMessageFindUnique.mockResolvedValue(null);
    prismaMocks.socialMessageCreate.mockResolvedValue(makeMessage());
    prismaMocks.transaction.mockImplementation((callback) =>
      callback({
        socialMessage: { create: prismaMocks.socialMessageCreate },
        socialConversation: { update: prismaMocks.socialConversationUpdate }
      })
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations/conv-1/messages",
      payload: {
        clientMessageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        type: "TEXT",
        content: "hello"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ message: { id: "msg-1", content: "hello" }, idempotent: false });
    expect(prismaMocks.socialMessageCreate).toHaveBeenCalledWith({
      data: {
        conversationId: "conv-1",
        senderId: "user-1",
        clientMessageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        type: SocialMessageType.TEXT,
        content: "hello"
      },
      include: expectedMessageInclude
    });
    expect(prismaMocks.socialConversationUpdate).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: { lastMessageAt: new Date("2024-01-04T00:00:00.000Z") }
    });
    expect(prismaMocks.emitMessageNew).toHaveBeenCalledWith("conv-1", expect.objectContaining({ id: "msg-1" }));
    await app.close();
  });

  it("returns an existing message when the client message id is retried", async () => {
    const app = await makeSocialMessageApp();
    prismaMocks.socialConversationFindFirst.mockResolvedValue(makeConversation());
    prismaMocks.friendshipFindUnique.mockResolvedValue({ status: FriendshipStatus.ACCEPTED });
    prismaMocks.socialMessageFindUnique.mockResolvedValue(makeMessage());

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations/conv-1/messages",
      payload: {
        clientMessageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        content: "hello"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ message: { id: "msg-1" }, idempotent: true });
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
    expect(prismaMocks.emitMessageNew).not.toHaveBeenCalled();
    await app.close();
  });

  it("creates a manga share from cached catalog data", async () => {
    const app = await makeSocialMessageApp();
    prismaMocks.socialConversationFindFirst.mockResolvedValue(makeConversation());
    prismaMocks.friendshipFindUnique.mockResolvedValue({ status: FriendshipStatus.ACCEPTED });
    prismaMocks.socialMessageFindUnique.mockResolvedValue(null);
    prismaMocks.cachedMangaFindUnique.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Alpha Manga",
      coverUrl: "/api/media/cover/alpha.jpg",
      status: "ongoing",
      year: 2026,
      contentRating: "safe",
      tags: ["Action", "Drama"]
    });
    prismaMocks.cachedChapterFindFirst.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      title: "Start",
      chapter: "1",
      translatedLanguage: "en",
      pages: 12
    });
    prismaMocks.socialMessageCreate.mockResolvedValue(
      makeMessage({
        type: SocialMessageType.MANGA_SHARE,
        content: null,
        attachments: {
          kind: "MANGA_SHARE",
          manga: { id: "11111111-1111-4111-8111-111111111111", title: "Alpha Manga" },
          chapter: { id: "22222222-2222-4222-8222-222222222222", chapter: "1" }
        }
      })
    );
    prismaMocks.transaction.mockImplementation((callback) =>
      callback({
        socialMessage: { create: prismaMocks.socialMessageCreate },
        socialConversation: { update: prismaMocks.socialConversationUpdate }
      })
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations/conv-1/messages",
      payload: {
        clientMessageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        type: "MANGA_SHARE",
        mangaId: "11111111-1111-4111-8111-111111111111",
        chapterId: "22222222-2222-4222-8222-222222222222"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMocks.socialMessageCreate).toHaveBeenCalledWith({
      data: {
        conversationId: "conv-1",
        senderId: "user-1",
        clientMessageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        type: SocialMessageType.MANGA_SHARE,
        content: null,
        attachments: expect.objectContaining({
          kind: "MANGA_SHARE",
          manga: expect.objectContaining({ title: "Alpha Manga" }),
          chapter: expect.objectContaining({ chapter: "1" })
        })
      },
      include: expectedMessageInclude
    });
    await app.close();
  });

  it("rejects sends to a blocked direct conversation", async () => {
    const app = await makeSocialMessageApp();
    prismaMocks.socialConversationFindFirst.mockResolvedValue(makeConversation());
    prismaMocks.friendshipFindUnique.mockResolvedValue({ status: FriendshipStatus.BLOCKED });

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations/conv-1/messages",
      payload: {
        clientMessageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        content: "blocked"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "SOCIAL_DM_BLOCKED" });
    expect(prismaMocks.socialMessageCreate).not.toHaveBeenCalled();
    await app.close();
  });

  it("advances the read checkpoint and emits a read update", async () => {
    const app = await makeSocialMessageApp();
    prismaMocks.socialConversationFindFirst.mockResolvedValue(makeConversation());
    prismaMocks.socialMessageFindFirst.mockResolvedValueOnce({ id: "msg-1", createdAt: new Date("2024-01-04T00:00:00.000Z") });
    prismaMocks.socialConversationMemberUpdate.mockResolvedValue({
      id: "member-1",
      conversationId: "conv-1",
      userId: "user-1",
      lastReadMessageId: "msg-1",
      lastReadAt: new Date("2024-01-04T00:01:00.000Z")
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/social/conversations/conv-1/read",
      payload: { lastMessageId: "msg-1" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ readState: { conversationId: "conv-1", userId: "user-1", lastReadMessageId: "msg-1" } });
    expect(prismaMocks.socialConversationMemberUpdate).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId: "conv-1", userId: "user-1" } },
      data: { lastReadMessageId: "msg-1", lastReadAt: expect.any(Date) },
      select: { id: true, conversationId: true, userId: true, lastReadMessageId: true, lastReadAt: true }
    });
    expect(prismaMocks.emitReadUpdated).toHaveBeenCalledWith({
      conversationId: "conv-1",
      userId: "user-1",
      lastReadMessageId: "msg-1",
      lastReadAt: new Date("2024-01-04T00:01:00.000Z")
    });
    await app.close();
  });

  it("does not move the read checkpoint backwards", async () => {
    const app = await makeSocialMessageApp();
    prismaMocks.socialConversationFindFirst.mockResolvedValue(
      makeConversation({
        members: [
          {
            id: "member-1",
            conversationId: "conv-1",
            userId: "user-1",
            status: SocialMembershipStatus.ACTIVE,
            lastReadMessageId: "msg-2",
            lastReadAt: new Date("2024-01-05T00:00:00.000Z")
          },
          { id: "member-2", conversationId: "conv-1", userId: "user-2", status: SocialMembershipStatus.ACTIVE, lastReadMessageId: null, lastReadAt: null }
        ]
      })
    );
    prismaMocks.socialMessageFindFirst
      .mockResolvedValueOnce({ id: "msg-1", createdAt: new Date("2024-01-04T00:00:00.000Z") })
      .mockResolvedValueOnce({ id: "msg-2", createdAt: new Date("2024-01-05T00:00:00.000Z") });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/social/conversations/conv-1/read",
      payload: { lastMessageId: "msg-1" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ readState: { lastReadMessageId: "msg-2" } });
    expect(prismaMocks.socialConversationMemberUpdate).not.toHaveBeenCalled();
    expect(prismaMocks.emitReadUpdated).not.toHaveBeenCalled();
    await app.close();
  });

  it("soft deletes the sender's message and emits a delete event", async () => {
    const app = await makeSocialMessageApp();
    prismaMocks.socialMessageFindFirst.mockResolvedValue(makeMessage());
    prismaMocks.socialMessageUpdate.mockResolvedValue(makeMessage({ deletedAt: new Date("2024-01-05T00:00:00.000Z"), updatedAt: new Date("2024-01-05T00:00:00.000Z") }));

    const response = await app.inject({ method: "DELETE", url: "/api/social/messages/msg-1" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: { id: "msg-1", content: null, attachments: null, deletedAt: "2024-01-05T00:00:00.000Z" },
      idempotent: false
    });
    expect(prismaMocks.socialMessageFindFirst).toHaveBeenCalledWith({
      where: {
        id: "msg-1",
        conversation: { members: { some: { userId: "user-1", status: SocialMembershipStatus.ACTIVE } } }
      },
      include: expectedMessageInclude
    });
    expect(prismaMocks.socialMessageUpdate).toHaveBeenCalledWith({
      where: { id: "msg-1" },
      data: { deletedAt: expect.any(Date) },
      include: expectedMessageInclude
    });
    expect(prismaMocks.emitMessageDeleted).toHaveBeenCalledWith("conv-1", "msg-1");
    await app.close();
  });

  it("rejects deleting another sender's message", async () => {
    const app = await makeSocialMessageApp();
    prismaMocks.socialMessageFindFirst.mockResolvedValue(makeMessage({ senderId: "user-2" }));

    const response = await app.inject({ method: "DELETE", url: "/api/social/messages/msg-1" });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "SOCIAL_MESSAGE_DELETE_FORBIDDEN" });
    expect(prismaMocks.socialMessageUpdate).not.toHaveBeenCalled();
    expect(prismaMocks.emitMessageDeleted).not.toHaveBeenCalled();
    await app.close();
  });

  it("treats deleting an already deleted message as idempotent", async () => {
    const app = await makeSocialMessageApp();
    prismaMocks.socialMessageFindFirst.mockResolvedValue(makeMessage({ deletedAt: new Date("2024-01-05T00:00:00.000Z") }));

    const response = await app.inject({ method: "DELETE", url: "/api/social/messages/msg-1" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ message: { id: "msg-1", content: null }, idempotent: true });
    expect(prismaMocks.socialMessageUpdate).not.toHaveBeenCalled();
    expect(prismaMocks.emitMessageDeleted).not.toHaveBeenCalled();
    await app.close();
  });

  it("adds a message reaction and emits aggregate counts", async () => {
    const app = await makeSocialMessageApp();
    prismaMocks.socialMessageFindFirst.mockResolvedValue({ id: "msg-1", conversationId: "conv-1" });
    prismaMocks.messageReactionUpsert.mockResolvedValue({ id: "reaction-1" });
    prismaMocks.socialMessageFindUniqueOrThrow.mockResolvedValue(
      makeMessage({
        reactions: [
          { userId: "user-1", emoji: "like" },
          { userId: "user-2", emoji: "like" }
        ]
      })
    );

    const response = await app.inject({ method: "PUT", url: "/api/social/messages/msg-1/reactions/like" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: {
        id: "msg-1",
        reactionCounts: { like: 2 },
        currentUserReactions: ["like"]
      }
    });
    expect(prismaMocks.messageReactionUpsert).toHaveBeenCalledWith({
      where: { messageId_userId_emoji: { messageId: "msg-1", userId: "user-1", emoji: "like" } },
      update: {},
      create: { messageId: "msg-1", userId: "user-1", emoji: "like" }
    });
    expect(prismaMocks.emitReactionUpdated).toHaveBeenCalledWith({
      conversationId: "conv-1",
      messageId: "msg-1",
      reactionCounts: { like: 2 }
    });
    await app.close();
  });

  it("removes a message reaction idempotently", async () => {
    const app = await makeSocialMessageApp();
    prismaMocks.socialMessageFindFirst.mockResolvedValue({ id: "msg-1", conversationId: "conv-1" });
    prismaMocks.messageReactionDeleteMany.mockResolvedValue({ count: 1 });
    prismaMocks.socialMessageFindUniqueOrThrow.mockResolvedValue(makeMessage());

    const response = await app.inject({ method: "DELETE", url: "/api/social/messages/msg-1/reactions/like" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: { id: "msg-1", reactionCounts: {}, currentUserReactions: [] }
    });
    expect(prismaMocks.messageReactionDeleteMany).toHaveBeenCalledWith({
      where: { messageId: "msg-1", userId: "user-1", emoji: "like" }
    });
    expect(prismaMocks.emitReactionUpdated).toHaveBeenCalledWith({
      conversationId: "conv-1",
      messageId: "msg-1",
      reactionCounts: {}
    });
    await app.close();
  });
});

async function makeSocialMessageApp() {
  const { socialConversationRoutes } = await import("../../../app/routes/v1/social-conversation.routes.js");
  const app = Fastify();
  app.decorate("authenticate", async (request) => {
    request.user = { sub: "user-1", email: "reader@example.com", role: "USER" };
  });
  await app.register(socialConversationRoutes, { prefix: "/api" });
  return app;
}

type ConversationFixture = {
  id: string;
  type: SocialConversationType;
  title: string | null;
  avatarUrl: string | null;
  directKey: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  members: Array<{
    id: string;
    conversationId: string;
    userId: string;
    status: SocialMembershipStatus;
    lastReadMessageId: string | null;
    lastReadAt: Date | null;
  }>;
};

function makeConversation(input: Partial<ConversationFixture> = {}) {
  return { ...makeConversationBase(), ...input };
}

function makeConversationBase(): ConversationFixture {
  return {
    id: "conv-1",
    type: SocialConversationType.DM,
    title: null,
    avatarUrl: null,
    directKey: "user-1:user-2",
    lastMessageAt: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    members: [
      { id: "member-1", conversationId: "conv-1", userId: "user-1", status: SocialMembershipStatus.ACTIVE, lastReadMessageId: null, lastReadAt: null },
      { id: "member-2", conversationId: "conv-1", userId: "user-2", status: SocialMembershipStatus.ACTIVE, lastReadMessageId: null, lastReadAt: null }
    ]
  };
}

type MessageFixture = {
  id: string;
  conversationId: string;
  senderId: string | null;
  clientMessageId: string | null;
  type: SocialMessageType;
  content: string | null;
  attachments: unknown;
  replyToId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sender: { id: string; displayName: string; avatarUrl: string | null } | null;
  reactions: Array<{ userId: string; emoji: string }>;
};

function makeMessage(input: Partial<MessageFixture> = {}): MessageFixture {
  return {
    id: "msg-1",
    conversationId: "conv-1",
    senderId: "user-1",
    clientMessageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    type: SocialMessageType.TEXT,
    content: "hello",
    attachments: null,
    replyToId: null,
    deletedAt: null,
    createdAt: new Date("2024-01-04T00:00:00.000Z"),
    updatedAt: new Date("2024-01-04T00:00:00.000Z"),
    sender: { id: "user-1", displayName: "Reader", avatarUrl: null },
    reactions: [],
    ...input
  };
}
