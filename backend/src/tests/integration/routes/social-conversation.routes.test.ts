import { FriendshipStatus, NotificationSubjectType, NotificationType, SocialConversationType, SocialMemberRole, SocialMembershipStatus } from "@prisma/client";
import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  socialConversationFindMany: vi.fn(),
  socialConversationFindFirst: vi.fn(),
  socialConversationFindUnique: vi.fn(),
  socialConversationCreate: vi.fn(),
  socialConversationMemberCreate: vi.fn(),
  socialConversationMemberUpdate: vi.fn(),
  friendshipFindMany: vi.fn(),
  friendshipFindUnique: vi.fn(),
  notificationCreate: vi.fn(),
  transaction: vi.fn()
}));

const socketMocks = vi.hoisted(() => ({
  emitFriendAccepted: vi.fn(),
  emitFriendIncoming: vi.fn(),
  emitMemberAdded: vi.fn(),
  emitMemberInvited: vi.fn(),
  emitMemberRemoved: vi.fn(),
  emitMessageDeleted: vi.fn(),
  emitMessageNew: vi.fn(),
  emitNotification: vi.fn(),
  emitReadUpdated: vi.fn()
}));

vi.mock("../../../infrastructure/database/client.js", () => ({
  prisma: {
    $transaction: prismaMocks.transaction,
    socialConversation: {
      findMany: prismaMocks.socialConversationFindMany,
      findFirst: prismaMocks.socialConversationFindFirst,
      findUnique: prismaMocks.socialConversationFindUnique,
      create: prismaMocks.socialConversationCreate
    },
    socialConversationMember: {
      create: prismaMocks.socialConversationMemberCreate,
      update: prismaMocks.socialConversationMemberUpdate
    },
    friendship: {
      findMany: prismaMocks.friendshipFindMany,
      findUnique: prismaMocks.friendshipFindUnique
    },
    notification: {
      create: prismaMocks.notificationCreate
    }
  }
}));

vi.mock("../../../infrastructure/realtime/socket-server.js", () => socketMocks);

describe("socialConversationRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a group conversation with accepted friends as active members", async () => {
    const app = await makeSocialConversationApp();
    prismaMocks.transaction.mockImplementation((callback) =>
      callback({
        socialConversation: { create: prismaMocks.socialConversationCreate },
        friendship: { findMany: prismaMocks.friendshipFindMany }
      })
    );
    prismaMocks.friendshipFindMany.mockResolvedValue([
      { userAId: "user-1", userBId: "user-2" },
      { userAId: "user-1", userBId: "user-3" }
    ]);
    prismaMocks.socialConversationCreate.mockResolvedValue(
      makeConversation({
        id: "group-1",
        type: SocialConversationType.GROUP,
        title: "Manga Club",
        directKey: null,
        members: [
          makeMember({ id: "owner-member", userId: "user-1", role: SocialMemberRole.OWNER, displayName: "Reader" }),
          makeMember({ id: "member-2", userId: "user-2", role: SocialMemberRole.MEMBER, displayName: "Friend" }),
          makeMember({ id: "member-3", userId: "user-3", role: SocialMemberRole.MEMBER, displayName: "Mina" })
        ],
        messages: []
      })
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations",
      payload: { title: "  Manga Club  ", memberIds: ["user-2", "user-3", "user-2"] }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      conversation: {
        id: "group-1",
        type: "GROUP",
        title: "Manga Club",
        directKey: null,
        currentMember: { role: "OWNER", status: "ACTIVE" },
        members: [
          { userId: "user-1", role: "OWNER" },
          { userId: "user-2", role: "MEMBER" },
          { userId: "user-3", role: "MEMBER" }
        ]
      }
    });
    expect(prismaMocks.friendshipFindMany).toHaveBeenCalledWith({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { userAId: "user-1", userBId: "user-2" },
          { userAId: "user-1", userBId: "user-3" }
        ]
      },
      select: { userAId: true, userBId: true }
    });
    expect(prismaMocks.socialConversationCreate).toHaveBeenCalledWith({
      data: {
        type: SocialConversationType.GROUP,
        title: "Manga Club",
        directKey: null,
        members: {
          create: [
            { userId: "user-1", role: SocialMemberRole.OWNER, status: SocialMembershipStatus.ACTIVE },
            { userId: "user-2", role: SocialMemberRole.MEMBER, status: SocialMembershipStatus.ACTIVE },
            { userId: "user-3", role: SocialMemberRole.MEMBER, status: SocialMembershipStatus.ACTIVE }
          ]
        }
      },
      include: expect.any(Object)
    });
    await app.close();
  });

  it("rejects group creation when any selected member is not an accepted friend", async () => {
    const app = await makeSocialConversationApp();
    prismaMocks.transaction.mockImplementation((callback) =>
      callback({
        socialConversation: { create: prismaMocks.socialConversationCreate },
        friendship: { findMany: prismaMocks.friendshipFindMany }
      })
    );
    prismaMocks.friendshipFindMany.mockResolvedValue([{ userAId: "user-1", userBId: "user-2" }]);

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations",
      payload: { title: "Manga Club", memberIds: ["user-2", "user-3"] }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "SOCIAL_GROUP_MEMBERS_NOT_FRIENDS" });
    expect(prismaMocks.socialConversationCreate).not.toHaveBeenCalled();
    await app.close();
  });

  it("lists active conversations for the authenticated member", async () => {
    const app = await makeSocialConversationApp();
    prismaMocks.socialConversationFindMany.mockResolvedValue([makeConversation({ id: "conv-1" })]);

    const response = await app.inject({ method: "GET", url: "/api/social/conversations?limit=10" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: [
        {
          id: "conv-1",
          type: "DM",
          currentMember: { role: "MEMBER", status: "ACTIVE" },
          members: [{ userId: "user-1" }, { userId: "user-2" }],
          latestMessage: { id: "msg-1", content: "hello" }
        }
      ],
      nextCursor: null
    });
    expect(prismaMocks.socialConversationFindMany).toHaveBeenCalledWith({
      where: { members: { some: { userId: "user-1", status: SocialMembershipStatus.ACTIVE } } },
      orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }, { id: "desc" }],
      take: 11,
      include: expect.any(Object)
    });
    await app.close();
  });

  it("returns a conversation visible to the authenticated member", async () => {
    const app = await makeSocialConversationApp();
    prismaMocks.socialConversationFindFirst.mockResolvedValue(makeConversation({ id: "conv-2" }));

    const response = await app.inject({ method: "GET", url: "/api/social/conversations/conv-2" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ conversation: { id: "conv-2", currentMember: { id: "member-1" } } });
    expect(prismaMocks.socialConversationFindFirst).toHaveBeenCalledWith({
      where: {
        id: "conv-2",
        members: { some: { userId: "user-1", status: SocialMembershipStatus.ACTIVE } }
      },
      include: expect.any(Object)
    });
    await app.close();
  });

  it("returns an opaque next cursor when another inbox page exists", async () => {
    const app = await makeSocialConversationApp();
    prismaMocks.socialConversationFindMany.mockResolvedValue([makeConversation({ id: "conv-1" }), makeConversation({ id: "conv-2" })]);

    const response = await app.inject({ method: "GET", url: "/api/social/conversations?limit=1" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.nextCursor).toEqual(expect.any(String));

    prismaMocks.socialConversationFindMany.mockResolvedValue([makeConversation({ id: "conv-3" })]);
    const nextResponse = await app.inject({ method: "GET", url: `/api/social/conversations?limit=1&cursor=${body.nextCursor}` });

    expect(nextResponse.statusCode).toBe(200);
    expect(prismaMocks.socialConversationFindMany).toHaveBeenLastCalledWith({
      where: { members: { some: { userId: "user-1", status: SocialMembershipStatus.ACTIVE } } },
      orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }, { id: "desc" }],
      cursor: { id: "conv-1" },
      skip: 1,
      take: 2,
      include: expect.any(Object)
    });
    await app.close();
  });

  it("hides conversations where the user has no active membership", async () => {
    const app = await makeSocialConversationApp();
    prismaMocks.socialConversationFindFirst.mockResolvedValue(null);

    const response = await app.inject({ method: "GET", url: "/api/social/conversations/conv-private" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: "Not Found", code: "SOCIAL_CONVERSATION_NOT_FOUND" });
    await app.close();
  });

  it("lists pending invite conversations for the authenticated invitee", async () => {
    const app = await makeSocialConversationApp("user-4");
    prismaMocks.socialConversationFindMany.mockResolvedValue([
      makeConversation({
        id: "group-1",
        type: SocialConversationType.GROUP,
        title: "Manga Club",
        directKey: null,
        members: [makeMember({ id: "pending-member", userId: "user-4", status: SocialMembershipStatus.PENDING_INVITE, displayName: "Kira" })],
        messages: []
      })
    ]);

    const response = await app.inject({ method: "GET", url: "/api/social/conversations?membershipStatus=PENDING_INVITE&limit=10" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: [{ id: "group-1", type: "GROUP", currentMember: { status: "PENDING_INVITE" } }],
      nextCursor: null
    });
    expect(prismaMocks.socialConversationFindMany).toHaveBeenCalledWith({
      where: { members: { some: { userId: "user-4", status: SocialMembershipStatus.PENDING_INVITE } } },
      orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }, { id: "desc" }],
      take: 11,
      include: expect.any(Object)
    });
    await app.close();
  });

  it("invites an accepted friend to a group as a pending member", async () => {
    const app = await makeSocialConversationApp();
    mockTransaction();
    prismaMocks.socialConversationFindUnique
      .mockResolvedValueOnce(
        makeConversation({
          id: "group-1",
          type: SocialConversationType.GROUP,
          title: "Manga Club",
          directKey: null,
          members: [makeMember({ id: "owner-member", userId: "user-1", role: SocialMemberRole.OWNER, displayName: "Reader" })],
          messages: []
        })
      )
      .mockResolvedValueOnce(
        makeConversation({
          id: "group-1",
          type: SocialConversationType.GROUP,
          title: "Manga Club",
          directKey: null,
          members: [
            makeMember({ id: "owner-member", userId: "user-1", role: SocialMemberRole.OWNER, displayName: "Reader" }),
            makeMember({ id: "pending-member", userId: "user-4", status: SocialMembershipStatus.PENDING_INVITE, displayName: "Kira" })
          ],
          messages: []
        })
      );
    prismaMocks.friendshipFindUnique.mockResolvedValue({ status: FriendshipStatus.ACCEPTED });
    prismaMocks.socialConversationMemberCreate.mockResolvedValue({ id: "pending-member" });
    prismaMocks.notificationCreate.mockResolvedValue(makeNotification());

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations/group-1/invites",
      payload: { userId: "user-4" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      conversation: {
        id: "group-1",
        members: [
          { userId: "user-1", status: "ACTIVE" },
          { userId: "user-4", status: "PENDING_INVITE" }
        ]
      }
    });
    expect(prismaMocks.socialConversationMemberCreate).toHaveBeenCalledWith({
      data: { conversationId: "group-1", userId: "user-4", role: SocialMemberRole.MEMBER, status: SocialMembershipStatus.PENDING_INVITE }
    });
    expect(prismaMocks.notificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-4",
        actorId: "user-1",
        type: NotificationType.GROUP_INVITE,
        subjectType: NotificationSubjectType.CONVERSATION,
        subjectId: "group-1",
        payload: { conversationId: "group-1", inviterId: "user-1", conversationTitle: "Manga Club" }
      }
    });
    expect(socketMocks.emitMemberInvited).toHaveBeenCalledWith(
      "group-1",
      "user-4",
      expect.objectContaining({ userId: "user-4", status: SocialMembershipStatus.PENDING_INVITE })
    );
    await app.close();
  });

  it("does not duplicate notifications for an already pending invite", async () => {
    const app = await makeSocialConversationApp();
    mockTransaction();
    const pendingConversation = makeConversation({
      id: "group-1",
      type: SocialConversationType.GROUP,
      title: "Manga Club",
      directKey: null,
      members: [
        makeMember({ id: "owner-member", userId: "user-1", role: SocialMemberRole.OWNER, displayName: "Reader" }),
        makeMember({ id: "pending-member", userId: "user-4", status: SocialMembershipStatus.PENDING_INVITE, displayName: "Kira" })
      ],
      messages: []
    });
    prismaMocks.socialConversationFindUnique.mockResolvedValue(pendingConversation);
    prismaMocks.friendshipFindUnique.mockResolvedValue({ status: FriendshipStatus.ACCEPTED });

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations/group-1/invites",
      payload: { userId: "user-4" }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMocks.socialConversationMemberCreate).not.toHaveBeenCalled();
    expect(prismaMocks.notificationCreate).not.toHaveBeenCalled();
    expect(socketMocks.emitMemberInvited).not.toHaveBeenCalled();
    await app.close();
  });

  it("rejects invite creation for a non-friend", async () => {
    const app = await makeSocialConversationApp();
    mockTransaction();
    prismaMocks.socialConversationFindUnique.mockResolvedValue(
      makeConversation({
        id: "group-1",
        type: SocialConversationType.GROUP,
        title: "Manga Club",
        directKey: null,
        members: [makeMember({ id: "owner-member", userId: "user-1", role: SocialMemberRole.OWNER, displayName: "Reader" })],
        messages: []
      })
    );
    prismaMocks.friendshipFindUnique.mockResolvedValue(null);

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations/group-1/invites",
      payload: { userId: "user-4" }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "SOCIAL_GROUP_INVITEE_NOT_FRIEND" });
    expect(prismaMocks.socialConversationMemberCreate).not.toHaveBeenCalled();
    await app.close();
  });

  it("rejects invite creation for a direct message conversation", async () => {
    const app = await makeSocialConversationApp();
    mockTransaction();
    prismaMocks.socialConversationFindUnique.mockResolvedValue(makeConversation({ id: "dm-1", type: SocialConversationType.DM }));

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations/dm-1/invites",
      payload: { userId: "user-4" }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: "SOCIAL_GROUP_INVITE_NOT_GROUP" });
    await app.close();
  });

  it("rejects invite creation from a non-privileged group member", async () => {
    const app = await makeSocialConversationApp();
    mockTransaction();
    prismaMocks.socialConversationFindUnique.mockResolvedValue(
      makeConversation({
        id: "group-1",
        type: SocialConversationType.GROUP,
        title: "Manga Club",
        directKey: null,
        members: [makeMember({ id: "member-1", userId: "user-1", role: SocialMemberRole.MEMBER, displayName: "Reader" })],
        messages: []
      })
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations/group-1/invites",
      payload: { userId: "user-4" }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "SOCIAL_GROUP_INVITE_ROLE_FORBIDDEN" });
    expect(prismaMocks.friendshipFindUnique).not.toHaveBeenCalled();
    await app.close();
  });

  it("rejects inviting an active member again", async () => {
    const app = await makeSocialConversationApp();
    mockTransaction();
    prismaMocks.socialConversationFindUnique.mockResolvedValue(
      makeConversation({
        id: "group-1",
        type: SocialConversationType.GROUP,
        title: "Manga Club",
        directKey: null,
        members: [
          makeMember({ id: "owner-member", userId: "user-1", role: SocialMemberRole.OWNER, displayName: "Reader" }),
          makeMember({ id: "active-member", userId: "user-4", displayName: "Kira" })
        ],
        messages: []
      })
    );
    prismaMocks.friendshipFindUnique.mockResolvedValue({ status: FriendshipStatus.ACCEPTED });

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations/group-1/invites",
      payload: { userId: "user-4" }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: "SOCIAL_GROUP_MEMBER_EXISTS" });
    await app.close();
  });

  it("lets an invitee accept their pending group invite", async () => {
    const app = await makeSocialConversationApp("user-4");
    mockTransaction();
    prismaMocks.socialConversationFindUnique
      .mockResolvedValueOnce(
        makeConversation({
          id: "group-1",
          type: SocialConversationType.GROUP,
          title: "Manga Club",
          directKey: null,
          members: [makeMember({ id: "pending-member", userId: "user-4", status: SocialMembershipStatus.PENDING_INVITE, displayName: "Kira" })],
          messages: []
        })
      )
      .mockResolvedValueOnce(
        makeConversation({
          id: "group-1",
          type: SocialConversationType.GROUP,
          title: "Manga Club",
          directKey: null,
          members: [makeMember({ id: "active-member", userId: "user-4", status: SocialMembershipStatus.ACTIVE, displayName: "Kira" })],
          messages: []
        })
      );
    prismaMocks.socialConversationMemberUpdate.mockResolvedValue({ id: "active-member" });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/social/conversations/group-1/invites/user-4",
      payload: { action: "accept" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ conversation: { currentMember: { status: "ACTIVE" } } });
    expect(prismaMocks.socialConversationMemberUpdate).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId: "group-1", userId: "user-4" } },
      data: { status: SocialMembershipStatus.ACTIVE, joinedAt: expect.any(Date) }
    });
    expect(socketMocks.emitMemberAdded).toHaveBeenCalledWith(
      "group-1",
      "user-4",
      expect.objectContaining({ userId: "user-4", status: SocialMembershipStatus.ACTIVE })
    );
    await app.close();
  });

  it("lets an invitee decline their pending group invite", async () => {
    const app = await makeSocialConversationApp("user-4");
    mockTransaction();
    prismaMocks.socialConversationFindUnique
      .mockResolvedValueOnce(
        makeConversation({
          id: "group-1",
          type: SocialConversationType.GROUP,
          title: "Manga Club",
          directKey: null,
          members: [makeMember({ id: "pending-member", userId: "user-4", status: SocialMembershipStatus.PENDING_INVITE, displayName: "Kira" })],
          messages: []
        })
      )
      .mockResolvedValueOnce(
        makeConversation({
          id: "group-1",
          type: SocialConversationType.GROUP,
          title: "Manga Club",
          directKey: null,
          members: [makeMember({ id: "left-member", userId: "user-4", status: SocialMembershipStatus.LEFT, displayName: "Kira" })],
          messages: []
        })
      );
    prismaMocks.socialConversationMemberUpdate.mockResolvedValue({ id: "left-member" });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/social/conversations/group-1/invites/user-4",
      payload: { action: "decline" }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMocks.socialConversationMemberUpdate).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId: "group-1", userId: "user-4" } },
      data: { status: SocialMembershipStatus.LEFT }
    });
    expect(socketMocks.emitMemberRemoved).toHaveBeenCalledWith("group-1", "user-4");
    await app.close();
  });

  it("lets a group owner cancel a pending invite", async () => {
    const app = await makeSocialConversationApp();
    mockTransaction();
    prismaMocks.socialConversationFindUnique
      .mockResolvedValueOnce(
        makeConversation({
          id: "group-1",
          type: SocialConversationType.GROUP,
          title: "Manga Club",
          directKey: null,
          members: [
            makeMember({ id: "owner-member", userId: "user-1", role: SocialMemberRole.OWNER, displayName: "Reader" }),
            makeMember({ id: "pending-member", userId: "user-4", status: SocialMembershipStatus.PENDING_INVITE, displayName: "Kira" })
          ],
          messages: []
        })
      )
      .mockResolvedValueOnce(
        makeConversation({
          id: "group-1",
          type: SocialConversationType.GROUP,
          title: "Manga Club",
          directKey: null,
          members: [
            makeMember({ id: "owner-member", userId: "user-1", role: SocialMemberRole.OWNER, displayName: "Reader" }),
            makeMember({ id: "left-member", userId: "user-4", status: SocialMembershipStatus.LEFT, displayName: "Kira" })
          ],
          messages: []
        })
      );
    prismaMocks.socialConversationMemberUpdate.mockResolvedValue({ id: "left-member" });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/social/conversations/group-1/invites/user-4",
      payload: { action: "cancel" }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMocks.socialConversationMemberUpdate).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId: "group-1", userId: "user-4" } },
      data: { status: SocialMembershipStatus.LEFT }
    });
    expect(socketMocks.emitMemberRemoved).toHaveBeenCalledWith("group-1", "user-4");
    await app.close();
  });

  it("rejects accepting another user's pending invite", async () => {
    const app = await makeSocialConversationApp("user-2");
    mockTransaction();
    prismaMocks.socialConversationFindUnique.mockResolvedValue(
      makeConversation({
        id: "group-1",
        type: SocialConversationType.GROUP,
        title: "Manga Club",
        directKey: null,
        members: [makeMember({ id: "pending-member", userId: "user-4", status: SocialMembershipStatus.PENDING_INVITE, displayName: "Kira" })],
        messages: []
      })
    );

    const response = await app.inject({
      method: "PATCH",
      url: "/api/social/conversations/group-1/invites/user-4",
      payload: { action: "accept" }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "SOCIAL_GROUP_INVITE_FORBIDDEN" });
    expect(prismaMocks.socialConversationMemberUpdate).not.toHaveBeenCalled();
    await app.close();
  });
});

function mockTransaction() {
  prismaMocks.transaction.mockImplementation((callback) =>
    callback({
      socialConversation: {
        create: prismaMocks.socialConversationCreate,
        findUnique: prismaMocks.socialConversationFindUnique
      },
      socialConversationMember: {
        create: prismaMocks.socialConversationMemberCreate,
        update: prismaMocks.socialConversationMemberUpdate
      },
      friendship: {
        findMany: prismaMocks.friendshipFindMany,
        findUnique: prismaMocks.friendshipFindUnique
      },
      notification: { create: prismaMocks.notificationCreate }
    })
  );
}

async function makeSocialConversationApp(userId = "user-1") {
  const { socialConversationRoutes } = await import("../../../app/routes/v1/social-conversation.routes.js");
  const app = Fastify();
  app.decorate("authenticate", async (request) => {
    request.user = { sub: userId, email: "reader@example.com", role: "USER" };
  });
  await app.register(socialConversationRoutes, { prefix: "/api" });
  return app;
}

type ConversationFixture = Omit<ReturnType<typeof makeConversationBase>, "type" | "title" | "directKey"> & {
  type: SocialConversationType;
  title: string | null;
  directKey: string | null;
};

function makeConversation(input: Partial<ConversationFixture> = {}): ConversationFixture {
  return { ...makeConversationBase(), ...input };
}

function makeConversationBase() {
  return {
    id: "conv-1",
    type: SocialConversationType.DM,
    title: null,
    avatarUrl: null,
    directKey: "user-1:user-2",
    lastMessageAt: new Date("2024-01-04T00:00:00.000Z"),
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-04T00:00:00.000Z"),
    members: [makeMember({ id: "member-1", userId: "user-1", displayName: "Reader" }), makeMember({ id: "member-2", userId: "user-2", displayName: "Friend" })],
    messages: [
      {
        id: "msg-1",
        conversationId: "conv-1",
        senderId: "user-2",
        clientMessageId: "client-msg-1",
        type: "TEXT",
        content: "hello",
        attachments: null,
        replyToId: null,
        deletedAt: null,
        createdAt: new Date("2024-01-04T00:00:00.000Z"),
        updatedAt: new Date("2024-01-04T00:00:00.000Z"),
        sender: { id: "user-2", displayName: "Friend", avatarUrl: null }
      }
    ]
  };
}

function makeMember(input: { id: string; userId: string; displayName: string; role?: SocialMemberRole; status?: SocialMembershipStatus }) {
  return {
    id: input.id,
    conversationId: "conv-1",
    userId: input.userId,
    role: input.role ?? SocialMemberRole.MEMBER,
    status: input.status ?? SocialMembershipStatus.ACTIVE,
    lastReadMessageId: null,
    lastReadAt: null,
    mutedUntil: null,
    joinedAt: new Date("2024-01-01T00:00:00.000Z"),
    user: { id: input.userId, displayName: input.displayName, avatarUrl: null }
  };
}

function makeNotification() {
  return {
    id: "notification-1",
    userId: "user-4",
    actorId: "user-1",
    type: NotificationType.GROUP_INVITE,
    subjectType: NotificationSubjectType.CONVERSATION,
    subjectId: "group-1",
    payload: { conversationId: "group-1" },
    readAt: null,
    createdAt: new Date("2024-01-04T00:00:00.000Z")
  };
}
