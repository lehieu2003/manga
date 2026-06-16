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
