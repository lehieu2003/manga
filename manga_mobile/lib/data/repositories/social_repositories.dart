import '../../domain/models/models.dart';
import '../services/api_client.dart';

class CommentRepository {
  CommentRepository(this._api);

  final ApiClient _api;

  Future<CommentListResponse> listComments({
    required String targetType,
    required String targetId,
    String? parentId,
    String? cursor,
    int limit = 20,
  }) {
    return _api.get(
      '/comments',
      CommentListResponse.fromJson,
      query: {
        'targetType': targetType,
        'targetId': targetId,
        'parentId': parentId,
        'cursor': cursor,
        'limit': '$limit',
      },
    );
  }

  Future<CommentItem> createComment({
    required String targetType,
    required String targetId,
    String? parentId,
    required String content,
    required bool isSpoiler,
  }) async {
    final payload = await _api.post('/comments', {
      'targetType': targetType,
      'targetId': targetId,
      if (parentId != null) 'parentId': parentId,
      'content': content,
      'isSpoiler': isSpoiler,
    }, (json) => json);
    return CommentItem.fromJson(payload['comment'] as Map<String, dynamic>);
  }

  Future<CommentItem> updateComment(
    String id, {
    String? content,
    bool? isSpoiler,
  }) async {
    final payload = await _api.patch('/comments/$id', {
      if (content != null) 'content': content,
      if (isSpoiler != null) 'isSpoiler': isSpoiler,
    }, (json) => json);
    return CommentItem.fromJson(payload['comment'] as Map<String, dynamic>);
  }

  Future<CommentItem> deleteComment(String id) async {
    final payload = await _api.delete('/comments/$id', (json) => json);
    return CommentItem.fromJson(payload['comment'] as Map<String, dynamic>);
  }

  Future<void> setReaction(String id, String type) async {
    await _api.post('/comments/$id/reaction', {'type': type}, (json) => json);
  }

  Future<void> removeReaction(String id) async {
    await _api.delete('/comments/$id/reaction', (json) => json);
  }
}

class NotificationRepository {
  NotificationRepository(this._api);

  final ApiClient _api;

  Future<NotificationListResponse> listNotifications({int limit = 30}) {
    return _api.get(
      '/notifications',
      NotificationListResponse.fromJson,
      query: {'limit': '$limit'},
    );
  }

  Future<void> markRead(String id) async {
    await _api.patch('/notifications/$id/read', const {}, (json) => json);
  }

  Future<void> markAllRead() async {
    await _api.patch('/notifications/read-all', const {}, (json) => json);
  }
}

class SocialRepository {
  SocialRepository(this._api);

  final ApiClient _api;

  Future<SocialUserSearchResponse> searchUsers({
    String? query,
    int limit = 12,
  }) {
    return _api.get(
      '/social/users',
      SocialUserSearchResponse.fromJson,
      query: {'query': query, 'limit': '$limit'},
    );
  }

  Future<FriendshipListResponse> listFriends() {
    return _api.get('/social/friends', FriendshipListResponse.fromJson);
  }

  Future<FriendshipListResponse> listIncomingRequests() {
    return _api.get(
      '/social/friends/requests',
      FriendshipListResponse.fromJson,
    );
  }

  Future<FriendshipListResponse> listSentRequests() {
    return _api.get('/social/friends/sent', FriendshipListResponse.fromJson);
  }

  Future<Friendship> sendFriendRequest(String addresseeId) async {
    final payload = await _api.post('/social/friends/requests', {
      'addresseeId': addresseeId,
    }, (json) => json);
    return Friendship.fromJson(payload['friendship'] as Map<String, dynamic>);
  }

  Future<(Friendship, SocialConversation)> acceptFriendRequest(
    String friendshipId,
  ) async {
    final payload = await _api.patch(
      '/social/friends/$friendshipId/accept',
      const {},
      (json) => json,
    );
    return (
      Friendship.fromJson(payload['friendship'] as Map<String, dynamic>),
      SocialConversation.fromJson(
        payload['conversation'] as Map<String, dynamic>,
      ),
    );
  }

  Future<Friendship> rejectFriendRequest(String friendshipId) async {
    final payload = await _api.patch(
      '/social/friends/$friendshipId/reject',
      const {},
      (json) => json,
    );
    return Friendship.fromJson(payload['friendship'] as Map<String, dynamic>);
  }

  Future<Friendship> blockFriendship(String friendshipId) async {
    final payload = await _api.patch(
      '/social/friends/$friendshipId/block',
      const {},
      (json) => json,
    );
    return Friendship.fromJson(payload['friendship'] as Map<String, dynamic>);
  }

  Future<Friendship> unfriend(String friendshipId) async {
    final payload = await _api.delete(
      '/social/friends/$friendshipId',
      (json) => json,
    );
    return Friendship.fromJson(payload['friendship'] as Map<String, dynamic>);
  }

  Future<SocialConversationListResponse> listConversations({
    int limit = 30,
    String? cursor,
    String? membershipStatus,
  }) {
    return _api.get(
      '/social/conversations',
      SocialConversationListResponse.fromJson,
      query: {
        'limit': '$limit',
        'cursor': cursor,
        'membershipStatus': membershipStatus,
      },
    );
  }

  Future<SocialConversation> createGroupConversation({
    required String title,
    required List<String> memberIds,
  }) async {
    final payload = await _api.post('/social/conversations', {
      'title': title,
      'memberIds': memberIds,
    }, (json) => json);
    return SocialConversation.fromJson(
      payload['conversation'] as Map<String, dynamic>,
    );
  }

  Future<SocialConversation> createGroupInvite({
    required String conversationId,
    required String userId,
  }) async {
    final payload = await _api.post(
      '/social/conversations/$conversationId/invites',
      {'userId': userId},
      (json) => json,
    );
    return SocialConversation.fromJson(
      payload['conversation'] as Map<String, dynamic>,
    );
  }

  Future<SocialConversation> resolveGroupInvite({
    required String conversationId,
    required String userId,
    required String action,
  }) async {
    final payload = await _api.patch(
      '/social/conversations/$conversationId/invites/$userId',
      {'action': action},
      (json) => json,
    );
    return SocialConversation.fromJson(
      payload['conversation'] as Map<String, dynamic>,
    );
  }

  Future<SocialMessageListResponse> listMessages(
    String conversationId, {
    int limit = 50,
    String? cursor,
  }) {
    return _api.get(
      '/social/conversations/$conversationId/messages',
      SocialMessageListResponse.fromJson,
      query: {'limit': '$limit', 'cursor': cursor},
    );
  }

  Future<SocialMessage> sendMessage({
    required String conversationId,
    required String clientMessageId,
    required String content,
  }) async {
    final payload = await _api.post(
      '/social/conversations/$conversationId/messages',
      {'clientMessageId': clientMessageId, 'type': 'TEXT', 'content': content},
      (json) => json,
    );
    return SocialMessage.fromJson(payload['message'] as Map<String, dynamic>);
  }

  Future<SocialMessage> sendMangaShare({
    required String conversationId,
    required String clientMessageId,
    required String mangaId,
    String? chapterId,
  }) async {
    final payload = await _api
        .post('/social/conversations/$conversationId/messages', {
          'clientMessageId': clientMessageId,
          'type': 'MANGA_SHARE',
          'mangaId': mangaId,
          if (chapterId != null) 'chapterId': chapterId,
        }, (json) => json);
    return SocialMessage.fromJson(payload['message'] as Map<String, dynamic>);
  }

  Future<SocialMessage> deleteMessage(String messageId) async {
    final payload = await _api.delete(
      '/social/messages/$messageId',
      (json) => json,
    );
    return SocialMessage.fromJson(payload['message'] as Map<String, dynamic>);
  }

  Future<void> markConversationRead(
    String conversationId,
    String lastMessageId,
  ) async {
    await _api.patch('/social/conversations/$conversationId/read', {
      'lastMessageId': lastMessageId,
    }, (json) => json);
  }
}

class ChatRepository {
  ChatRepository(this._api);

  final ApiClient _api;

  Future<SendChatMessageResponse> sendMessage({
    String? conversationId,
    required String message,
    String? mangaId,
    String? chapterId,
  }) {
    return _api.post('/chat/messages', {
      if (conversationId != null) 'conversationId': conversationId,
      'message': message,
      if (mangaId != null || chapterId != null)
        'routeContext': {
          if (mangaId != null) 'mangaId': mangaId,
          if (chapterId != null) 'chapterId': chapterId,
        },
    }, SendChatMessageResponse.fromJson);
  }
}
