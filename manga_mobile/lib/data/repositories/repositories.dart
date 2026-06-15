import '../../domain/models/models.dart';
import '../services/api_client.dart';
import '../services/token_store.dart';

class AuthRepository {
  AuthRepository(this._api);

  final ApiClient _api;

  Future<User?> restoreSession() async {
    if (await _api.tokenStore.accessToken == null) return null;
    try {
      final payload = await _api.get('/me', (json) => json);
      return User.fromJson(payload['user'] as Map<String, dynamic>);
    } catch (_) {
      await _api.tokenStore.clear();
      return null;
    }
  }

  Future<User> login({required String email, required String password}) {
    return _auth('/auth/login', {'email': email, 'password': password});
  }

  Future<User> register({
    required String email,
    required String password,
    required String displayName,
  }) {
    return _auth('/auth/register', {
      'email': email,
      'password': password,
      'displayName': displayName,
    });
  }

  Future<User> updateProfile({String? displayName, String? avatarUrl}) async {
    final payload = await _api.patch('/me', {
      if (displayName != null) 'displayName': displayName,
      'avatarUrl': avatarUrl,
    }, (json) => json);
    return User.fromJson(payload['user'] as Map<String, dynamic>);
  }

  Future<User> changePassword({
    required String currentPassword,
    required String newPassword,
  }) {
    return _auth('/me/password', {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    }, method: 'PUT');
  }

  Future<void> logout() async {
    final refreshToken = await _api.tokenStore.refreshToken;
    try {
      if (refreshToken != null) {
        await _api.post(
          '/auth/logout',
          {'refreshToken': refreshToken},
          (json) => json,
          allowRefresh: false,
        );
      }
    } finally {
      await _api.tokenStore.clear();
    }
  }

  Future<User> _auth(
    String path,
    Map<String, dynamic> body, {
    String method = 'POST',
  }) async {
    final payload = await _api.request(
      path,
      method: method,
      body: body,
      decode: (json) => json,
    );
    await _api.tokenStore.save(
      TokenPair(
        accessToken: payload['accessToken'] as String,
        refreshToken: payload['refreshToken'] as String,
      ),
    );
    return User.fromJson(payload['user'] as Map<String, dynamic>);
  }
}

class CatalogRepository {
  CatalogRepository(this._api);

  final ApiClient _api;

  String assetUrl(String? url) => _api.assetUrl(url);

  Future<Paginated<MangaSummary>> searchManga({
    String? query,
    int limit = 24,
    int offset = 0,
    List<String> includedTags = const [],
    List<String> excludedTags = const [],
    List<String> contentRating = const ['safe', 'suggestive'],
    List<String> status = const [],
    int? year,
    String? author,
    String? artist,
    String sort = 'relevance',
  }) {
    return _api.get(
      '/manga/search',
      (json) => Paginated<MangaSummary>(
        data: (json['data'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(MangaSummary.fromJson)
            .toList(),
        limit: json['limit'] as int? ?? limit,
        offset: json['offset'] as int? ?? offset,
        total: json['total'] as int? ?? 0,
        source: json['source'] as String?,
      ),
      query: {
        'q': query,
        'limit': '$limit',
        'offset': '$offset',
        'languages': 'vi,en',
        'includedTags': includedTags.join(','),
        'excludedTags': excludedTags.join(','),
        'contentRating': contentRating.join(','),
        'status': status.join(','),
        'year': year?.toString(),
        'author': author?.trim(),
        'artist': artist?.trim(),
        'sort': sort,
      },
    );
  }

  Future<List<GenreSummary>> genres() async {
    final payload = await _api.get('/genres', (json) => json);
    return (payload['data'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(GenreSummary.fromJson)
        .toList();
  }

  Future<MangaSummary> manga(String id) {
    return _api.get('/manga/$id', MangaSummary.fromJson);
  }

  Future<Paginated<ChapterSummary>> chapters(
    String mangaId, {
    int limit = 100,
    int offset = 0,
    List<String> translatedLanguage = const ['vi', 'en'],
  }) {
    return _api.get(
      '/manga/$mangaId/chapters',
      (json) => Paginated<ChapterSummary>(
        data: (json['data'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(ChapterSummary.fromJson)
            .toList(),
        limit: json['limit'] as int? ?? limit,
        offset: json['offset'] as int? ?? offset,
        total: json['total'] as int? ?? 0,
      ),
      query: {
        'limit': '$limit',
        'offset': '$offset',
        'translatedLanguage': translatedLanguage.join(','),
      },
    );
  }

  Future<ReaderPayload> reader(String chapterId) {
    return _api.get('/chapters/$chapterId/reader', ReaderPayload.fromJson);
  }
}

class LibraryRepository {
  LibraryRepository(this._api);

  final ApiClient _api;

  Future<List<LibraryItem>> all() async {
    final payload = await _api.get('/library', (json) => json);
    return (payload['data'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(LibraryItem.fromJson)
        .toList();
  }

  Future<LibraryItem?> item(String mangaId) async {
    final payload = await _api.get('/library/$mangaId', (json) => json);
    final item = payload['item'];
    return item is Map<String, dynamic> ? LibraryItem.fromJson(item) : null;
  }

  Future<LibraryItem> upsert(
    String mangaId, {
    String status = 'READING',
    bool isFavorite = false,
    String? lastChapterId,
  }) async {
    final payload = await _api.post('/library/$mangaId', {
      'status': status,
      'isFavorite': isFavorite,
      if (lastChapterId != null) 'lastChapterId': lastChapterId,
    }, (json) => json);
    return LibraryItem.fromJson(payload['item'] as Map<String, dynamic>);
  }

  Future<void> remove(String mangaId) =>
      _api.delete('/library/$mangaId', (json) => json);

  Future<MangaProgressPayload> mangaProgress(String mangaId) {
    return _api.get('/progress/manga/$mangaId', MangaProgressPayload.fromJson);
  }

  Future<ReadingProgress> saveProgress(
    String chapterId, {
    required String mangaId,
    required int pageIndex,
    required bool completed,
  }) async {
    final payload = await _api.put('/progress/$chapterId', {
      'mangaId': mangaId,
      'pageIndex': pageIndex,
      'completed': completed,
    }, (json) => json);
    return ReadingProgress.fromJson(
      payload['progress'] as Map<String, dynamic>,
    );
  }
}

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
