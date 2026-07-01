import { io, type Socket } from 'socket.io-client';
import { API_ORIGIN, getAccessToken } from '@/api';
import type { SocialMember, SocialMessage, User } from '@/types';

export type SocialServerEvents = {
  'message:new': (payload: {
    conversationId: string;
    message: SocialMessage;
  }) => void;
  'message:deleted': (payload: {
    conversationId: string;
    messageId: string;
  }) => void;
  'typing:indicator': (payload: {
    conversationId: string;
    user: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
    typing: boolean;
  }) => void;
  'read:updated': (payload: {
    conversationId: string;
    userId: string;
    lastReadMessageId: string;
    lastReadAt: string;
  }) => void;
  'member:invited': (payload: {
    conversationId: string;
    member: SocialMember;
  }) => void;
  'member:added': (payload: {
    conversationId: string;
    member: SocialMember;
  }) => void;
  'member:removed': (payload: {
    conversationId: string;
    userId: string;
  }) => void;
  'reaction:updated': (payload: {
    conversationId: string;
    messageId: string;
    reactionCounts: Record<string, number>;
  }) => void;
  'presence:update': (payload: {
    userId: string;
    online: boolean;
    lastSeenAt: string;
  }) => void;
};

export type SocialClientEvents = {
  'typing:start': (payload: { conversationId: string }) => void;
  'typing:stop': (payload: { conversationId: string }) => void;
  'message:read': (
    payload: { conversationId: string; lastMessageId: string },
    ack?: (
      result:
        | { ok: true; data: unknown }
        | { ok: false; error: { code: string; message: string } },
    ) => void,
  ) => void;
  'presence:ping': () => void;
};

export type SocialSocket = Socket<SocialServerEvents, SocialClientEvents>;

export function createSocialSocket(): SocialSocket {
  return io(API_ORIGIN, {
    // FIX: dùng auth callback thay vì plain object
    // để mỗi lần reconnect luôn lấy token mới nhất
    auth: (cb) => cb({ token: getAccessToken() }),
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 6,
    reconnectionDelay: 700,
  }) as SocialSocket;
}
