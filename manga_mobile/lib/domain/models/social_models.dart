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
    required this.subjectType,
    required this.subjectId,
    required this.createdAt,
    this.commentId,
    this.targetType,
    this.targetId,
    this.friendshipId,
    this.conversationId,
    this.messageId,
    this.readAt,
  });

  final String id;
  final CommentAuthor actor;
  final String type;
  final String subjectType;
  final String subjectId;
  final String? commentId;
  final String? targetType;
  final String? targetId;
  final String? friendshipId;
  final String? conversationId;
  final String? messageId;
  final DateTime? readAt;
  final DateTime createdAt;

  factory UserNotification.fromJson(Map<String, dynamic> json) =>
      UserNotification(
        id: json['id'] as String,
        actor: CommentAuthor.fromJson(json['actor'] as Map<String, dynamic>),
        type: json['type']?.toString() ?? 'COMMENT_REPLY',
        subjectType: json['subjectType']?.toString() ?? 'COMMENT',
        subjectId: json['subjectId']?.toString() ?? '',
        commentId: json['commentId'] as String?,
        targetType: json['targetType'] as String?,
        targetId: json['targetId'] as String?,
        friendshipId: json['friendshipId'] as String?,
        conversationId: json['conversationId'] as String?,
        messageId: json['messageId'] as String?,
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

class SocialUser {
  const SocialUser({
    required this.id,
    required this.displayName,
    this.avatarUrl,
  });

  final String id;
  final String displayName;
  final String? avatarUrl;

  factory SocialUser.fromJson(Map<String, dynamic> json) => SocialUser(
    id: json['id']?.toString() ?? '',
    displayName: json['displayName']?.toString() ?? 'Reader',
    avatarUrl: json['avatarUrl'] as String?,
  );
}

class SocialUserSearchResponse {
  const SocialUserSearchResponse({required this.data});

  final List<SocialUser> data;

  factory SocialUserSearchResponse.fromJson(Map<String, dynamic> json) =>
      SocialUserSearchResponse(
        data: (json['data'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(SocialUser.fromJson)
            .toList(),
      );
}

class Friendship {
  const Friendship({
    required this.id,
    required this.userAId,
    required this.userBId,
    required this.requestedById,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.friend,
    this.blockedById,
  });

  final String id;
  final String userAId;
  final String userBId;
  final String requestedById;
  final String? blockedById;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final SocialUser friend;

  factory Friendship.fromJson(Map<String, dynamic> json) => Friendship(
    id: json['id']?.toString() ?? '',
    userAId: json['userAId']?.toString() ?? '',
    userBId: json['userBId']?.toString() ?? '',
    requestedById: json['requestedById']?.toString() ?? '',
    blockedById: json['blockedById'] as String?,
    status: json['status']?.toString() ?? 'PENDING',
    createdAt:
        DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    updatedAt:
        DateTime.tryParse(json['updatedAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    friend: json['friend'] is Map<String, dynamic>
        ? SocialUser.fromJson(json['friend'] as Map<String, dynamic>)
        : const SocialUser(id: '', displayName: 'Reader'),
  );
}

class FriendshipListResponse {
  const FriendshipListResponse({required this.data});

  final List<Friendship> data;

  factory FriendshipListResponse.fromJson(Map<String, dynamic> json) =>
      FriendshipListResponse(
        data: (json['data'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(Friendship.fromJson)
            .toList(),
      );
}

class SocialMember {
  const SocialMember({
    required this.id,
    required this.userId,
    required this.role,
    required this.status,
    required this.joinedAt,
    required this.user,
  });

  final String id;
  final String userId;
  final String role;
  final String status;
  final DateTime joinedAt;
  final SocialUser user;

  factory SocialMember.fromJson(Map<String, dynamic> json) => SocialMember(
    id: json['id']?.toString() ?? '',
    userId: json['userId']?.toString() ?? '',
    role: json['role']?.toString() ?? 'MEMBER',
    status: json['status']?.toString() ?? 'ACTIVE',
    joinedAt:
        DateTime.tryParse(json['joinedAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    user: json['user'] is Map<String, dynamic>
        ? SocialUser.fromJson(json['user'] as Map<String, dynamic>)
        : const SocialUser(id: '', displayName: 'Reader'),
  );
}

class SocialCurrentMember {
  const SocialCurrentMember({
    required this.id,
    required this.role,
    required this.status,
    required this.joinedAt,
    this.lastReadMessageId,
    this.lastReadAt,
    this.mutedUntil,
  });

  final String id;
  final String role;
  final String status;
  final String? lastReadMessageId;
  final DateTime? lastReadAt;
  final DateTime? mutedUntil;
  final DateTime joinedAt;

  factory SocialCurrentMember.fromJson(Map<String, dynamic> json) =>
      SocialCurrentMember(
        id: json['id']?.toString() ?? '',
        role: json['role']?.toString() ?? 'MEMBER',
        status: json['status']?.toString() ?? 'ACTIVE',
        lastReadMessageId: json['lastReadMessageId'] as String?,
        lastReadAt: DateTime.tryParse(json['lastReadAt']?.toString() ?? ''),
        mutedUntil: DateTime.tryParse(json['mutedUntil']?.toString() ?? ''),
        joinedAt:
            DateTime.tryParse(json['joinedAt']?.toString() ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0),
      );
}

class SocialMessage {
  const SocialMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.type,
    required this.createdAt,
    required this.updatedAt,
    this.clientMessageId,
    this.content,
    this.attachments,
    this.replyToId,
    this.deletedAt,
    this.sender,
    this.mangaShare,
    this.reactionCounts = const {},
    this.currentUserReactions = const [],
  });

  final String id;
  final String conversationId;
  final String? senderId;
  final String? clientMessageId;
  final String type;
  final String? content;
  final Object? attachments;
  final String? replyToId;
  final DateTime? deletedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final SocialUser? sender;
  final MangaShareAttachment? mangaShare;
  final Map<String, int> reactionCounts;
  final List<String> currentUserReactions;

  SocialMessage copyWith({
    Map<String, int>? reactionCounts,
    List<String>? currentUserReactions,
  }) {
    return SocialMessage(
      id: id,
      conversationId: conversationId,
      senderId: senderId,
      clientMessageId: clientMessageId,
      type: type,
      content: content,
      attachments: attachments,
      replyToId: replyToId,
      deletedAt: deletedAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
      sender: sender,
      mangaShare: mangaShare,
      reactionCounts: reactionCounts ?? this.reactionCounts,
      currentUserReactions: currentUserReactions ?? this.currentUserReactions,
    );
  }

  factory SocialMessage.fromJson(Map<String, dynamic> json) => SocialMessage(
    id: json['id']?.toString() ?? '',
    conversationId: json['conversationId']?.toString() ?? '',
    senderId: json['senderId'] as String?,
    clientMessageId: json['clientMessageId'] as String?,
    type: json['type']?.toString() ?? 'TEXT',
    content: json['content'] as String?,
    attachments: json['attachments'],
    replyToId: json['replyToId'] as String?,
    deletedAt: DateTime.tryParse(json['deletedAt']?.toString() ?? ''),
    createdAt:
        DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    updatedAt:
        DateTime.tryParse(json['updatedAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    sender: json['sender'] is Map<String, dynamic>
        ? SocialUser.fromJson(json['sender'] as Map<String, dynamic>)
        : null,
    mangaShare: MangaShareAttachment.tryParse(json['attachments']),
    reactionCounts: (json['reactionCounts'] as Map<String, dynamic>? ?? {}).map(
      (key, value) =>
          MapEntry(key, value is int ? value : int.tryParse('$value') ?? 0),
    ),
    currentUserReactions: (json['currentUserReactions'] as List<dynamic>? ?? [])
        .map((item) => item.toString())
        .toList(),
  );
}

class MangaShareAttachment {
  const MangaShareAttachment({required this.manga, this.chapter});

  final MangaShareManga manga;
  final MangaShareChapter? chapter;

  static MangaShareAttachment? tryParse(Object? value) {
    final json = value is Map<String, dynamic>
        ? value
        : value is Map
        ? value.map((key, value) => MapEntry(key.toString(), value))
        : null;
    if (json == null || json['kind'] != 'MANGA_SHARE') return null;
    final mangaJson = json['manga'];
    if (mangaJson is! Map) return null;
    final chapterJson = json['chapter'];
    return MangaShareAttachment(
      manga: MangaShareManga.fromJson(
        mangaJson.map((key, value) => MapEntry(key.toString(), value)),
      ),
      chapter: chapterJson is Map
          ? MangaShareChapter.fromJson(
              chapterJson.map((key, value) => MapEntry(key.toString(), value)),
            )
          : null,
    );
  }
}

class MangaShareManga {
  const MangaShareManga({
    required this.id,
    required this.title,
    this.coverUrl,
    this.status,
    this.year,
    this.contentRating,
    this.tags = const [],
  });

  final String id;
  final String title;
  final String? coverUrl;
  final String? status;
  final int? year;
  final String? contentRating;
  final List<String> tags;

  factory MangaShareManga.fromJson(Map<String, dynamic> json) =>
      MangaShareManga(
        id: json['id']?.toString() ?? '',
        title: json['title']?.toString() ?? 'Untitled manga',
        coverUrl: json['coverUrl'] as String?,
        status: json['status'] as String?,
        year: json['year'] is int
            ? json['year'] as int
            : int.tryParse('${json['year']}'),
        contentRating: json['contentRating'] as String?,
        tags: (json['tags'] as List<dynamic>? ?? [])
            .map((item) => item.toString())
            .toList(),
      );
}

class MangaShareChapter {
  const MangaShareChapter({
    required this.id,
    this.title,
    this.chapter,
    this.translatedLanguage,
    this.pages,
  });

  final String id;
  final String? title;
  final String? chapter;
  final String? translatedLanguage;
  final int? pages;

  factory MangaShareChapter.fromJson(Map<String, dynamic> json) =>
      MangaShareChapter(
        id: json['id']?.toString() ?? '',
        title: json['title'] as String?,
        chapter: json['chapter'] as String?,
        translatedLanguage: json['translatedLanguage'] as String?,
        pages: json['pages'] is int
            ? json['pages'] as int
            : int.tryParse('${json['pages']}'),
      );
}

class SocialConversation {
  const SocialConversation({
    required this.id,
    required this.type,
    required this.createdAt,
    required this.updatedAt,
    required this.members,
    this.title,
    this.avatarUrl,
    this.directKey,
    this.lastMessageAt,
    this.currentMember,
    this.latestMessage,
  });

  final String id;
  final String type;
  final String? title;
  final String? avatarUrl;
  final String? directKey;
  final DateTime? lastMessageAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final SocialCurrentMember? currentMember;
  final List<SocialMember> members;
  final SocialMessage? latestMessage;

  String titleFor(String currentUserId) {
    if (title != null && title!.trim().isNotEmpty) return title!;
    for (final member in members) {
      if (member.userId != currentUserId) return member.user.displayName;
    }
    return 'Conversation';
  }

  factory SocialConversation.fromJson(
    Map<String, dynamic> json,
  ) => SocialConversation(
    id: json['id']?.toString() ?? '',
    type: json['type']?.toString() ?? 'DM',
    title: json['title'] as String?,
    avatarUrl: json['avatarUrl'] as String?,
    directKey: json['directKey'] as String?,
    lastMessageAt: DateTime.tryParse(json['lastMessageAt']?.toString() ?? ''),
    createdAt:
        DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    updatedAt:
        DateTime.tryParse(json['updatedAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    currentMember: json['currentMember'] is Map<String, dynamic>
        ? SocialCurrentMember.fromJson(
            json['currentMember'] as Map<String, dynamic>,
          )
        : null,
    members: (json['members'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(SocialMember.fromJson)
        .toList(),
    latestMessage: json['latestMessage'] is Map<String, dynamic>
        ? SocialMessage.fromJson(json['latestMessage'] as Map<String, dynamic>)
        : null,
  );
}

class SocialConversationListResponse {
  const SocialConversationListResponse({required this.data, this.nextCursor});

  final List<SocialConversation> data;
  final String? nextCursor;

  factory SocialConversationListResponse.fromJson(Map<String, dynamic> json) =>
      SocialConversationListResponse(
        data: (json['data'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(SocialConversation.fromJson)
            .toList(),
        nextCursor: json['nextCursor'] as String?,
      );
}

class SocialMessageListResponse {
  const SocialMessageListResponse({required this.data, this.nextCursor});

  final List<SocialMessage> data;
  final String? nextCursor;

  factory SocialMessageListResponse.fromJson(Map<String, dynamic> json) =>
      SocialMessageListResponse(
        data: (json['data'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(SocialMessage.fromJson)
            .toList(),
        nextCursor: json['nextCursor'] as String?,
      );
}

class IceServer {
  const IceServer({required this.urls, this.username, this.credential});

  final List<String> urls;
  final String? username;
  final String? credential;

  Map<String, dynamic> toJson() => {
    'urls': urls,
    if (username != null) 'username': username,
    if (credential != null) 'credential': credential,
  };

  factory IceServer.fromJson(Map<String, dynamic> json) {
    final rawUrls = json['urls'];
    return IceServer(
      urls: rawUrls is List
          ? rawUrls.map((item) => item.toString()).toList()
          : [
              rawUrls?.toString() ?? '',
            ].where((item) => item.isNotEmpty).toList(),
      username: json['username'] as String?,
      credential: json['credential'] as String?,
    );
  }
}

class SocialCallParticipant {
  const SocialCallParticipant({
    required this.id,
    required this.callId,
    required this.userId,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.joinedAt,
    this.leftAt,
    this.user,
  });

  final String id;
  final String callId;
  final String userId;
  final String status;
  final DateTime? joinedAt;
  final DateTime? leftAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final SocialUser? user;

  factory SocialCallParticipant.fromJson(Map<String, dynamic> json) =>
      SocialCallParticipant(
        id: json['id']?.toString() ?? '',
        callId: json['callId']?.toString() ?? '',
        userId: json['userId']?.toString() ?? '',
        status: json['status']?.toString() ?? 'INVITED',
        joinedAt: DateTime.tryParse(json['joinedAt']?.toString() ?? ''),
        leftAt: DateTime.tryParse(json['leftAt']?.toString() ?? ''),
        createdAt:
            DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0),
        updatedAt:
            DateTime.tryParse(json['updatedAt']?.toString() ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0),
        user: json['user'] is Map<String, dynamic>
            ? SocialUser.fromJson(json['user'] as Map<String, dynamic>)
            : null,
      );
}

class SocialCall {
  const SocialCall({
    required this.id,
    required this.conversationId,
    required this.initiatorId,
    required this.mediaType,
    required this.status,
    required this.startedAt,
    required this.createdAt,
    required this.updatedAt,
    required this.participants,
    this.endedAt,
  });

  final String id;
  final String conversationId;
  final String initiatorId;
  final String mediaType;
  final String status;
  final DateTime startedAt;
  final DateTime? endedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<SocialCallParticipant> participants;

  bool get isVideo => mediaType == 'VIDEO';

  List<String> activePeerIds(String currentUserId) {
    final peers = participants
        .where(
          (participant) =>
              participant.userId != currentUserId &&
              (participant.status == 'INVITED' ||
                  participant.status == 'JOINED'),
        )
        .toList()
      ..sort((a, b) {
        if (a.status == b.status) return 0;
        return a.status == 'JOINED' ? -1 : 1;
      });
    return peers.map((participant) => participant.userId).toList();
  }

  factory SocialCall.fromJson(Map<String, dynamic> json) => SocialCall(
    id: json['id']?.toString() ?? '',
    conversationId: json['conversationId']?.toString() ?? '',
    initiatorId: json['initiatorId']?.toString() ?? '',
    mediaType: json['mediaType']?.toString() ?? 'VIDEO',
    status: json['status']?.toString() ?? 'RINGING',
    startedAt:
        DateTime.tryParse(json['startedAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    endedAt: DateTime.tryParse(json['endedAt']?.toString() ?? ''),
    createdAt:
        DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    updatedAt:
        DateTime.tryParse(json['updatedAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    participants: (json['participants'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(SocialCallParticipant.fromJson)
        .toList(),
  );
}

class SocialCallResponse {
  const SocialCallResponse({required this.call, required this.iceServers});

  final SocialCall call;
  final List<IceServer> iceServers;

  factory SocialCallResponse.fromJson(Map<String, dynamic> json) =>
      SocialCallResponse(
        call: SocialCall.fromJson(json['call'] as Map<String, dynamic>),
        iceServers: (json['iceServers'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(IceServer.fromJson)
            .toList(),
      );
}

class SocialCallHistoryResponse {
  const SocialCallHistoryResponse({required this.data, this.nextCursor});

  final List<SocialCall> data;
  final String? nextCursor;

  factory SocialCallHistoryResponse.fromJson(Map<String, dynamic> json) =>
      SocialCallHistoryResponse(
        data: (json['data'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(SocialCall.fromJson)
            .toList(),
        nextCursor: json['nextCursor'] as String?,
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
