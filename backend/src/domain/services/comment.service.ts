import { CommentReactionType, CommentStatus, CommentTargetType, NotificationSubjectType, NotificationType, type Comment } from "@prisma/client";
import { prisma } from "../../infrastructure/database/client.js";
import { HttpError } from "../../shared/errors/http-error.js";
import { commentRepository } from "../repositories/comment.repository.js";
import { publishNotification } from "./notification-stream.service.js";

type Actor = { id?: string; role?: "USER" | "ADMIN" };

export async function listComments(input: { targetType: CommentTargetType; targetId: string; parentId?: string; cursor?: string; limit: number; userId?: string }) {
  const rows = await commentRepository.list(input);
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  const ids = items.map((item) => item.id);
  const [replyCounts, reactionCounts, userReactions] = await Promise.all([
    ids.length ? commentRepository.countReplies(ids) : [],
    ids.length ? commentRepository.countReactions(ids) : [],
    input.userId && ids.length ? commentRepository.findUserReactions(input.userId, ids) : []
  ]);

  const replyCountByParent = new Map(replyCounts.map((item) => [item.parentId, item._count._all]));
  const userReactionByComment = new Map(userReactions.map((item) => [item.commentId, item.type]));

  return {
    data: items.map((item) =>
      serializeComment(item, {
        replyCount: replyCountByParent.get(item.id) ?? 0,
        reactionCounts: buildReactionCounts(
          reactionCounts.filter((count) => count.commentId === item.id).map((count) => ({ type: count.type, count: count._count._all }))
        ),
        currentUserReaction: userReactionByComment.get(item.id) ?? null
      })
    ),
    nextCursor: hasMore ? rows[input.limit]?.id : null
  };
}

export async function createComment(input: { targetType: CommentTargetType; targetId: string; parentId?: string; authorId: string; content: string; isSpoiler: boolean }) {
  const parent = input.parentId ? await assertParent(input.parentId, input.targetType, input.targetId) : undefined;
  const comment = await commentRepository.create({ ...input, parent });

  if (parent && parent.authorId !== input.authorId) {
    await createNotification({
      userId: parent.authorId,
      actorId: input.authorId,
      type: NotificationType.COMMENT_REPLY,
      subjectType: NotificationSubjectType.COMMENT,
      subjectId: comment.id,
      payload: { commentId: comment.id, targetType: comment.targetType, targetId: comment.targetId }
    });
  }

  return { comment: serializeComment(comment, { replyCount: 0, reactionCounts: emptyReactionCounts(), currentUserReaction: null }) };
}

export async function updateComment(userId: string, id: string, input: { content?: string; isSpoiler?: boolean }) {
  const comment = await assertComment(id);
  if (comment.authorId !== userId) throw new HttpError(403, "Only the comment author can edit this comment", "COMMENT_EDIT_FORBIDDEN");
  if (comment.status !== CommentStatus.VISIBLE) throw new HttpError(409, "Deleted or hidden comments cannot be edited", "COMMENT_NOT_EDITABLE");
  const updated = await commentRepository.update(id, {
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.isSpoiler !== undefined ? { isSpoiler: input.isSpoiler } : {})
  });
  return { comment: serializeComment(updated, { replyCount: 0, reactionCounts: emptyReactionCounts(), currentUserReaction: null }) };
}

export async function deleteComment(actor: Actor, id: string) {
  const comment = await assertComment(id);
  if (comment.authorId === actor.id) {
    const deleted = await commentRepository.setStatus(id, CommentStatus.DELETED, "deletedAt");
    return { comment: serializeComment(deleted, { replyCount: 0, reactionCounts: emptyReactionCounts(), currentUserReaction: null }) };
  }
  if (actor.role === "ADMIN") {
    const hidden = await commentRepository.setStatus(id, CommentStatus.HIDDEN, "hiddenAt");
    return { comment: serializeComment(hidden, { replyCount: 0, reactionCounts: emptyReactionCounts(), currentUserReaction: null }) };
  }
  throw new HttpError(403, "Only the author or an admin can delete this comment", "COMMENT_DELETE_FORBIDDEN");
}

export async function upsertCommentReaction(userId: string, commentId: string, type: CommentReactionType) {
  const comment = await assertComment(commentId);
  if (comment.status !== CommentStatus.VISIBLE) throw new HttpError(409, "Cannot react to deleted or hidden comments", "COMMENT_REACTION_FORBIDDEN");
  const reaction = await commentRepository.upsertReaction(commentId, userId, type);
  if (comment.authorId !== userId) {
    await createNotification({
      userId: comment.authorId,
      actorId: userId,
      type: NotificationType.COMMENT_REACTION,
      subjectType: NotificationSubjectType.COMMENT,
      subjectId: commentId,
      payload: { commentId, targetType: comment.targetType, targetId: comment.targetId }
    });
  }
  return { reaction };
}

export async function removeCommentReaction(userId: string, commentId: string) {
  await assertComment(commentId);
  await commentRepository.removeReaction(commentId, userId);
  return { ok: true };
}

export async function listNotifications(userId: string, limit = 30) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
    include: { actor: { select: { id: true, displayName: true, avatarUrl: true } } }
  });
  const unreadCount = await prisma.notification.count({ where: { userId, readAt: null } });
  return { data: notifications.map(serializeNotification), unreadCount };
}

export async function markNotificationRead(userId: string, id: string) {
  const notification = await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  if (!notification.count) throw new HttpError(404, "Notification not found", "NOTIFICATION_NOT_FOUND");
  return { ok: true };
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  return { ok: true };
}

async function assertParent(parentId: string, targetType: CommentTargetType, targetId: string) {
  const parent = await prisma.comment.findUnique({ where: { id: parentId } });
  if (!parent || parent.targetType !== targetType || parent.targetId !== targetId) throw new HttpError(404, "Parent comment not found", "COMMENT_PARENT_NOT_FOUND");
  if (parent.status !== CommentStatus.VISIBLE) throw new HttpError(409, "Cannot reply to deleted or hidden comments", "COMMENT_REPLY_FORBIDDEN");
  return parent;
}

async function assertComment(id: string) {
  const comment = await commentRepository.findById(id);
  if (!comment) throw new HttpError(404, "Comment not found", "COMMENT_NOT_FOUND");
  return comment;
}

async function createNotification(input: {
  userId: string;
  actorId: string;
  type: NotificationType;
  subjectType: NotificationSubjectType;
  subjectId: string;
  payload: { commentId: string; targetType: CommentTargetType; targetId: string };
}) {
  const notification = await prisma.notification.create({ data: input });
  publishNotification(notification);
  return notification;
}

function serializeComment<T extends Comment & { author?: { id: string; displayName: string; avatarUrl: string | null; role: string } }>(
  comment: T,
  meta: { replyCount: number; reactionCounts: Record<string, number>; currentUserReaction: CommentReactionType | null }
) {
  const isVisible = comment.status === CommentStatus.VISIBLE;
  return {
    id: comment.id,
    targetType: comment.targetType,
    targetId: comment.targetId,
    author: comment.author
      ? { id: comment.author.id, displayName: comment.author.displayName, avatarUrl: comment.author.avatarUrl, role: comment.author.role }
      : null,
    parentId: comment.parentId,
    rootId: comment.rootId,
    depth: comment.depth,
    content: isVisible ? comment.content : "",
    isSpoiler: isVisible ? comment.isSpoiler : false,
    status: comment.status,
    deletedAt: comment.deletedAt,
    hiddenAt: comment.hiddenAt,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    replyCount: meta.replyCount,
    reactionCounts: meta.reactionCounts,
    currentUserReaction: meta.currentUserReaction
  };
}

function serializeNotification(notification: {
  id: string;
  actorId: string;
  type: NotificationType;
  subjectType: NotificationSubjectType;
  subjectId: string;
  payload: unknown;
  readAt: Date | null;
  createdAt: Date;
  actor: { id: string; displayName: string; avatarUrl: string | null };
}) {
  const payload = isCommentNotificationPayload(notification.payload) ? notification.payload : null;
  return {
    id: notification.id,
    actor: notification.actor,
    type: notification.type,
    subjectType: notification.subjectType,
    subjectId: notification.subjectId,
    ...(payload ? payload : {}),
    readAt: notification.readAt,
    createdAt: notification.createdAt
  };
}

function isCommentNotificationPayload(value: unknown): value is { commentId: string; targetType: CommentTargetType; targetId: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  return typeof payload.commentId === "string" && typeof payload.targetId === "string" && (payload.targetType === CommentTargetType.MANGA || payload.targetType === CommentTargetType.CHAPTER);
}

function buildReactionCounts(counts: Array<{ type: CommentReactionType; count: number }>) {
  const result = emptyReactionCounts();
  for (const item of counts) result[item.type] = item.count;
  return result;
}

function emptyReactionCounts() {
  return {
    [CommentReactionType.LIKE]: 0,
    [CommentReactionType.HEART]: 0,
    [CommentReactionType.SAD]: 0,
    [CommentReactionType.LAUGH]: 0,
    [CommentReactionType.ANGRY]: 0
  };
}
