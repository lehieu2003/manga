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
    reactionCounts: (json['reactionCounts'] as Map<String, dynamic>? ?? {}).map(
      (key, value) =>
          MapEntry(key, value is int ? value : int.tryParse('$value') ?? 0),
    ),
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
