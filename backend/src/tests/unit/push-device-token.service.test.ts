import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  pushDeviceTokenUpsert: vi.fn(),
  pushDeviceTokenUpdateMany: vi.fn()
}));

vi.mock("../../infrastructure/database/client.js", () => ({
  prisma: {
    pushDeviceToken: {
      upsert: prismaMocks.pushDeviceTokenUpsert,
      updateMany: prismaMocks.pushDeviceTokenUpdateMany
    }
  }
}));

describe("push device token service", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("upserts the current user's active device token", async () => {
    const { registerPushToken } = await import("../../domain/services/push-device-token.service.js");
    prismaMocks.pushDeviceTokenUpsert.mockResolvedValue({
      id: "token-row-1",
      platform: "android",
      deviceId: "device-1",
      appVersion: "1.0.0+1",
      lastSeenAt: new Date("2026-07-04T00:00:00.000Z"),
      revokedAt: null
    });

    const response = await registerPushToken("user-1", {
      token: "fcm-token",
      platform: "android",
      deviceId: "device-1",
      appVersion: "1.0.0+1"
    });

    expect(prismaMocks.pushDeviceTokenUpsert).toHaveBeenCalledWith({
      where: { token: "fcm-token" },
      update: expect.objectContaining({
        userId: "user-1",
        platform: "android",
        revokedAt: null
      }),
      create: expect.objectContaining({
        userId: "user-1",
        token: "fcm-token",
        platform: "android"
      })
    });
    expect(response.token).toMatchObject({ id: "token-row-1", platform: "android", revokedAt: null });
  });

  it("revokes only the current user's matching token", async () => {
    const { unregisterPushToken } = await import("../../domain/services/push-device-token.service.js");
    prismaMocks.pushDeviceTokenUpdateMany.mockResolvedValue({ count: 1 });

    await expect(unregisterPushToken("user-1", "fcm-token")).resolves.toEqual({ ok: true });
    expect(prismaMocks.pushDeviceTokenUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", token: "fcm-token", revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
  });
});
