import { prisma } from "../../infrastructure/database/client.js";

type RegisterPushTokenInput = {
  token: string;
  platform: string;
  deviceId?: string;
  appVersion?: string;
};

export async function registerPushToken(userId: string, input: RegisterPushTokenInput) {
  const now = new Date();
  const token = await prisma.pushDeviceToken.upsert({
    where: { token: input.token },
    update: {
      userId,
      platform: input.platform,
      deviceId: input.deviceId,
      appVersion: input.appVersion,
      lastSeenAt: now,
      revokedAt: null
    },
    create: {
      userId,
      token: input.token,
      platform: input.platform,
      deviceId: input.deviceId,
      appVersion: input.appVersion,
      lastSeenAt: now
    }
  });

  return { token: serializePushToken(token) };
}

export async function unregisterPushToken(userId: string, token: string) {
  await prisma.pushDeviceToken.updateMany({
    where: { userId, token, revokedAt: null },
    data: { revokedAt: new Date() }
  });

  return { ok: true };
}

function serializePushToken(token: {
  id: string;
  platform: string;
  deviceId: string | null;
  appVersion: string | null;
  lastSeenAt: Date;
  revokedAt: Date | null;
}) {
  return {
    id: token.id,
    platform: token.platform,
    deviceId: token.deviceId,
    appVersion: token.appVersion,
    lastSeenAt: token.lastSeenAt,
    revokedAt: token.revokedAt
  };
}
