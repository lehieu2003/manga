import { FriendshipStatus, NotificationSubjectType, NotificationType } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  friendshipFindUnique: vi.fn(),
  friendshipCreate: vi.fn(),
  notificationCreate: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("../../infrastructure/database/client.js", () => ({
  prisma: {
    user: { findUnique: prismaMocks.userFindUnique },
    friendship: { findUnique: prismaMocks.friendshipFindUnique, create: prismaMocks.friendshipCreate },
    notification: { create: prismaMocks.notificationCreate },
    $transaction: prismaMocks.transaction
  }
}));

describe("friendship service", () => {
  afterEach(() => vi.clearAllMocks());

  it("creates one canonical pending friendship and notifies the addressee", async () => {
    const { sendFriendRequest } = await import("../../domain/services/friendship.service.js");
    const tx = {
      friendship: { findUnique: prismaMocks.friendshipFindUnique, create: prismaMocks.friendshipCreate },
      notification: { create: prismaMocks.notificationCreate }
    };
    prismaMocks.userFindUnique.mockResolvedValue({ id: "user-b" });
    prismaMocks.friendshipFindUnique.mockResolvedValue(null);
    prismaMocks.friendshipCreate.mockResolvedValue({ id: "friendship-1", userAId: "user-a", userBId: "user-b", requestedById: "user-b", status: FriendshipStatus.PENDING });
    prismaMocks.notificationCreate.mockResolvedValue({ id: "notification-1" });
    prismaMocks.transaction.mockImplementation((callback) => callback(tx));

    const result = await sendFriendRequest("user-b", "user-a");

    expect(result.friendship).toMatchObject({ id: "friendship-1", status: FriendshipStatus.PENDING });
    expect(prismaMocks.friendshipCreate).toHaveBeenCalledWith({
      data: { userAId: "user-a", userBId: "user-b", requestedById: "user-b", status: FriendshipStatus.PENDING }
    });
    expect(prismaMocks.notificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-a",
        actorId: "user-b",
        type: NotificationType.FRIEND_REQUEST,
        subjectType: NotificationSubjectType.FRIENDSHIP,
        subjectId: "friendship-1",
        payload: { friendshipId: "friendship-1" }
      }
    });
  });

  it("accepts an incoming request and creates the two-member DM", async () => {
    const { acceptFriendRequest } = await import("../../domain/services/friendship.service.js");
    const tx = {
      friendship: { findUnique: prismaMocks.friendshipFindUnique, create: prismaMocks.friendshipCreate, update: vi.fn() },
      socialConversation: { findFirst: vi.fn(), create: vi.fn() },
      notification: { create: prismaMocks.notificationCreate }
    };
    prismaMocks.friendshipFindUnique.mockResolvedValue({ id: "friendship-1", userAId: "user-a", userBId: "user-b", requestedById: "user-a", status: FriendshipStatus.PENDING });
    tx.friendship.update.mockResolvedValue({ id: "friendship-1", userAId: "user-a", userBId: "user-b", requestedById: "user-a", status: FriendshipStatus.ACCEPTED });
    tx.socialConversation.findFirst.mockResolvedValue(null);
    tx.socialConversation.create.mockResolvedValue({ id: "dm-1", type: "DM", directKey: "user-a:user-b" });
    prismaMocks.notificationCreate.mockResolvedValue({ id: "notification-1" });
    prismaMocks.transaction.mockImplementation((callback) => callback(tx));

    const result = await acceptFriendRequest("user-b", "friendship-1");

    expect(result).toMatchObject({ friendship: { status: FriendshipStatus.ACCEPTED }, conversation: { id: "dm-1" } });
    expect(tx.socialConversation.create).toHaveBeenCalledWith({
      data: {
        type: "DM",
        directKey: "user-a:user-b",
        members: { create: [{ userId: "user-a" }, { userId: "user-b" }] }
      }
    });
  });

  it("blocks the other participant from an existing relationship", async () => {
    const { blockFriendship } = await import("../../domain/services/friendship.service.js");
    const tx = { friendship: { findUnique: prismaMocks.friendshipFindUnique, update: vi.fn() } };
    prismaMocks.friendshipFindUnique.mockResolvedValue({ id: "friendship-1", userAId: "user-a", userBId: "user-b", requestedById: "user-a", status: FriendshipStatus.ACCEPTED });
    tx.friendship.update.mockResolvedValue({ id: "friendship-1", status: FriendshipStatus.BLOCKED, blockedById: "user-b" });
    prismaMocks.transaction.mockImplementation((callback) => callback(tx));

    const result = await blockFriendship("user-b", "friendship-1");

    expect(result.friendship).toMatchObject({ status: FriendshipStatus.BLOCKED, blockedById: "user-b" });
  });
});
