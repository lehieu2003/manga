class User {
  const User({
    required this.id,
    required this.email,
    required this.displayName,
    required this.createdAt,
    this.role = 'USER',
    this.avatarUrl,
  });

  final String id;
  final String email;
  final String displayName;
  final String role;
  final String? avatarUrl;
  final DateTime createdAt;

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json['id'] as String,
    email: json['email'] as String,
    displayName: json['displayName'] as String,
    role: json['role']?.toString() ?? 'USER',
    avatarUrl: json['avatarUrl'] as String?,
    createdAt:
        DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
  );
}

class MangaSummary {
  const MangaSummary({
    required this.id,
    required this.title,
    required this.altTitles,
    required this.description,
    required this.tags,
    this.authors = const [],
    this.artists = const [],
    this.status,
    this.year,
    this.contentRating,
    this.coverUrl,
  });

  final String id;
  final String title;
  final List<String> altTitles;
  final String description;
  final String? status;
  final int? year;
  final String? contentRating;
  final List<String> tags;
  final List<String> authors;
  final List<String> artists;
  final String? coverUrl;

  factory MangaSummary.fromJson(Map<String, dynamic> json) => MangaSummary(
    id: json['id'] as String,
    title: json['title']?.toString() ?? 'Untitled manga',
    altTitles: _stringList(json['altTitles']),
    description: json['description']?.toString() ?? '',
    status: json['status'] as String?,
    year: json['year'] is int
        ? json['year'] as int
        : int.tryParse('${json['year']}'),
    contentRating: json['contentRating'] as String?,
    tags: _stringList(json['tags']),
    authors: _stringList(json['authors']),
    artists: _stringList(json['artists']),
    coverUrl: json['coverUrl'] as String?,
  );
}

class GenreSummary {
  const GenreSummary({
    required this.name,
    required this.count,
    this.id,
    this.group,
    this.aliases = const [],
  });

  final String? id;
  final String name;
  final String? group;
  final List<String> aliases;
  final int count;

  factory GenreSummary.fromJson(Map<String, dynamic> json) => GenreSummary(
    id: json['id'] as String?,
    name: json['name']?.toString() ?? '',
    group: json['group'] as String?,
    aliases: _stringList(json['aliases']),
    count: json['count'] is int
        ? json['count'] as int
        : int.tryParse('${json['count']}') ?? 0,
  );
}

class ChapterSummary {
  const ChapterSummary({
    required this.id,
    required this.translatedLanguage,
    required this.publishAt,
    required this.pages,
    this.title,
    this.chapter,
    this.volume,
    this.scanlationGroup,
  });

  final String id;
  final String? title;
  final String? chapter;
  final String? volume;
  final String translatedLanguage;
  final DateTime publishAt;
  final int pages;
  final String? scanlationGroup;

  factory ChapterSummary.fromJson(Map<String, dynamic> json) => ChapterSummary(
    id: json['id'] as String,
    title: json['title'] as String?,
    chapter: json['chapter'] as String?,
    volume: json['volume'] as String?,
    translatedLanguage: json['translatedLanguage']?.toString() ?? 'en',
    publishAt:
        DateTime.tryParse(json['publishAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    pages: json['pages'] is int
        ? json['pages'] as int
        : int.tryParse('${json['pages']}') ?? 0,
    scanlationGroup: json['scanlationGroup'] as String?,
  );
}

class Paginated<T> {
  const Paginated({
    required this.data,
    required this.limit,
    required this.offset,
    required this.total,
    this.source,
  });

  final List<T> data;
  final int limit;
  final int offset;
  final int total;
  final String? source;
}

class ReaderPayload {
  const ReaderPayload({
    required this.pageUrls,
    required this.dataSaverPageUrls,
  });

  final List<String> pageUrls;
  final List<String> dataSaverPageUrls;

  factory ReaderPayload.fromJson(Map<String, dynamic> json) => ReaderPayload(
    pageUrls: _stringList(json['pageUrls']),
    dataSaverPageUrls: _stringList(json['dataSaverPageUrls']),
  );
}

class ReadingProgress {
  const ReadingProgress({
    required this.id,
    required this.userId,
    required this.mangaId,
    required this.chapterId,
    required this.pageIndex,
    required this.completed,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String userId;
  final String mangaId;
  final String chapterId;
  final int pageIndex;
  final bool completed;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory ReadingProgress.fromJson(Map<String, dynamic> json) =>
      ReadingProgress(
        id: json['id'] as String,
        userId: json['userId'] as String,
        mangaId: json['mangaId'] as String,
        chapterId: json['chapterId'] as String,
        pageIndex: json['pageIndex'] is int
            ? json['pageIndex'] as int
            : int.tryParse('${json['pageIndex']}') ?? 0,
        completed: json['completed'] == true,
        createdAt:
            DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0),
        updatedAt:
            DateTime.tryParse(json['updatedAt']?.toString() ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0),
      );
}

class LibraryItem {
  const LibraryItem({
    required this.id,
    required this.userId,
    required this.mangaId,
    required this.status,
    required this.isFavorite,
    required this.createdAt,
    required this.updatedAt,
    this.lastChapterId,
    this.lastReadAt,
    this.manga,
    this.readingProgress,
  });

  final String id;
  final String userId;
  final String mangaId;
  final String status;
  final bool isFavorite;
  final String? lastChapterId;
  final DateTime? lastReadAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final MangaSummary? manga;
  final ReadingProgress? readingProgress;

  factory LibraryItem.fromJson(Map<String, dynamic> json) => LibraryItem(
    id: json['id'] as String,
    userId: json['userId'] as String,
    mangaId: json['mangaId'] as String,
    status: json['status']?.toString() ?? 'READING',
    isFavorite: json['isFavorite'] == true,
    lastChapterId: json['lastChapterId'] as String?,
    lastReadAt: DateTime.tryParse(json['lastReadAt']?.toString() ?? ''),
    createdAt:
        DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    updatedAt:
        DateTime.tryParse(json['updatedAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    manga: json['manga'] is Map<String, dynamic>
        ? MangaSummary.fromJson(json['manga'] as Map<String, dynamic>)
        : null,
    readingProgress: json['readingProgress'] is Map<String, dynamic>
        ? ReadingProgress.fromJson(
            json['readingProgress'] as Map<String, dynamic>,
          )
        : null,
  );
}

class MangaProgressPayload {
  const MangaProgressPayload({
    required this.chaptersProgress,
    this.progress,
    this.chapter,
  });

  final ReadingProgress? progress;
  final List<ReadingProgress> chaptersProgress;
  final ChapterSummary? chapter;

  factory MangaProgressPayload.fromJson(Map<String, dynamic> json) =>
      MangaProgressPayload(
        progress: json['progress'] is Map<String, dynamic>
            ? ReadingProgress.fromJson(json['progress'] as Map<String, dynamic>)
            : null,
        chaptersProgress: (json['chaptersProgress'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(ReadingProgress.fromJson)
            .toList(),
        chapter: json['chapter'] is Map<String, dynamic>
            ? ChapterSummary.fromJson(json['chapter'] as Map<String, dynamic>)
            : null,
      );
}

class CommentAuthor {
  const CommentAuthor({
    required this.id,
    required this.displayName,
    required this.role,
    this.avatarUrl,
  });

  final String id;
  final String displayName;
  final String role;
  final String? avatarUrl;

  factory CommentAuthor.fromJson(Map<String, dynamic> json) => CommentAuthor(
    id: json['id'] as String,
    displayName: json['displayName']?.toString() ?? 'Reader',
    role: json['role']?.toString() ?? 'USER',
    avatarUrl: json['avatarUrl'] as String?,
  );
}

class CommentItem {
  const CommentItem({
    required this.id,
    required this.targetType,
    required this.targetId,
    required this.parentId,
    required this.rootId,
    required this.depth,
    required this.content,
    required this.isSpoiler,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.replyCount,
    required this.reactionCounts,
    this.author,
    this.deletedAt,
    this.hiddenAt,
    this.currentUserReaction,
  });

  final String id;
  final String targetType;
  final String targetId;
  final CommentAuthor? author;
  final String? parentId;
  final String? rootId;
  final int depth;
  final String content;
  final bool isSpoiler;
  final String status;
  final DateTime? deletedAt;
  final DateTime? hiddenAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int replyCount;
  final Map<String, int> reactionCounts;
  final String? currentUserReaction;

  bool get isVisible => status == 'VISIBLE';

  factory CommentItem.fromJson(Map<String, dynamic> json) => CommentItem(
    id: json['id'] as String,
    targetType: json['targetType']?.toString() ?? 'MANGA',
    targetId: json['targetId']?.toString() ?? '',
    author: json['author'] is Map<String, dynamic>
        ? CommentAuthor.fromJson(json['author'] as Map<String, dynamic>)
        : null,
    parentId: json['parentId'] as String?,
    rootId: json['rootId'] as String?,
    depth: json['depth'] is int
        ? json['depth'] as int
        : int.tryParse('${json['depth']}') ?? 0,
    content: json['content']?.toString() ?? '',
    isSpoiler: json['isSpoiler'] == true,
    status: json['status']?.toString() ?? 'VISIBLE',
    deletedAt: DateTime.tryParse(json['deletedAt']?.toString() ?? ''),
    hiddenAt: DateTime.tryParse(json['hiddenAt']?.toString() ?? ''),
    createdAt:
        DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    updatedAt:
        DateTime.tryParse(json['updatedAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    replyCount: json['replyCount'] is int
        ? json['replyCount'] as int
        : int.tryParse('${json['replyCount']}') ?? 0,
    reactionCounts: (json['reactionCounts'] as Map<String, dynamic>? ?? {})
        .map((key, value) => MapEntry(key, value is int ? value : int.tryParse('$value') ?? 0)),
    currentUserReaction: json['currentUserReaction'] as String?,
  );
}

class CommentListResponse {
  const CommentListResponse({required this.data, this.nextCursor});

  final List<CommentItem> data;
  final String? nextCursor;

  factory CommentListResponse.fromJson(Map<String, dynamic> json) =>
      CommentListResponse(
        data: (json['data'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(CommentItem.fromJson)
            .toList(),
        nextCursor: json['nextCursor'] as String?,
      );
}

class UserNotification {
  const UserNotification({
    required this.id,
    required this.actor,
    required this.type,
    required this.commentId,
    required this.targetType,
    required this.targetId,
    required this.createdAt,
    this.readAt,
  });

  final String id;
  final CommentAuthor actor;
  final String type;
  final String commentId;
  final String targetType;
  final String targetId;
  final DateTime? readAt;
  final DateTime createdAt;

  factory UserNotification.fromJson(Map<String, dynamic> json) =>
      UserNotification(
        id: json['id'] as String,
        actor: CommentAuthor.fromJson(json['actor'] as Map<String, dynamic>),
        type: json['type']?.toString() ?? 'COMMENT_REPLY',
        commentId: json['commentId']?.toString() ?? '',
        targetType: json['targetType']?.toString() ?? 'MANGA',
        targetId: json['targetId']?.toString() ?? '',
        readAt: DateTime.tryParse(json['readAt']?.toString() ?? ''),
        createdAt:
            DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0),
      );
}

class NotificationListResponse {
  const NotificationListResponse({
    required this.data,
    required this.unreadCount,
  });

  final List<UserNotification> data;
  final int unreadCount;

  factory NotificationListResponse.fromJson(Map<String, dynamic> json) =>
      NotificationListResponse(
        data: (json['data'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(UserNotification.fromJson)
            .toList(),
        unreadCount: json['unreadCount'] is int
            ? json['unreadCount'] as int
            : int.tryParse('${json['unreadCount']}') ?? 0,
      );
}

class ChatSource {
  const ChatSource({
    required this.type,
    required this.id,
    required this.title,
    required this.reason,
    this.coverUrl,
    this.score,
  });

  final String type;
  final String id;
  final String title;
  final String reason;
  final String? coverUrl;
  final double? score;

  factory ChatSource.fromJson(Map<String, dynamic> json) => ChatSource(
    type: json['type']?.toString() ?? 'manga',
    id: json['id'] as String,
    title: json['title']?.toString() ?? 'Source',
    reason: json['reason']?.toString() ?? '',
    coverUrl: json['coverUrl'] as String?,
    score: json['score'] is num ? (json['score'] as num).toDouble() : null,
  );
}

class ChatSuggestedAction {
  const ChatSuggestedAction({
    required this.type,
    required this.label,
    required this.targetId,
  });

  final String type;
  final String label;
  final String targetId;

  factory ChatSuggestedAction.fromJson(Map<String, dynamic> json) =>
      ChatSuggestedAction(
        type: json['type']?.toString() ?? 'open_manga',
        label: json['label']?.toString() ?? 'Open',
        targetId: json['targetId']?.toString() ?? '',
      );
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.createdAt,
    this.sources = const [],
    this.suggestedActions = const [],
  });

  final String id;
  final String role;
  final String content;
  final DateTime createdAt;
  final List<ChatSource> sources;
  final List<ChatSuggestedAction> suggestedActions;

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
    id: json['id'] as String,
    role: json['role']?.toString() ?? 'assistant',
    content: json['content']?.toString() ?? '',
    createdAt:
        DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    sources: (json['sources'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(ChatSource.fromJson)
        .toList(),
    suggestedActions: (json['suggestedActions'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(ChatSuggestedAction.fromJson)
        .toList(),
  );
}

class SendChatMessageResponse {
  const SendChatMessageResponse({
    required this.conversationId,
    required this.message,
  });

  final String conversationId;
  final ChatMessage message;

  factory SendChatMessageResponse.fromJson(Map<String, dynamic> json) =>
      SendChatMessageResponse(
        conversationId: json['conversationId'] as String,
        message: ChatMessage.fromJson(json['message'] as Map<String, dynamic>),
      );
}

List<String> _stringList(Object? value) =>
    (value as List<dynamic>? ?? []).map((item) => item.toString()).toList();
