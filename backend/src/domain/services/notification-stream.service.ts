import { emitNotification } from "../../infrastructure/realtime/socket-server.js";
import { deliverPushNotification } from "./push-notification.service.js";

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

type Listener = (payload: NotificationPayload) => void;

const listenersByUser = new Map<string, Set<Listener>>();

export function subscribeToNotifications(userId: string, listener: Listener) {
  const listeners = listenersByUser.get(userId) ?? new Set<Listener>();
  listeners.add(listener);
  listenersByUser.set(userId, listeners);

  return () => {
    listeners.delete(listener);
    if (!listeners.size) listenersByUser.delete(userId);
  };
}

export function publishNotification(payload: NotificationPayload) {
  emitNotification(payload);
  void deliverPushNotification(payload);
  const listeners = listenersByUser.get(payload.userId);
  if (!listeners) return;
  for (const listener of listeners) listener(payload);
}
