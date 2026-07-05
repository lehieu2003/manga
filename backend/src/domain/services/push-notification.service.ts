import { getMessaging } from "firebase-admin/messaging";
import { NotificationSubjectType, NotificationType } from "@prisma/client";
import { prisma } from "../../infrastructure/database/client.js";
import { getFirebaseAdminApp } from "../../infrastructure/firebase/firebase-admin.js";

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

type PushCopy = {
  title: string;
  body: string;
};

export async function deliverPushNotification(notification: NotificationPayload) {
  const app = getFirebaseAdminApp();
  if (!app) return;
  if (await shouldSuppressPush(notification)) return;

  const pushDeviceTokenDelegate = (prisma as typeof prisma & {
    pushDeviceToken?: typeof prisma.pushDeviceToken;
  }).pushDeviceToken;
  if (!pushDeviceTokenDelegate) return;

  const tokens = await pushDeviceTokenDelegate.findMany({
    where: { userId: notification.userId, revokedAt: null },
    select: { id: true, token: true }
  });
  if (!tokens.length) return;

  const copy = pushCopy(notification.type);
  const data = buildPushData(notification);
  const messaging = getMessaging(app);

  await Promise.all(
    tokens.map(async (row) => {
      try {
        await messaging.send({
          token: row.token,
          notification: copy,
          data,
          android: {
            priority: "high",
            notification: {
              channelId: "manga_notifications",
              clickAction: "FLUTTER_NOTIFICATION_CLICK"
            }
          }
        });
      } catch (error) {
        if (isInvalidRegistrationToken(error)) {
          await pushDeviceTokenDelegate.updateMany({
            where: { id: row.id, revokedAt: null },
            data: { revokedAt: new Date() }
          });
          return;
        }

        console.warn({
          error,
          notificationId: notification.id,
          pushTokenId: row.id
        }, "Failed to send push notification");
      }
    })
  );
}

async function shouldSuppressPush(notification: NotificationPayload) {
  if (notification.type !== NotificationType.CHAT_MESSAGE) return false;
  const payload = notification.payload;
  const conversationId = readPayloadString(payload, "conversationId") ?? notification.subjectId;
  if (!conversationId) return false;

  const membership = await prisma.socialConversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: notification.userId
      }
    },
    select: { mutedUntil: true }
  });

  return Boolean(membership?.mutedUntil && membership.mutedUntil > new Date());
}

function pushCopy(type: string): PushCopy {
  switch (type) {
    case NotificationType.COMMENT_REPLY:
      return { title: "New reply", body: "Someone replied to your comment." };
    case NotificationType.COMMENT_REACTION:
      return { title: "New reaction", body: "Someone reacted to your comment." };
    case NotificationType.FRIEND_REQUEST:
      return { title: "New friend request", body: "Someone sent you a friend request." };
    case NotificationType.FRIEND_ACCEPTED:
      return { title: "Friend request accepted", body: "Your friend request was accepted." };
    case NotificationType.GROUP_INVITE:
      return { title: "Group invite", body: "You were invited to a group conversation." };
    case NotificationType.CHAT_MESSAGE:
      return { title: "New message", body: "You have a new chat message." };
    case NotificationType.INCOMING_CALL:
      return { title: "Incoming call", body: "Someone is calling you." };
    case NotificationType.MISSED_CALL:
      return { title: "Missed call", body: "You missed a call." };
    default:
      return { title: "Manga Cafe", body: "You have a new notification." };
  }
}

function buildPushData(notification: NotificationPayload) {
  const payload = notification.payload;
  const data: Record<string, string> = {
    notificationId: notification.id,
    type: notification.type,
    subjectType: notification.subjectType,
    subjectId: notification.subjectId,
    createdAt: notification.createdAt.toISOString()
  };

  for (const key of ["commentId", "targetType", "targetId", "conversationId", "messageId", "callId"]) {
    const value = readPayloadString(payload, key);
    if (value) data[key] = value;
  }

  if (notification.subjectType === NotificationSubjectType.CONVERSATION && !data.conversationId) {
    data.conversationId = notification.subjectId;
  }
  if (notification.subjectType === NotificationSubjectType.CALL && !data.callId) {
    data.callId = notification.subjectId;
  }

  return data;
}

function readPayloadString(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isInvalidRegistrationToken(error: unknown) {
  const code = typeof error === "object" && error !== null
    ? (error as { code?: string; errorInfo?: { code?: string } }).code ?? (error as { errorInfo?: { code?: string } }).errorInfo?.code
    : undefined;

  return code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token";
}
