import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import type { User, UserNotification } from "@/types";

export function NotificationCenter({ user }: { user: User | null }) {
  if (!user) return null;
  return <AuthenticatedNotificationCenter user={user} />;
}

function AuthenticatedNotificationCenter({ user }: { user: User }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.listNotifications(30),
    enabled: Boolean(user)
  });
  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });
  const markAllRead = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  useEffect(() => {
    if (!user) return;
    const stream = new EventSource(api.notificationStreamUrl());
    stream.addEventListener("notification", () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    stream.onerror = () => {
      stream.close();
    };
    return () => stream.close();
  }, [queryClient, user]);

  const unread = notifications.data?.unreadCount ?? 0;
  const items = notifications.data?.data ?? [];

  const openNotification = async (item: UserNotification) => {
    if (!item.readAt) await markRead.mutateAsync(item.id);
    setOpen(false);
    navigate(item.targetType === "MANGA" ? `/manga/${item.targetId}` : `/read/${item.targetId}`);
  };

  return (
    <div className="relative">
      <button className="btn reader-icon-button min-h-9" onClick={() => setOpen((value) => !value)} type="button" aria-label="Notifications">
        <Bell size={17} />
        {unread ? <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[var(--danger)] px-1 text-[0.68rem] font-black text-white">{unread}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 grid w-[min(23rem,calc(100vw-2rem))] gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-sm text-[var(--text)]">Notifications</strong>
            <button className="btn min-h-8 px-2 text-xs" onClick={() => markAllRead.mutate()} disabled={!unread || markAllRead.isPending} type="button">
              <CheckCheck size={14} />
              Read all
            </button>
          </div>
          <div className="grid max-h-[24rem] gap-2 overflow-y-auto">
            {notifications.isLoading ? <p className="p-3 text-sm text-[var(--muted)]">Loading...</p> : null}
            {!notifications.isLoading && !items.length ? <p className="p-3 text-sm text-[var(--muted)]">No notifications yet.</p> : null}
            {items.map((item) => (
              <button
                key={item.id}
                className={`rounded-md border border-[var(--line)] p-3 text-left text-sm transition hover:border-[var(--accent)] ${item.readAt ? "bg-[var(--surface-soft)]" : "bg-[var(--accent-soft)]"}`}
                onClick={() => void openNotification(item)}
                type="button"
              >
                <span className="block font-bold text-[var(--text)]">
                  {item.actor.displayName} {item.type === "COMMENT_REPLY" ? "replied to your comment" : "reacted to your comment"}
                </span>
                <span className="mt-1 block text-xs text-[var(--muted)]">{new Date(item.createdAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
