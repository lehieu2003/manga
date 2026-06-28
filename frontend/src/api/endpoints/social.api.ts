import type { Friendship, FriendshipListResponse, SocialConversationListResponse, SocialMessage, SocialMessageListResponse, SocialMessageType } from "@/types";
import { request } from "../interceptors/auth.interceptor";

export const socialApi = {
  listFriends() {
    return request<FriendshipListResponse>("/social/friends");
  },
  listIncomingFriendRequests() {
    return request<FriendshipListResponse>("/social/friends/requests");
  },
  listSentFriendRequests() {
    return request<FriendshipListResponse>("/social/friends/sent");
  },
  sendFriendRequest(addresseeId: string) {
    return request<{ friendship: Friendship }>("/social/friends/requests", {
      method: "POST",
      body: JSON.stringify({ addresseeId })
    });
  },
  acceptFriendRequest(id: string) {
    return request<{ friendship: Friendship; conversation: SocialConversationListResponse["data"][number] }>(`/social/friends/${id}/accept`, { method: "PATCH" });
  },
  rejectFriendRequest(id: string) {
    return request<{ friendship: Friendship }>(`/social/friends/${id}/reject`, { method: "PATCH" });
  },
  blockFriendship(id: string) {
    return request<{ friendship: Friendship }>(`/social/friends/${id}/block`, { method: "PATCH" });
  },
  unblockFriendship(id: string) {
    return request<{ friendship: Friendship }>(`/social/friends/${id}/unblock`, { method: "PATCH" });
  },
  unfriend(id: string) {
    return request<{ friendship: Friendship }>(`/social/friends/${id}`, { method: "DELETE" });
  },
  listSocialConversations(params: { limit?: number; cursor?: string } = {}) {
    const query = new URLSearchParams();
    query.set("limit", String(params.limit ?? 30));
    if (params.cursor) query.set("cursor", params.cursor);
    return request<SocialConversationListResponse>(`/social/conversations?${query}`);
  },
  getSocialConversation(id: string) {
    return request<{ conversation: SocialConversationListResponse["data"][number] }>(`/social/conversations/${id}`);
  },
  listSocialMessages(conversationId: string, params: { limit?: number; cursor?: string } = {}) {
    const query = new URLSearchParams();
    query.set("limit", String(params.limit ?? 50));
    if (params.cursor) query.set("cursor", params.cursor);
    return request<SocialMessageListResponse>(`/social/conversations/${conversationId}/messages?${query}`);
  },
  sendSocialMessage(conversationId: string, input: { clientMessageId: string; type?: Extract<SocialMessageType, "TEXT">; content: string }) {
    return request<{ message: SocialMessage; idempotent: boolean }>(`/social/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ type: "TEXT", ...input })
    });
  },
  markSocialConversationRead(conversationId: string, lastMessageId: string) {
    return request<{ readState: { conversationId: string; userId: string; lastReadMessageId: string | null; lastReadAt: string | null } }>(`/social/conversations/${conversationId}/read`, {
      method: "PATCH",
      body: JSON.stringify({ lastMessageId })
    });
  },
  deleteSocialMessage(messageId: string) {
    return request<{ message: SocialMessage; idempotent: boolean }>(`/social/messages/${messageId}`, { method: "DELETE" });
  }
};
