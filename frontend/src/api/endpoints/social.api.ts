import type { CallMediaType, Friendship, FriendshipListResponse, SocialCallHistoryResponse, SocialCallResponse, SocialConversationListResponse, SocialMembershipStatus, SocialMessage, SocialMessageListResponse, SocialMessageType, SocialUserSearchResponse } from "@/types";
import { request } from "../interceptors/auth.interceptor";

type SendSocialMessageInput =
  | { clientMessageId: string; type?: Extract<SocialMessageType, "TEXT">; content: string }
  | { clientMessageId: string; type: Extract<SocialMessageType, "MANGA_SHARE">; mangaId: string; chapterId?: string };

export const socialApi = {
  searchSocialUsers(params: { query?: string; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.query) query.set("query", params.query);
    query.set("limit", String(params.limit ?? 12));
    return request<SocialUserSearchResponse>(`/social/users?${query}`);
  },
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
  listSocialConversations(params: { limit?: number; cursor?: string; membershipStatus?: Extract<SocialMembershipStatus, "ACTIVE" | "PENDING_INVITE"> } = {}) {
    const query = new URLSearchParams();
    query.set("limit", String(params.limit ?? 30));
    if (params.cursor) query.set("cursor", params.cursor);
    if (params.membershipStatus) query.set("membershipStatus", params.membershipStatus);
    return request<SocialConversationListResponse>(`/social/conversations?${query}`);
  },
  createSocialGroupConversation(input: { title: string; memberIds: string[] }) {
    return request<{ conversation: SocialConversationListResponse["data"][number] }>("/social/conversations", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  getSocialConversation(id: string) {
    return request<{ conversation: SocialConversationListResponse["data"][number] }>(`/social/conversations/${id}`);
  },
  createSocialGroupInvite(conversationId: string, userId: string) {
    return request<{ conversation: SocialConversationListResponse["data"][number] }>(`/social/conversations/${conversationId}/invites`, {
      method: "POST",
      body: JSON.stringify({ userId })
    });
  },
  resolveSocialGroupInvite(conversationId: string, userId: string, action: "accept" | "decline" | "cancel") {
    return request<{ conversation: SocialConversationListResponse["data"][number] }>(`/social/conversations/${conversationId}/invites/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ action })
    });
  },
  muteSocialConversation(conversationId: string, mutedUntil: string | null) {
    return request<{ conversation: SocialConversationListResponse["data"][number] }>(`/social/conversations/${conversationId}/mute`, {
      method: "PATCH",
      body: JSON.stringify({ mutedUntil })
    });
  },
  startSocialCall(conversationId: string, mediaType: CallMediaType) {
    return request<SocialCallResponse>(`/social/conversations/${conversationId}/calls`, {
      method: "POST",
      body: JSON.stringify({ mediaType })
    });
  },
  listSocialCalls(conversationId: string, params: { limit?: number; cursor?: string } = {}) {
    const query = new URLSearchParams();
    query.set("limit", String(params.limit ?? 20));
    if (params.cursor) query.set("cursor", params.cursor);
    return request<SocialCallHistoryResponse>(`/social/conversations/${conversationId}/calls?${query}`);
  },
  getSocialCall(callId: string) {
    return request<SocialCallResponse>(`/social/calls/${callId}`);
  },
  joinSocialCall(callId: string) {
    return request<SocialCallResponse>(`/social/calls/${callId}/join`, { method: "PATCH" });
  },
  declineSocialCall(callId: string) {
    return request<{ call: SocialCallResponse["call"] }>(`/social/calls/${callId}/decline`, { method: "PATCH" });
  },
  leaveSocialCall(callId: string) {
    return request<{ call: SocialCallResponse["call"] }>(`/social/calls/${callId}/leave`, { method: "PATCH" });
  },
  listSocialMessages(conversationId: string, params: { limit?: number; cursor?: string } = {}) {
    const query = new URLSearchParams();
    query.set("limit", String(params.limit ?? 50));
    if (params.cursor) query.set("cursor", params.cursor);
    return request<SocialMessageListResponse>(`/social/conversations/${conversationId}/messages?${query}`);
  },
  sendSocialMessage(conversationId: string, input: SendSocialMessageInput) {
    const body = input.type === "MANGA_SHARE" ? input : { type: "TEXT", ...input };
    return request<{ message: SocialMessage; idempotent: boolean }>(`/social/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(body)
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
  },
  setSocialMessageReaction(messageId: string, emoji: string) {
    return request<{ message: SocialMessage }>(`/social/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, { method: "PUT" });
  },
  removeSocialMessageReaction(messageId: string, emoji: string) {
    return request<{ message: SocialMessage }>(`/social/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, { method: "DELETE" });
  }
};
