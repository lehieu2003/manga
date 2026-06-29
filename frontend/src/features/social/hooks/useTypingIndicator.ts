import { useCallback, useEffect, useRef, useState } from 'react';
import type { SocialSocket } from '../social-socket';
import { TYPING_AUTO_CLEAR_MS, TYPING_DEBOUNCE_MS } from '../constants';

/**
 * Quản lý toàn bộ typing indicator:
 * - Lắng nghe event từ socket và update typingUsers state
 * - Emit typing:start / typing:stop với debounce
 *
 * FIX: clear tất cả timer khi unmount để tránh memory leak và stale state update
 */
export function useTypingIndicator(
  socketRef: React.RefObject<SocialSocket | null>,
  currentUserId: string | undefined,
) {
  const [typingUsersByConversation, setTypingUsersByConversation] = useState<
    Record<string, Record<string, string>>
  >({});

  // Map lưu autoClear timer theo conversationId:userId để nhiều người typing cùng lúc không ghi đè nhau.
  const autoClearTimers = useRef<Map<string, number>>(new Map());
  const debounceTimer = useRef<number | null>(null);

  // Clear tất cả timer khi unmount
  useEffect(() => {
    return () => {
      autoClearTimers.current.forEach((id) => window.clearTimeout(id));
      autoClearTimers.current.clear();
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, []);

  /**
   * Gọi hàm này từ socket handler "typing:indicator"
   */
  const handleTypingIndicator = useCallback(
    ({
      conversationId,
      user: typingUser,
      typing,
    }: {
      conversationId: string;
      user: { id: string; displayName: string };
      typing: boolean;
    }) => {
      if (typingUser.id === currentUserId) return;

      const typingKey = `${conversationId}:${typingUser.id}`;
      const existingTimer = autoClearTimers.current.get(typingKey);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
        autoClearTimers.current.delete(typingKey);
      }

      setTypingUsersByConversation((current) =>
        updateTypingUsers(current, conversationId, typingUser, typing),
      );

      if (typing) {
        const timerId = window.setTimeout(() => {
          setTypingUsersByConversation((current) =>
            updateTypingUsers(current, conversationId, typingUser, false),
          );
          autoClearTimers.current.delete(typingKey);
        }, TYPING_AUTO_CLEAR_MS);
        autoClearTimers.current.set(typingKey, timerId);
      }
    },
    [currentUserId],
  );

  const typingUsers = Object.fromEntries(
    Object.entries(typingUsersByConversation)
      .map(([conversationId, users]) => [
        conversationId,
        formatTypingNames(Object.values(users)),
      ])
      .filter(([, label]) => label),
  );

  /**
   * Gọi khi user gõ vào input — emit typing:start và debounce typing:stop
   */
  const emitTypingStart = useCallback(
    (conversationId: string) => {
      socketRef.current?.emit('typing:start', { conversationId });
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
      debounceTimer.current = window.setTimeout(() => {
        socketRef.current?.emit('typing:stop', { conversationId });
      }, TYPING_DEBOUNCE_MS);
    },
    [socketRef],
  );

  /**
   * Gọi khi submit message để dừng typing indicator ngay lập tức
   */
  const emitTypingStop = useCallback(
    (conversationId: string) => {
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      socketRef.current?.emit('typing:stop', { conversationId });
    },
    [socketRef],
  );

  return {
    typingUsers,
    handleTypingIndicator,
    emitTypingStart,
    emitTypingStop,
  };
}

function updateTypingUsers(
  current: Record<string, Record<string, string>>,
  conversationId: string,
  typingUser: { id: string; displayName: string },
  typing: boolean,
) {
  const next = { ...current };
  const users = { ...(next[conversationId] ?? {}) };

  if (typing) {
    users[typingUser.id] = typingUser.displayName;
  } else {
    delete users[typingUser.id];
  }

  if (Object.keys(users).length) {
    next[conversationId] = users;
  } else {
    delete next[conversationId];
  }

  return next;
}

function formatTypingNames(names: string[]) {
  const filtered = names.filter(Boolean);
  if (!filtered.length) return '';
  if (filtered.length === 1) return filtered[0];
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`;
  return `${filtered[0]} and ${filtered.length - 1} others`;
}
