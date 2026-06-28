import { CommentReactionType, CommentStatus, CommentTargetType, NotificationSubjectType, NotificationType } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  commentFindMany: vi.fn(),
  commentFindUnique: vi.fn(),
  commentCreate: vi.fn(),
  commentUpdate: vi.fn(),
  commentGroupBy: vi.fn(),
  reactionGroupBy: vi.fn(),
  reactionFindMany: vi.fn(),
  reactionUpsert: vi.fn(),
  reactionDeleteMany: vi.fn(),
  notificationCreate: vi.fn(),
  notificationFindMany: vi.fn(),
  notificationCount: vi.fn(),
  notificationUpdateMany: vi.fn()
}));

vi.mock("../../infrastructure/database/client.js", () => ({
  prisma: {
    comment: {
      findMany: prismaMocks.commentFindMany,
      findUnique: prismaMocks.commentFindUnique,
      create: prismaMocks.commentCreate,
      update: prismaMocks.commentUpdate,
      groupBy: prismaMocks.commentGroupBy
    },
    commentReaction: {
      groupBy: prismaMocks.reactionGroupBy,
      findMany: prismaMocks.reactionFindMany,
      upsert: prismaMocks.reactionUpsert,
      deleteMany: prismaMocks.reactionDeleteMany
    },
    notification: {
      create: prismaMocks.notificationCreate,
      findMany: prismaMocks.notificationFindMany,
      count: prismaMocks.notificationCount,
      updateMany: prismaMocks.notificationUpdateMany
    }
  }
}));

describe("comment service", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps hidden comment content out of list responses", async () => {
    const { listComments } = await import("../../domain/services/comment.service.js");
    prismaMocks.commentFindMany.mockResolvedValue([makeComment({ status: CommentStatus.HIDDEN, content: "moderated text", hiddenAt: new Date("2024-01-03T00:00:00.000Z") })]);
    prismaMocks.commentGroupBy.mockResolvedValue([]);
    prismaMocks.reactionGroupBy.mockResolvedValue([]);
    prismaMocks.reactionFindMany.mockResolvedValue([]);

    const response = await listComments({ targetType: CommentTargetType.MANGA, targetId: mangaId, limit: 20, userId: "reader-1" });

    expect(response.data[0]).toMatchObject({ content: "", status: CommentStatus.HIDDEN, isSpoiler: false });
  });

  it("creates nested replies and notifies the parent author", async () => {
    const { createComment } = await import("../../domain/services/comment.service.js");
    prismaMocks.commentFindUnique.mockResolvedValue(makeComment({ id: "parent-1", authorId: "author-1", path: "root.parent-1" }));
    prismaMocks.commentCreate.mockResolvedValue(makeComment({ id: "reply-1", authorId: "reader-1", parentId: "parent-1", depth: 2, path: "pending" }));
    prismaMocks.commentUpdate.mockResolvedValue(makeComment({ id: "reply-1", authorId: "reader-1", parentId: "parent-1", depth: 2, path: "root.parent-1.reply-1" }));
    prismaMocks.notificationCreate.mockImplementation(async ({ data }) => ({ id: "notification-1", ...data, readAt: null, createdAt: new Date("2024-01-04T00:00:00.000Z") }));

    const response = await createComment({ targetType: CommentTargetType.MANGA, targetId: mangaId, parentId: "parent-1", authorId: "reader-1", content: "reply", isSpoiler: false });

    expect(response.comment).toMatchObject({ id: "reply-1", parentId: "parent-1", depth: 2 });
    expect(prismaMocks.notificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "author-1",
        actorId: "reader-1",
        type: NotificationType.COMMENT_REPLY,
        subjectType: NotificationSubjectType.COMMENT,
        subjectId: "reply-1",
        payload: { commentId: "reply-1", targetType: CommentTargetType.MANGA, targetId: mangaId }
      }
    });
  });

  it("upserts one reaction per user and creates a reaction notification", async () => {
    const { upsertCommentReaction } = await import("../../domain/services/comment.service.js");
    prismaMocks.commentFindUnique.mockResolvedValue(makeComment({ id: "comment-1", authorId: "author-1" }));
    prismaMocks.reactionUpsert.mockResolvedValue({ id: "reaction-1", commentId: "comment-1", userId: "reader-1", type: CommentReactionType.HEART });
    prismaMocks.notificationCreate.mockResolvedValue({ id: "notification-1" });

    const response = await upsertCommentReaction("reader-1", "comment-1", CommentReactionType.HEART);

    expect(response.reaction).toMatchObject({ type: CommentReactionType.HEART });
    expect(prismaMocks.reactionUpsert).toHaveBeenCalledWith({
      where: { commentId_userId: { commentId: "comment-1", userId: "reader-1" } },
      create: { commentId: "comment-1", userId: "reader-1", type: CommentReactionType.HEART },
      update: { type: CommentReactionType.HEART }
    });
    expect(prismaMocks.notificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "author-1",
        actorId: "reader-1",
        type: NotificationType.COMMENT_REACTION,
        subjectType: NotificationSubjectType.COMMENT,
        subjectId: "comment-1",
        payload: { commentId: "comment-1", targetType: CommentTargetType.MANGA, targetId: mangaId }
      }
    });
  });
});

const mangaId = "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0";

function makeComment(overrides: Partial<ReturnType<typeof makeBaseComment>> = {}) {
  return { ...makeBaseComment(), ...overrides };
}

function makeBaseComment() {
  const comment: {
    id: string;
    targetType: CommentTargetType;
    targetId: string;
    authorId: string;
    parentId: string | null;
    rootId: string | null;
    depth: number;
    path: string;
    content: string;
    isSpoiler: boolean;
    status: CommentStatus;
    deletedAt: Date | null;
    hiddenAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    author: { id: string; displayName: string; avatarUrl: string | null; role: "USER" | "ADMIN" };
  } = {
    id: "comment-1",
    targetType: CommentTargetType.MANGA,
    targetId: mangaId,
    authorId: "author-1",
    parentId: null,
    rootId: null,
    depth: 0,
    path: "comment-1",
    content: "hello",
    isSpoiler: false,
    status: CommentStatus.VISIBLE,
    deletedAt: null,
    hiddenAt: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-02T00:00:00.000Z"),
    author: { id: "author-1", displayName: "Author", avatarUrl: null, role: "USER" }
  };
  return comment;
}
