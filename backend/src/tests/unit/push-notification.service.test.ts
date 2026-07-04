import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  pushDeviceTokenFindMany: vi.fn(),
  socialConversationMemberFindUnique: vi.fn()
}));

vi.mock("../../infrastructure/database/client.js", () => ({
  prisma: {
    pushDeviceToken: {
      findMany: prismaMocks.pushDeviceTokenFindMany
    },
    socialConversationMember: {
      findUnique: prismaMocks.socialConversationMemberFindUnique
    }
  }
}));

describe("push notification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is a no-op when the recipient has no registered push tokens", async () => {
    const { deliverPushNotification } = await import("../../domain/services/push-notification.service.js");
    prismaMocks.pushDeviceTokenFindMany.mockResolvedValue([]);

    await expect(
      deliverPushNotification({
        id: "notification-1",
        userId: "user-1",
        actorId: "actor-1",
        type: "COMMENT_REPLY",
        subjectType: "COMMENT",
        subjectId: "comment-1",
        payload: { commentId: "comment-1", targetType: "MANGA", targetId: "manga-1" },
        readAt: null,
        createdAt: new Date("2026-07-04T00:00:00.000Z")
      })
    ).resolves.toBeUndefined();
  });
});
