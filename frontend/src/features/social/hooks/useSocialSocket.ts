import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api } from '@/api';
import type {
  SocialConversation,
  SocialMessage,
  SocialMessageListResponse,
} from '@/types';
import { createSocialSocket, type SocialSocket } from '../social-socket';
import { addMessageToPage, replaceMessageInPage } from '../utils';
import { useTypingIndicator } from './useTypingIndicator';

interface UseSocialSocketOptions {
  currentUserId: string | undefined;
  selectedConversation: SocialConversation | null;
  latestMessage: SocialMessage | undefined;
  onPendingResolved: (clientMessageId: string) => void;
}

/**
 * Tạo và quản lý toàn bộ vòng đời socket:
 * - Connect / disconnect khi user thay đổi
 * - Bind tất cả server events
 * - Mark-as-read tự động khi conversation / message thay đổi
 */
export function useSocialSocket({
  currentUserId,
  selectedConversation,
  latestMessage,
  onPendingResolved,
}: UseSocialSocketOptions) {
  const queryClient = useQueryClient();
  const socketRef = useRef<SocialSocket | null>(null);

  const {
    typingUsers,
    handleTypingIndicator,
    emitTypingStart,
    emitTypingStop,
  } = useTypingIndicator(socketRef, currentUserId);

  // --- Socket lifecycle ---
  useEffect(() => {
    if (!currentUserId) return;

    const socket = createSocialSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
    });

    socket.on('message:new', ({ conversationId, message }) => {
      // FIX: xóa pending message ngay tại đây (socket event thường đến trước onSuccess)
      // kết hợp với dedup trong addMessageToPage → không bao giờ hiển thị duplicate
      onPendingResolved(message.clientMessageId ?? '');
      queryClient.setQueryData<SocialMessageListResponse>(
        ['social-messages', conversationId],
        (current) => addMessageToPage(current, message),
      );
      queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
    });

    socket.on('message:deleted', ({ conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: ['social-messages', conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
    });

    socket.on('read:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
    });

    socket.on('member:invited', () => {
      queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['social-conversation-invites'] });
    });

    socket.on('member:added', () => {
      queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['social-conversation-invites'] });
    });

    socket.on('member:removed', () => {
      queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['social-conversation-invites'] });
    });

    socket.on('typing:indicator', handleTypingIndicator);

    // presence:update — hiện chưa xử lý UI, giữ lại để dễ implement sau
    // socket.on("presence:update", ({ userId, online, lastSeenAt }) => { ... });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // handleTypingIndicator stable do useCallback, onPendingResolved cần được wrap useCallback ở caller
  }, [currentUserId, queryClient, handleTypingIndicator, onPendingResolved]);

  // --- Auto mark-as-read ---
  useEffect(() => {
    if (!selectedConversation || !latestMessage || !currentUserId) return;
    // Không mark nếu message là của chính mình
    if (latestMessage.senderId === currentUserId) return;
    // Không mark nếu đã read rồi
    if (
      selectedConversation.currentMember?.lastReadMessageId === latestMessage.id
    )
      return;

    const { id: conversationId } = selectedConversation;
    const { id: lastMessageId } = latestMessage;

    socketRef.current?.emit(
      'message:read',
      { conversationId, lastMessageId },
      (result) => {
        if (!result.ok) {
          // Fallback về REST nếu socket ack thất bại
          void api
            .markSocialConversationRead(conversationId, lastMessageId)
            .catch(() => undefined);
        }
      },
    );
  }, [latestMessage, selectedConversation, currentUserId]);

  return { socketRef, typingUsers, emitTypingStart, emitTypingStop };
}
