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
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

  // Map lưu autoClear timer theo conversationId để có thể clear đúng timer
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

      // Clear auto-clear timer cũ của conversation này (nếu có)
      const existingTimer = autoClearTimers.current.get(conversationId);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
        autoClearTimers.current.delete(conversationId);
      }

      setTypingUsers((current) => {
        const next = { ...current };
        if (typing) next[conversationId] = typingUser.displayName;
        else delete next[conversationId];
        return next;
      });

      // FIX: lưu timer vào map theo conversationId thay vì dùng 1 ref chung
      // để tránh timer của conversation A xóa nhầm indicator của conversation B
      if (typing) {
        const timerId = window.setTimeout(() => {
          setTypingUsers((current) => {
            const next = { ...current };
            delete next[conversationId];
            return next;
          });
          autoClearTimers.current.delete(conversationId);
        }, TYPING_AUTO_CLEAR_MS);
        autoClearTimers.current.set(conversationId, timerId);
      }
    },
    [currentUserId],
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
