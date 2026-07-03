import { io, type Socket } from 'socket.io-client';
import { API_ORIGIN, getAccessToken } from '@/api';
import type { SocialCall, SocialMember, SocialMessage, User } from '@/types';

export type CallSignalPayload = {
  callId: string;
  toUserId: string;
  fromUserId?: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  mediaState?: {
    audioEnabled?: boolean;
    videoEnabled?: boolean;
  };
};

type SocketAck<TData = unknown> =
  | { ok: true; data: TData }
  | { ok: false; error: { code: string; message: string } };

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
  'call:incoming': (payload: SocialCall) => void;
  'call:participant-joined': (payload: {
    callId: string;
    userId: string;
    call: SocialCall;
  }) => void;
  'call:participant-left': (payload: {
    callId: string;
    userId: string;
    status: string;
    call: SocialCall;
  }) => void;
  'call:ended': (payload: {
    callId: string;
    reason: string;
    call: SocialCall;
  }) => void;
  'call:offer': (payload: CallSignalPayload) => void;
  'call:answer': (payload: CallSignalPayload) => void;
  'call:ice-candidate': (payload: CallSignalPayload) => void;
  'call:media-state': (payload: CallSignalPayload) => void;
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
  'call:offer': (
    payload: CallSignalPayload,
    ack?: (result: SocketAck<{ relayed: true }>) => void,
  ) => void;
  'call:answer': (
    payload: CallSignalPayload,
    ack?: (result: SocketAck<{ relayed: true }>) => void,
  ) => void;
  'call:ice-candidate': (
    payload: CallSignalPayload,
    ack?: (result: SocketAck<{ relayed: true }>) => void,
  ) => void;
  'call:media-state': (
    payload: CallSignalPayload,
    ack?: (result: SocketAck<{ relayed: true }>) => void,
  ) => void;
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
