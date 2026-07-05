import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";
import type { User } from "@/types";

const apiMocks = vi.hoisted(() => ({
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  notificationStreamUrl: vi.fn()
}));

vi.mock("@/api", () => ({
  api: apiMocks
}));

class MockEventSource {
  onerror: (() => void) | null = null;
  constructor(public url: string) {}
  addEventListener = vi.fn();
  close = vi.fn();
}

describe("NotificationCenter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("EventSource", MockEventSource);
  });

  it("shows unread notifications and marks all as read", async () => {
    apiMocks.notificationStreamUrl.mockReturnValue("http://localhost:4000/api/notifications/stream?token=test");
    apiMocks.listNotifications.mockResolvedValue({
      unreadCount: 1,
      data: [
        {
          id: "notification-1",
          actor: { id: "actor-1", displayName: "Mina", avatarUrl: null },
          type: "COMMENT_REPLY",
          commentId: "comment-1",
          targetType: "MANGA",
          targetId: mangaId,
          readAt: null,
          createdAt: "2024-01-01T00:00:00.000Z"
        }
      ]
    });
    apiMocks.markAllNotificationsRead.mockResolvedValue({ ok: true });

    renderWithClient(<NotificationCenter user={user} />);

    expect(await screen.findByText("1")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Notifications"));
    await userEvent.click(screen.getByText("Read all"));

    await waitFor(() => expect(apiMocks.markAllNotificationsRead).toHaveBeenCalled());
  });

  it("labels friend requests as social notifications and opens messages", async () => {
    apiMocks.notificationStreamUrl.mockReturnValue("http://localhost:4000/api/notifications/stream?token=test");
    apiMocks.listNotifications.mockResolvedValue({
      unreadCount: 1,
      data: [
        {
          id: "notification-2",
          actor: { id: "actor-2", displayName: "Nori", avatarUrl: null },
          type: "FRIEND_REQUEST",
          subjectType: "FRIENDSHIP",
          subjectId: "friendship-1",
          friendshipId: "friendship-1",
          readAt: null,
          createdAt: "2024-01-01T00:00:00.000Z"
        }
      ]
    });
    apiMocks.markNotificationRead.mockResolvedValue({ ok: true });

    renderWithClient(
      <>
        <NotificationCenter user={user} />
        <LocationProbe />
      </>
    );

    await userEvent.click(await screen.findByLabelText("Notifications"));
    await userEvent.click(screen.getByText("Nori sent you a friend request"));

    await waitFor(() => expect(apiMocks.markNotificationRead).toHaveBeenCalledWith("notification-2"));
    expect(screen.getByTestId("location")).toHaveTextContent("/messages");
  });
});

const mangaId = "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0";
const user: User = {
  id: "reader-1",
  email: "reader@example.com",
  displayName: "Reader",
  role: "USER",
  avatarUrl: null,
  emailVerifiedAt: "2024-01-01T00:00:00.000Z",
  hasPassword: true,
  createdAt: "2024-01-01T00:00:00.000Z"
};

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}
