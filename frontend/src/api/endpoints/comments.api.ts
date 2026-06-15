import type { CommentItem, CommentListResponse, CommentReactionType, CommentTargetType, NotificationListResponse } from "@/types";
import { API_ORIGIN, getAccessToken, request } from "../interceptors/auth.interceptor";

export const commentsApi = {
  listComments(params: { targetType: CommentTargetType; targetId: string; parentId?: string; cursor?: string; limit?: number }) {
    const query = new URLSearchParams();
    query.set("targetType", params.targetType);
    query.set("targetId", params.targetId);
    query.set("limit", String(params.limit ?? 20));
    if (params.parentId) query.set("parentId", params.parentId);
    if (params.cursor) query.set("cursor", params.cursor);
    return request<CommentListResponse>(`/comments?${query}`);
  },
  createComment(input: { targetType: CommentTargetType; targetId: string; parentId?: string; content: string; isSpoiler: boolean }) {
    return request<{ comment: CommentItem }>("/comments", { method: "POST", body: JSON.stringify(input) });
  },
  updateComment(id: string, input: { content?: string; isSpoiler?: boolean }) {
    return request<{ comment: CommentItem }>(`/comments/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  deleteComment(id: string) {
    return request<{ comment: CommentItem }>(`/comments/${id}`, { method: "DELETE" });
  },
  setCommentReaction(id: string, type: CommentReactionType) {
    return request<{ reaction: { id: string; type: CommentReactionType } }>(`/comments/${id}/reaction`, { method: "POST", body: JSON.stringify({ type }) });
  },
  removeCommentReaction(id: string) {
    return request<{ ok: true }>(`/comments/${id}/reaction`, { method: "DELETE" });
  },
  listNotifications(limit = 30) {
    return request<NotificationListResponse>(`/notifications?limit=${limit}`);
  },
  markNotificationRead(id: string) {
    return request<{ ok: true }>(`/notifications/${id}/read`, { method: "PATCH" });
  },
  markAllNotificationsRead() {
    return request<{ ok: true }>("/notifications/read-all", { method: "PATCH" });
  },
  notificationStreamUrl() {
    const token = getAccessToken();
    const query = new URLSearchParams();
    if (token) query.set("token", token);
    return `${API_ORIGIN}/api/notifications/stream?${query}`;
  }
};
