import { CallMediaType, CallParticipantStatus, CallStatus, FriendshipStatus, NotificationSubjectType, NotificationType, SocialConversationType, SocialMembershipStatus } from "@prisma/client";
import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  socialConversationFindFirst: vi.fn(),
  socialConversationMemberFindUnique: vi.fn(),
  friendshipFindUnique: vi.fn(),
  callSessionFindFirst: vi.fn(),
  callSessionFindUnique: vi.fn(),
  callSessionFindMany: vi.fn(),
  callSessionCreate: vi.fn(),
  callSessionUpdate: vi.fn(),
  notificationCreate: vi.fn(),
  callParticipantUpdate: vi.fn(),
  callParticipantCount: vi.fn(),
  publishNotification: vi.fn()
}));

const socketMocks = vi.hoisted(() => ({
  emitCallEnded: vi.fn(),
  emitCallIncoming: vi.fn(),
  emitCallParticipantJoined: vi.fn(),
  emitCallParticipantLeft: vi.fn(),
  emitFriendAccepted: vi.fn(),
  emitFriendIncoming: vi.fn(),
  emitMemberAdded: vi.fn(),
  emitMemberInvited: vi.fn(),
  emitMemberRemoved: vi.fn(),
  emitMessageDeleted: vi.fn(),
  emitMessageNew: vi.fn(),
  emitNotification: vi.fn(),
  emitReadUpdated: vi.fn(),
  emitReactionUpdated: vi.fn()
}));

vi.mock("../../../infrastructure/database/client.js", () => ({
  prisma: {
    $transaction: prismaMocks.transaction,
    socialConversation: { findFirst: prismaMocks.socialConversationFindFirst },
    socialConversationMember: { findUnique: prismaMocks.socialConversationMemberFindUnique },
    friendship: { findUnique: prismaMocks.friendshipFindUnique },
    callSession: {
      findFirst: prismaMocks.callSessionFindFirst,
      findUnique: prismaMocks.callSessionFindUnique,
      findMany: prismaMocks.callSessionFindMany,
      create: prismaMocks.callSessionCreate,
      update: prismaMocks.callSessionUpdate
    },
    notification: {
      create: prismaMocks.notificationCreate
    },
    callParticipant: {
      update: prismaMocks.callParticipantUpdate,
      count: prismaMocks.callParticipantCount
    }
  }
}));

vi.mock("../../../infrastructure/realtime/socket-server.js", () => socketMocks);
vi.mock("../../../domain/services/notification-stream.service.js", () => ({
  publishNotification: prismaMocks.publishNotification
}));

describe("social call routes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts a video call and notifies invited participants", async () => {
    const app = await makeSocialCallApp();
    mockTransaction();
    prismaMocks.socialConversationFindFirst.mockResolvedValue(makeConversation());
    prismaMocks.friendshipFindUnique.mockResolvedValue({ status: FriendshipStatus.ACCEPTED });
    prismaMocks.callSessionFindFirst.mockResolvedValue(null);
    prismaMocks.callSessionCreate.mockResolvedValue(makeCall());
    prismaMocks.notificationCreate.mockImplementation(async ({ data }) => ({ id: "notification-1", ...data, readAt: null, createdAt: new Date("2024-01-04T00:00:01.000Z") }));

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations/conv-1/calls",
      payload: { mediaType: "VIDEO" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      call: {
        id: "call-1",
        conversationId: "conv-1",
        status: "RINGING",
        mediaType: "VIDEO",
        participants: [
          { userId: "user-1", status: "JOINED" },
          { userId: "user-2", status: "INVITED" }
        ]
      },
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
    });
    expect(prismaMocks.callSessionCreate).toHaveBeenCalledWith({
      data: {
        conversationId: "conv-1",
        initiatorId: "user-1",
        mediaType: CallMediaType.VIDEO,
        status: CallStatus.RINGING,
        participants: {
          create: [
            { userId: "user-1", status: CallParticipantStatus.JOINED, joinedAt: expect.any(Date) },
            { userId: "user-2", status: CallParticipantStatus.INVITED, joinedAt: null }
          ]
        }
      },
      include: expect.any(Object)
    });
    expect(prismaMocks.notificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-2",
        actorId: "user-1",
        type: NotificationType.INCOMING_CALL,
        subjectType: NotificationSubjectType.CALL,
        subjectId: "call-1",
        payload: {
          callId: "call-1",
          conversationId: "conv-1",
          initiatorId: "user-1",
          mediaType: CallMediaType.VIDEO
        }
      }
    });
    expect(prismaMocks.publishNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "notification-1",
        userId: "user-2",
        type: NotificationType.INCOMING_CALL,
        subjectId: "call-1"
      })
    );
    expect(socketMocks.emitCallIncoming).toHaveBeenCalledWith("user-2", expect.objectContaining({ id: "call-1" }));
    await app.close();
  }, 10_000);

  it("rejects starting a call for a non-member", async () => {
    const app = await makeSocialCallApp();
    mockTransaction();
    prismaMocks.socialConversationFindFirst.mockResolvedValue(null);

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations/private-conv/calls",
      payload: { mediaType: "AUDIO" }
    });

    expect(response.statusCode).toBe(404);
    expect(prismaMocks.callSessionCreate).not.toHaveBeenCalled();
    await app.close();
  });

  it("rejects a second live call in the same conversation", async () => {
    const app = await makeSocialCallApp();
    mockTransaction();
    prismaMocks.socialConversationFindFirst.mockResolvedValue(makeConversation());
    prismaMocks.friendshipFindUnique.mockResolvedValue({ status: FriendshipStatus.ACCEPTED });
    prismaMocks.callSessionFindFirst.mockResolvedValue({ id: "call-existing" });

    const response = await app.inject({
      method: "POST",
      url: "/api/social/conversations/conv-1/calls",
      payload: { mediaType: "VIDEO" }
    });

    expect(response.statusCode).toBe(409);
    expect(prismaMocks.callSessionCreate).not.toHaveBeenCalled();
    await app.close();
  });

  it("joins a ringing call and marks the session active", async () => {
    const app = await makeSocialCallApp("user-2");
    mockTransaction();
    prismaMocks.callSessionFindFirst.mockResolvedValue(makeCall({ status: CallStatus.RINGING }));
    prismaMocks.callParticipantUpdate.mockResolvedValue({ id: "participant-2" });
    prismaMocks.callSessionUpdate.mockResolvedValue({ id: "call-1" });
    prismaMocks.callSessionFindUnique.mockResolvedValue(makeCall({ status: CallStatus.ACTIVE, answeredAt: new Date("2024-01-04T00:02:00.000Z") }));

    const response = await app.inject({ method: "PATCH", url: "/api/social/calls/call-1/join" });

    expect(response.statusCode).toBe(200);
    expect(prismaMocks.callParticipantUpdate).toHaveBeenCalledWith({
      where: { callId_userId: { callId: "call-1", userId: "user-2" } },
      data: { status: CallParticipantStatus.JOINED, joinedAt: expect.any(Date), leftAt: null }
    });
    expect(prismaMocks.callSessionUpdate).toHaveBeenCalledWith({
      where: { id: "call-1" },
      data: { status: CallStatus.ACTIVE, answeredAt: expect.any(Date) }
    });
    expect(socketMocks.emitCallParticipantJoined).toHaveBeenCalledWith("conv-1", expect.objectContaining({ callId: "call-1", userId: "user-2" }));
    await app.close();
  });

  it("ends a call when the last joined participant leaves", async () => {
    const app = await makeSocialCallApp();
    mockTransaction();
    prismaMocks.callSessionFindFirst.mockResolvedValue(makeCall({ status: CallStatus.ACTIVE }));
    prismaMocks.callParticipantUpdate.mockResolvedValue({ id: "participant-1" });
    prismaMocks.callParticipantCount.mockResolvedValue(0);
    prismaMocks.callSessionUpdate.mockResolvedValue({ id: "call-1" });
    prismaMocks.callSessionFindUnique.mockResolvedValue(makeCall({ status: CallStatus.ENDED, endedAt: new Date("2024-01-04T00:03:00.000Z") }));

    const response = await app.inject({ method: "PATCH", url: "/api/social/calls/call-1/leave" });

    expect(response.statusCode).toBe(200);
    expect(prismaMocks.callSessionUpdate).toHaveBeenCalledWith({
      where: { id: "call-1" },
      data: { status: CallStatus.ENDED, endedAt: expect.any(Date) }
    });
    expect(socketMocks.emitCallEnded).toHaveBeenCalledWith("conv-1", expect.objectContaining({ callId: "call-1", reason: "left" }));
    await app.close();
  });

  it("lists call history with an opaque next cursor", async () => {
    const app = await makeSocialCallApp();
    prismaMocks.socialConversationMemberFindUnique.mockResolvedValue({ status: SocialMembershipStatus.ACTIVE });
    prismaMocks.callSessionFindMany.mockResolvedValue([makeCall({ id: "call-1" }), makeCall({ id: "call-2" })]);

    const response = await app.inject({ method: "GET", url: "/api/social/conversations/conv-1/calls?limit=1" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.nextCursor).toEqual(expect.any(String));
    expect(prismaMocks.callSessionFindMany).toHaveBeenCalledWith({
      where: { conversationId: "conv-1" },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      take: 2,
      include: expect.any(Object)
    });
    await app.close();
  });
});

function mockTransaction() {
  prismaMocks.transaction.mockImplementation((callback) =>
    callback({
      socialConversation: { findFirst: prismaMocks.socialConversationFindFirst },
      friendship: { findUnique: prismaMocks.friendshipFindUnique },
      callSession: {
        findFirst: prismaMocks.callSessionFindFirst,
        findUnique: prismaMocks.callSessionFindUnique,
        create: prismaMocks.callSessionCreate,
        update: prismaMocks.callSessionUpdate
      },
      notification: { create: prismaMocks.notificationCreate },
      callParticipant: {
        update: prismaMocks.callParticipantUpdate,
        count: prismaMocks.callParticipantCount
      }
    })
  );
}

async function makeSocialCallApp(userId = "user-1") {
  const { socialConversationRoutes } = await import("../../../app/routes/v1/social-conversation.routes.js");
  const app = Fastify();
  app.decorate("authenticate", async (request) => {
    request.user = { sub: userId, email: `${userId}@example.com`, role: "USER" };
  });
  await app.register(socialConversationRoutes, { prefix: "/api" });
  return app;
}

function makeConversation() {
  return {
    id: "conv-1",
    type: SocialConversationType.DM,
    members: [{ userId: "user-1" }, { userId: "user-2" }]
  };
}

function makeCall(input: Record<string, unknown> = {}) {
  return { ...makeCallBase(), ...input } as ReturnType<typeof makeCallBase>;
}

function makeCallBase() {
  return {
    id: "call-1",
    conversationId: "conv-1",
    initiatorId: "user-1",
    status: CallStatus.RINGING,
    mediaType: CallMediaType.VIDEO,
    startedAt: new Date("2024-01-04T00:00:00.000Z"),
    answeredAt: null,
    endedAt: null,
    createdAt: new Date("2024-01-04T00:00:00.000Z"),
    updatedAt: new Date("2024-01-04T00:00:00.000Z"),
    initiator: { id: "user-1", displayName: "Reader", avatarUrl: null },
    participants: [
      makeParticipant({ id: "participant-1", userId: "user-1", status: CallParticipantStatus.JOINED, displayName: "Reader" }),
      makeParticipant({ id: "participant-2", userId: "user-2", status: CallParticipantStatus.INVITED, displayName: "Friend" })
    ]
  };
}

function makeParticipant(input: { id: string; userId: string; status: CallParticipantStatus; displayName: string }) {
  return {
    id: input.id,
    callId: "call-1",
    userId: input.userId,
    status: input.status,
    joinedAt: input.status === CallParticipantStatus.JOINED ? new Date("2024-01-04T00:00:00.000Z") : null,
    leftAt: null,
    createdAt: new Date("2024-01-04T00:00:00.000Z"),
    updatedAt: new Date("2024-01-04T00:00:00.000Z"),
    user: { id: input.userId, displayName: input.displayName, avatarUrl: null }
  };
}
