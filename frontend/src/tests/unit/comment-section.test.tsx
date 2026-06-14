import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { CommentSection } from "@/features/comments/CommentSection";
import type { CommentItem, User } from "@/types";

const apiMocks = vi.hoisted(() => ({
  listComments: vi.fn(),
  setCommentReaction: vi.fn(),
  removeCommentReaction: vi.fn(),
  createComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn()
}));

vi.mock("@/api", () => ({
  api: apiMocks
}));

describe("CommentSection", () => {
  it("hides spoiler content until the reader reveals it", async () => {
    apiMocks.listComments.mockResolvedValue({ data: [makeComment({ isSpoiler: true, content: "The villain returns." })], nextCursor: null });

    renderWithClient(<CommentSection targetType="MANGA" targetId={mangaId} user={user} />);

    expect(await screen.findByText("Spoiler hidden. Click to reveal.")).toBeInTheDocument();
    expect(screen.queryByText("The villain returns.")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Spoiler hidden. Click to reveal."));

    expect(screen.getByText("The villain returns.")).toBeInTheDocument();
  });

  it("switches the current reaction through the API", async () => {
    apiMocks.listComments.mockResolvedValue({ data: [makeComment()], nextCursor: null });
    apiMocks.setCommentReaction.mockResolvedValue({ reaction: { id: "reaction-1", type: "HEART" } });

    renderWithClient(<CommentSection targetType="MANGA" targetId={mangaId} user={user} />);

    await screen.findByText("hello");
    await userEvent.click(screen.getByTitle("Heart"));

    await waitFor(() => expect(apiMocks.setCommentReaction).toHaveBeenCalledWith("comment-1", "HEART"));
  });
});

const mangaId = "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0";
const user: User = {
  id: "reader-1",
  email: "reader@example.com",
  displayName: "Reader",
  role: "USER",
  avatarUrl: null,
  createdAt: "2024-01-01T00:00:00.000Z"
};

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function makeComment(overrides: Partial<CommentItem> = {}): CommentItem {
  return {
    id: "comment-1",
    targetType: "MANGA",
    targetId: mangaId,
    author: { id: "author-1", displayName: "Author", avatarUrl: null, role: "USER" },
    parentId: null,
    rootId: null,
    depth: 0,
    content: "hello",
    isSpoiler: false,
    status: "VISIBLE",
    deletedAt: null,
    hiddenAt: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    replyCount: 0,
    reactionCounts: { LIKE: 0, HEART: 0, SAD: 0, LAUGH: 0, ANGRY: 0 },
    currentUserReaction: null,
    ...overrides
  };
}
