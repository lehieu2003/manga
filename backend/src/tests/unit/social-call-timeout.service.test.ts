import { CallMediaType, CallParticipantStatus, CallStatus, NotificationSubjectType, NotificationType } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  callSessionFindMany: vi.fn(),
  callSessionUpdateMany: vi.fn(),
  callSessionFindUnique: vi.fn(),
  callParticipantUpdateMany: vi.fn(),
  notificationCreate: vi.fn()
}));

const socketMocks = vi.hoisted(() => ({
  emitCallEnded: vi.fn(),
  emitCallIncoming: vi.fn(),
  emitCallParticipantJoined: vi.fn(),
  emitCallParticipantLeft: vi.fn(),
  emitNotification: vi.fn()
}));

const notificationMocks = vi.hoisted(() => ({
  publishNotification: vi.fn()
}));

vi.mock("../../infrastructure/database/client.js", () => ({
  prisma: {
    $transaction: prismaMocks.transaction,
    callSession: {
      findMany: prismaMocks.callSessionFindMany,
      updateMany: prismaMocks.callSessionUpdateMany,
      findUnique: prismaMocks.callSessionFindUnique
    },
    callParticipant: {
      updateMany: prismaMocks.callParticipantUpdateMany
    },
    notification: {
      create: prismaMocks.notificationCreate
    }
  }
}));

vi.mock("../../infrastructure/realtime/socket-server.js", () => socketMocks);
vi.mock("../../domain/services/notification-stream.service.js", () => notificationMocks);

describe("social call timeout sweep", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("marks old ringing calls missed, notifies invitees, and emits call ended", async () => {
    const { sweepMissedSocialCalls } = await import("../../domain/services/social-call.service.js");
    const now = new Date("2026-07-01T12:00:00.000Z");
    const timedOutCall = makeCall({ startedAt: new Date("2026-07-01T11:58:00.000Z") });
    const missedCall = makeCall({
      status: CallStatus.MISSED,
      endedAt: now,
      participants: [
        makeParticipant({ id: "participant-1", userId: "user-1", status: CallParticipantStatus.JOINED, displayName: "Reader" }),
        makeParticipant({ id: "participant-2", userId: "user-2", status: CallParticipantStatus.MISSED, displayName: "Friend", leftAt: now })
      ]
    });
    const notification = makeNotification();

    prismaMocks.callSessionFindMany.mockResolvedValueOnce([timedOutCall]).mockResolvedValueOnce([]);
    prismaMocks.transaction.mockImplementation((callback) =>
      callback({
        callSession: {
          updateMany: prismaMocks.callSessionUpdateMany,
          findUnique: prismaMocks.callSessionFindUnique
        },
        callParticipant: {
          updateMany: prismaMocks.callParticipantUpdateMany
        },
        notification: {
          create: prismaMocks.notificationCreate
        }
      })
    );
    prismaMocks.callSessionUpdateMany.mockResolvedValue({ count: 1 });
    prismaMocks.callParticipantUpdateMany.mockResolvedValue({ count: 1 });
    prismaMocks.notificationCreate.mockResolvedValue(notification);
    prismaMocks.callSessionFindUnique.mockResolvedValue(missedCall);

    const result = await sweepMissedSocialCalls(now);

    expect(result).toMatchObject({ timedOut: 1, calls: [{ id: "call-1", status: "MISSED" }] });
    expect(prismaMocks.callSessionFindMany).toHaveBeenCalledWith({
      where: {
        status: CallStatus.RINGING,
        startedAt: { lt: new Date("2026-07-01T11:59:15.000Z") }
      },
      include: expect.any(Object)
    });
    expect(prismaMocks.callSessionUpdateMany).toHaveBeenCalledWith({
      where: { id: "call-1", status: CallStatus.RINGING },
      data: { status: CallStatus.MISSED, endedAt: now }
    });
    expect(prismaMocks.callParticipantUpdateMany).toHaveBeenCalledWith({
      where: { callId: "call-1", status: CallParticipantStatus.INVITED },
      data: { status: CallParticipantStatus.MISSED, leftAt: now }
    });
    expect(prismaMocks.notificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-2",
        actorId: "user-1",
        type: NotificationType.MISSED_CALL,
        subjectType: NotificationSubjectType.CALL,
        subjectId: "call-1",
        payload: {
          callId: "call-1",
          conversationId: "conv-1",
          initiatorId: "user-1",
          mediaType: CallMediaType.VIDEO,
          reason: "no-answer"
        }
      }
    });
    expect(notificationMocks.publishNotification).toHaveBeenCalledWith(notification);
    expect(socketMocks.emitCallEnded).toHaveBeenCalledWith("conv-1", expect.objectContaining({ callId: "call-1", reason: "no-answer" }));
  });

  it("ends abandoned active calls so they do not block future calls", async () => {
    const { sweepMissedSocialCalls } = await import("../../domain/services/social-call.service.js");
    const now = new Date("2026-07-01T12:00:00.000Z");
    const activeCall = makeCall({
      status: CallStatus.ACTIVE,
      answeredAt: new Date("2026-07-01T06:00:00.000Z"),
      updatedAt: new Date("2026-07-01T07:00:00.000Z"),
      participants: [
        makeParticipant({ id: "participant-1", userId: "user-1", status: CallParticipantStatus.JOINED, displayName: "Reader" }),
        makeParticipant({ id: "participant-2", userId: "user-2", status: CallParticipantStatus.JOINED, displayName: "Friend" })
      ]
    });
    const endedCall = makeCall({
      status: CallStatus.ENDED,
      answeredAt: new Date("2026-07-01T06:00:00.000Z"),
      endedAt: now,
      participants: [
        makeParticipant({ id: "participant-1", userId: "user-1", status: CallParticipantStatus.LEFT, displayName: "Reader", leftAt: now }),
        makeParticipant({ id: "participant-2", userId: "user-2", status: CallParticipantStatus.LEFT, displayName: "Friend", leftAt: now })
      ]
    });

    prismaMocks.callSessionFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([activeCall]);
    prismaMocks.transaction.mockImplementation((callback) =>
      callback({
        callSession: {
          updateMany: prismaMocks.callSessionUpdateMany,
          findUnique: prismaMocks.callSessionFindUnique
        },
        callParticipant: {
          updateMany: prismaMocks.callParticipantUpdateMany
        },
        notification: {
          create: prismaMocks.notificationCreate
        }
      })
    );
    prismaMocks.callSessionUpdateMany.mockResolvedValue({ count: 1 });
    prismaMocks.callParticipantUpdateMany.mockResolvedValue({ count: 2 });
    prismaMocks.callSessionFindUnique.mockResolvedValue(endedCall);

    const result = await sweepMissedSocialCalls(now);

    expect(result).toMatchObject({ timedOut: 1, calls: [{ id: "call-1", status: "ENDED" }] });
    expect(prismaMocks.callSessionFindMany).toHaveBeenNthCalledWith(2, {
      where: {
        status: CallStatus.ACTIVE,
        updatedAt: { lt: new Date("2026-07-01T08:00:00.000Z") }
      },
      include: expect.any(Object)
    });
    expect(prismaMocks.callSessionUpdateMany).toHaveBeenCalledWith({
      where: { id: "call-1", status: CallStatus.ACTIVE },
      data: { status: CallStatus.ENDED, endedAt: now }
    });
    expect(prismaMocks.callParticipantUpdateMany).toHaveBeenCalledWith({
      where: {
        callId: "call-1",
        status: { in: [CallParticipantStatus.INVITED, CallParticipantStatus.JOINED] }
      },
      data: { status: CallParticipantStatus.LEFT, leftAt: now }
    });
    expect(notificationMocks.publishNotification).not.toHaveBeenCalled();
    expect(socketMocks.emitCallEnded).toHaveBeenCalledWith("conv-1", expect.objectContaining({ callId: "call-1", reason: "timeout" }));
  });
});

function makeCall(input: Record<string, unknown> = {}) {
  return {
    id: "call-1",
    conversationId: "conv-1",
    initiatorId: "user-1",
    status: CallStatus.RINGING,
    mediaType: CallMediaType.VIDEO,
    startedAt: new Date("2026-07-01T11:58:00.000Z"),
    answeredAt: null,
    endedAt: null,
    createdAt: new Date("2026-07-01T11:58:00.000Z"),
    updatedAt: new Date("2026-07-01T11:58:00.000Z"),
    initiator: { id: "user-1", displayName: "Reader", avatarUrl: null },
    participants: [
      makeParticipant({ id: "participant-1", userId: "user-1", status: CallParticipantStatus.JOINED, displayName: "Reader" }),
      makeParticipant({ id: "participant-2", userId: "user-2", status: CallParticipantStatus.INVITED, displayName: "Friend" })
    ],
    ...input
  };
}

function makeParticipant(input: { id: string; userId: string; status: CallParticipantStatus; displayName: string; leftAt?: Date | null }) {
  return {
    id: input.id,
    callId: "call-1",
    userId: input.userId,
    status: input.status,
    joinedAt: input.status === CallParticipantStatus.JOINED ? new Date("2026-07-01T11:58:00.000Z") : null,
    leftAt: input.leftAt ?? null,
    createdAt: new Date("2026-07-01T11:58:00.000Z"),
    updatedAt: new Date("2026-07-01T11:58:00.000Z"),
    user: { id: input.userId, displayName: input.displayName, avatarUrl: null }
  };
}

function makeNotification() {
  return {
    id: "notification-1",
    userId: "user-2",
    actorId: "user-1",
    type: NotificationType.MISSED_CALL,
    subjectType: NotificationSubjectType.CALL,
    subjectId: "call-1",
    payload: { callId: "call-1" },
    readAt: null,
    createdAt: new Date("2026-07-01T12:00:00.000Z")
  };
}
