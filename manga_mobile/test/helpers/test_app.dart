import 'dart:async';

import 'package:flutter/material.dart';
import 'package:manga_mobile/data/repositories/repositories.dart';
import 'package:manga_mobile/data/services/api_client.dart';
import 'package:manga_mobile/data/services/reader_settings_store.dart';
import 'package:manga_mobile/data/services/social_socket_service.dart';
import 'package:manga_mobile/data/services/theme_store.dart';
import 'package:manga_mobile/domain/models/models.dart';
import 'package:manga_mobile/ui/app_state.dart';
import 'package:manga_mobile/ui/core/theme.dart';

TestAppState buildApp({bool signedIn = false}) {
  final api = ApiClient(baseUrl: 'http://localhost:4000/api');
  final user = testUser();
  final app = TestAppState(
    authRepository: FakeAuthRepository(api, user),
    catalogRepository: FakeCatalogRepository(api),
    libraryRepository: FakeLibraryRepository(api),
    commentRepository: FakeCommentRepository(api),
    notificationRepository: FakeNotificationRepository(api),
    socialRepository: FakeSocialRepository(api),
    socialSocketService: FakeSocialSocketService(api),
    chatRepository: FakeChatRepository(api),
    readerSettingsStore: FakeReaderSettingsStore(),
    themeStore: FakeThemeStore(),
  )..isBooting = false;
  if (signedIn) app.user = user;
  return app;
}

Widget screenHost(AppState app, Widget child) {
  return AppScope(
    appState: app,
    child: MaterialApp(theme: MangaTheme.dark(), home: child),
  );
}

class TestAppState extends AppState {
  TestAppState({
    required super.authRepository,
    required super.catalogRepository,
    required super.libraryRepository,
    required super.commentRepository,
    required super.notificationRepository,
    required super.socialRepository,
    required super.socialSocketService,
    required super.chatRepository,
    super.readerSettingsStore,
    super.themeStore,
  });
}

class FakeSocialSocketService extends SocialSocketService {
  FakeSocialSocketService(super.api);

  final _messageNewController =
      StreamController<SocialMessageNewEvent>.broadcast();
  final _messageDeletedController =
      StreamController<SocialMessageDeletedEvent>.broadcast();
  final _readUpdatedController =
      StreamController<SocialReadUpdatedEvent>.broadcast();
  final _typingController = StreamController<SocialTypingEvent>.broadcast();
  final List<String> readMessageIds = [];
  final List<String> typingStarts = [];
  final List<String> typingStops = [];

  @override
  Stream<SocialMessageNewEvent> get messageNew => _messageNewController.stream;

  @override
  Stream<SocialMessageDeletedEvent> get messageDeleted =>
      _messageDeletedController.stream;

  @override
  Stream<SocialReadUpdatedEvent> get readUpdated =>
      _readUpdatedController.stream;

  @override
  Stream<SocialTypingEvent> get typing => _typingController.stream;

  @override
  Future<void> connect() async {}

  @override
  Future<bool> markMessageRead({
    required String conversationId,
    required String lastMessageId,
  }) async {
    readMessageIds.add(lastMessageId);
    return true;
  }

  void emitMessageNew(SocialMessage message) {
    _messageNewController.add(
      SocialMessageNewEvent(
        conversationId: message.conversationId,
        message: message,
      ),
    );
  }

  void emitTyping({
    required String conversationId,
    required SocialUser user,
    required bool typing,
  }) {
    _typingController.add(
      SocialTypingEvent(
        conversationId: conversationId,
        user: user,
        typing: typing,
      ),
    );
  }

  @override
  void emitTypingStart(String conversationId) {
    typingStarts.add(conversationId);
  }

  @override
  void emitTypingStop(String conversationId) {
    typingStops.add(conversationId);
  }

  @override
  Future<void> dispose() async {
    await Future.wait([
      _messageNewController.close(),
      _messageDeletedController.close(),
      _readUpdatedController.close(),
      _typingController.close(),
    ]);
  }
}

class FakeThemeStore extends ThemeStore {
  ThemeMode saved = ThemeMode.system;

  @override
  Future<ThemeMode> readThemeMode() async => saved;

  @override
  Future<void> saveThemeMode(ThemeMode mode) async {
    saved = mode;
  }
}

class FakeReaderSettingsStore extends ReaderSettingsStore {
  ReaderSettings saved = const ReaderSettings();

  @override
  Future<ReaderSettings> readSettings() async => saved;

  @override
  Future<void> saveSettings(ReaderSettings settings) async {
    saved = settings;
  }
}

class FakeAuthRepository extends AuthRepository {
  FakeAuthRepository(super.api, this._user);

  final User _user;

  @override
  Future<User?> restoreSession() async => _user;

  @override
  Future<User> updateProfile({String? displayName, String? avatarUrl}) async =>
      _user;

  @override
  Future<User> uploadAvatar(String filePath) async => _user;

  @override
  Future<User> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async => _user;

  @override
  Future<void> logout() async {}
}

class FakeCatalogRepository extends CatalogRepository {
  FakeCatalogRepository(super.api);

  @override
  String assetUrl(String? url) => url ?? '';

  @override
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
  }) async {
    final data = testManga
        .where(
          (manga) =>
              query == null ||
              query.isEmpty ||
              manga.title.toLowerCase().contains(query.toLowerCase()),
        )
        .where(
          (manga) =>
              includedTags.isEmpty ||
              includedTags.every((tag) => manga.tags.contains(tag)),
        )
        .where(
          (manga) =>
              author == null ||
              author.isEmpty ||
              manga.authors.any(
                (item) => item.toLowerCase().contains(author.toLowerCase()),
              ),
        )
        .where(
          (manga) =>
              artist == null ||
              artist.isEmpty ||
              manga.artists.any(
                (item) => item.toLowerCase().contains(artist.toLowerCase()),
              ),
        )
        .toList();
    return Paginated(
      data: data,
      limit: limit,
      offset: offset,
      total: data.length,
      source: 'cache',
    );
  }

  @override
  Future<List<GenreSummary>> genres() async => const [
    GenreSummary(name: 'Action', count: 3),
    GenreSummary(name: 'Drama', count: 2),
  ];

  @override
  Future<MangaSummary> manga(String id) async =>
      testManga.firstWhere((manga) => manga.id == id);

  @override
  Future<Paginated<ChapterSummary>> chapters(
    String mangaId, {
    int limit = 100,
    int offset = 0,
    List<String> translatedLanguage = const ['vi', 'en'],
  }) async {
    final chapters = testChapters
        .where(
          (chapter) => translatedLanguage.contains(chapter.translatedLanguage),
        )
        .toList();
    return Paginated(
      data: chapters,
      limit: limit,
      offset: offset,
      total: chapters.length,
    );
  }

  @override
  Future<ReaderPayload> reader(String chapterId) async => const ReaderPayload(
    pageUrls: ['/page-1-original.jpg', '/page-2-original.jpg'],
    dataSaverPageUrls: ['/page-1.jpg', '/page-2.jpg'],
  );
}

class FakeLibraryRepository extends LibraryRepository {
  FakeLibraryRepository(super.api);

  final List<LibraryItem> _items = [
    testLibraryItem(
      id: 'library-1',
      manga: testManga[0],
      isFavorite: true,
      progress: testProgress(chapterId: 'chapter-1', pageIndex: 0),
    ),
    testLibraryItem(id: 'library-2', manga: testManga[1]),
  ];

  @override
  Future<List<LibraryItem>> all() async => _items;

  @override
  Future<LibraryItem?> item(String mangaId) async =>
      _items.where((item) => item.mangaId == mangaId).firstOrNull;

  @override
  Future<LibraryItem> upsert(
    String mangaId, {
    String status = 'READING',
    bool isFavorite = false,
    String? lastChapterId,
  }) async {
    final item = _items.firstWhere((item) => item.mangaId == mangaId);
    final updated = testLibraryItem(
      id: item.id,
      manga: item.manga!,
      isFavorite: isFavorite,
      status: status,
      progress: item.readingProgress,
    );
    _items[_items.indexOf(item)] = updated;
    return updated;
  }

  @override
  Future<void> remove(String mangaId) async {
    _items.removeWhere((item) => item.mangaId == mangaId);
  }

  @override
  Future<MangaProgressPayload> mangaProgress(String mangaId) async =>
      MangaProgressPayload(
        progress: testProgress(chapterId: 'chapter-1', pageIndex: 0),
        chaptersProgress: [
          testProgress(chapterId: 'chapter-1', pageIndex: 0),
          testProgress(chapterId: 'chapter-2', pageIndex: 4, completed: true),
        ],
        chapter: testChapters.first,
      );

  @override
  Future<ReadingProgress> saveProgress(
    String chapterId, {
    required String mangaId,
    required int pageIndex,
    required bool completed,
  }) async => testProgress(
    chapterId: chapterId,
    pageIndex: pageIndex,
    completed: completed,
  );
}

class FakeCommentRepository extends CommentRepository {
  FakeCommentRepository(super.api);

  final List<CommentItem> comments = [
    CommentItem(
      id: 'comment-1',
      targetType: 'MANGA',
      targetId: 'manga-1',
      parentId: null,
      rootId: null,
      depth: 0,
      content: 'Great chapter list.',
      isSpoiler: false,
      status: 'VISIBLE',
      createdAt: testNow,
      updatedAt: testNow,
      replyCount: 1,
      reactionCounts: const {'LIKE': 1},
      author: const CommentAuthor(
        id: 'user-1',
        displayName: 'Reader',
        role: 'USER',
      ),
    ),
    CommentItem(
      id: 'comment-2',
      targetType: 'CHAPTER',
      targetId: 'chapter-1',
      parentId: null,
      rootId: null,
      depth: 0,
      content: 'Spoiler comment.',
      isSpoiler: true,
      status: 'VISIBLE',
      createdAt: testNow,
      updatedAt: testNow,
      replyCount: 0,
      reactionCounts: const {},
      author: const CommentAuthor(
        id: 'user-2',
        displayName: 'Other',
        role: 'USER',
      ),
    ),
  ];

  @override
  Future<CommentListResponse> listComments({
    required String targetType,
    required String targetId,
    String? parentId,
    String? cursor,
    int limit = 20,
  }) async {
    return CommentListResponse(
      data: comments
          .where(
            (comment) =>
                comment.targetType == targetType &&
                comment.targetId == targetId &&
                comment.parentId == parentId,
          )
          .toList(),
    );
  }

  @override
  Future<CommentItem> createComment({
    required String targetType,
    required String targetId,
    String? parentId,
    required String content,
    required bool isSpoiler,
  }) async {
    final item = CommentItem(
      id: 'comment-${comments.length + 1}',
      targetType: targetType,
      targetId: targetId,
      parentId: parentId,
      rootId: parentId,
      depth: parentId == null ? 0 : 1,
      content: content,
      isSpoiler: isSpoiler,
      status: 'VISIBLE',
      createdAt: testNow,
      updatedAt: testNow,
      replyCount: 0,
      reactionCounts: const {},
      author: const CommentAuthor(
        id: 'user-1',
        displayName: 'Reader',
        role: 'USER',
      ),
    );
    comments.add(item);
    return item;
  }

  @override
  Future<CommentItem> updateComment(
    String id, {
    String? content,
    bool? isSpoiler,
  }) async {
    return comments.firstWhere((comment) => comment.id == id);
  }

  @override
  Future<CommentItem> deleteComment(String id) async {
    return comments.firstWhere((comment) => comment.id == id);
  }

  @override
  Future<void> setReaction(String id, String type) async {}

  @override
  Future<void> removeReaction(String id) async {}
}

class FakeNotificationRepository extends NotificationRepository {
  FakeNotificationRepository(super.api);

  final List<String> readIds = [];

  @override
  Future<NotificationListResponse> listNotifications({int limit = 30}) async {
    return NotificationListResponse(
      unreadCount: readIds.contains('notification-1') ? 0 : 1,
      data: [
        UserNotification(
          id: 'notification-1',
          actor: const CommentAuthor(
            id: 'user-1',
            displayName: 'Reader',
            role: 'USER',
          ),
          type: 'COMMENT_REPLY',
          subjectType: 'COMMENT',
          subjectId: 'comment-1',
          commentId: 'comment-1',
          targetType: 'MANGA',
          targetId: 'manga-1',
          readAt: readIds.contains('notification-1') ? testNow : null,
          createdAt: testNow,
        ),
      ],
    );
  }

  @override
  Future<void> markRead(String id) async {
    readIds.add(id);
  }

  @override
  Future<void> markAllRead() async {
    readIds.add('notification-1');
  }
}

class FakeSocialRepository extends SocialRepository {
  FakeSocialRepository(super.api);

  final users = const [
    SocialUser(id: 'user-2', displayName: 'Mina'),
    SocialUser(id: 'user-3', displayName: 'Nori'),
    SocialUser(id: 'user-4', displayName: 'Kira'),
  ];

  final List<String> sentRequests = [];
  final List<String> acceptedRequests = [];

  late List<Friendship> friends = [
    Friendship(
      id: 'friendship-1',
      userAId: 'user-1',
      userBId: 'user-2',
      requestedById: 'user-1',
      status: 'ACCEPTED',
      createdAt: testNow,
      updatedAt: testNow,
      friend: users[0],
    ),
  ];

  late List<Friendship> incoming = [
    Friendship(
      id: 'friendship-2',
      userAId: 'user-1',
      userBId: 'user-3',
      requestedById: 'user-3',
      status: 'PENDING',
      createdAt: testNow,
      updatedAt: testNow,
      friend: users[1],
    ),
  ];

  late List<Friendship> sent = [];

  late List<SocialConversation> conversations = [
    SocialConversation(
      id: 'conversation-1',
      type: 'DM',
      directKey: 'user-1:user-2',
      createdAt: testNow,
      updatedAt: testNow,
      lastMessageAt: testNow,
      members: [
        SocialMember(
          id: 'member-1',
          userId: 'user-1',
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: testNow,
          user: const SocialUser(id: 'user-1', displayName: 'Reader'),
        ),
        SocialMember(
          id: 'member-2',
          userId: 'user-2',
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: testNow,
          user: users[0],
        ),
      ],
      latestMessage: SocialMessage(
        id: 'message-1',
        conversationId: 'conversation-1',
        senderId: 'user-2',
        type: 'TEXT',
        content: 'See you at chapter 12',
        createdAt: testNow,
        updatedAt: testNow,
        sender: users[0],
      ),
    ),
  ];

  late List<SocialMessage> messages = [
    SocialMessage(
      id: 'message-2',
      conversationId: 'conversation-1',
      senderId: 'user-1',
      type: 'TEXT',
      content: 'I am caught up',
      createdAt: testNow.add(const Duration(minutes: 1)),
      updatedAt: testNow.add(const Duration(minutes: 1)),
      sender: const SocialUser(id: 'user-1', displayName: 'Reader'),
    ),
    SocialMessage(
      id: 'message-1',
      conversationId: 'conversation-1',
      senderId: 'user-2',
      type: 'TEXT',
      content: 'See you at chapter 12',
      createdAt: testNow,
      updatedAt: testNow,
      sender: users[0],
    ),
  ];

  SocialMessage pushPeerMessage(String content) {
    final message = SocialMessage(
      id: 'message-${messages.length + 1}',
      conversationId: 'conversation-1',
      senderId: 'user-2',
      type: 'TEXT',
      content: content,
      createdAt: testNow.add(Duration(minutes: messages.length + 1)),
      updatedAt: testNow.add(Duration(minutes: messages.length + 1)),
      sender: users[0],
    );
    messages = [message, ...messages];
    return message;
  }

  @override
  Future<SocialUserSearchResponse> searchUsers({
    String? query,
    int limit = 12,
  }) async {
    final needle = query?.toLowerCase() ?? '';
    return SocialUserSearchResponse(
      data: users
          .where((user) => user.displayName.toLowerCase().contains(needle))
          .toList(),
    );
  }

  @override
  Future<FriendshipListResponse> listFriends() async =>
      FriendshipListResponse(data: friends);

  @override
  Future<FriendshipListResponse> listIncomingRequests() async =>
      FriendshipListResponse(data: incoming);

  @override
  Future<FriendshipListResponse> listSentRequests() async =>
      FriendshipListResponse(data: sent);

  @override
  Future<Friendship> sendFriendRequest(String addresseeId) async {
    sentRequests.add(addresseeId);
    final user = users.firstWhere((item) => item.id == addresseeId);
    final friendship = Friendship(
      id: 'friendship-sent',
      userAId: 'user-1',
      userBId: addresseeId,
      requestedById: 'user-1',
      status: 'PENDING',
      createdAt: testNow,
      updatedAt: testNow,
      friend: user,
    );
    sent = [friendship];
    return friendship;
  }

  @override
  Future<(Friendship, SocialConversation)> acceptFriendRequest(
    String friendshipId,
  ) async {
    acceptedRequests.add(friendshipId);
    final friendship = incoming.firstWhere((item) => item.id == friendshipId);
    incoming = [];
    friends = [...friends, friendship];
    return (friendship, conversations.first);
  }

  @override
  Future<Friendship> rejectFriendRequest(String friendshipId) async {
    final friendship = incoming.firstWhere((item) => item.id == friendshipId);
    incoming = incoming.where((item) => item.id != friendshipId).toList();
    return friendship;
  }

  @override
  Future<Friendship> blockFriendship(String friendshipId) async =>
      friends.firstWhere((item) => item.id == friendshipId);

  @override
  Future<Friendship> unfriend(String friendshipId) async {
    final friendship = friends.firstWhere((item) => item.id == friendshipId);
    friends = friends.where((item) => item.id != friendshipId).toList();
    return friendship;
  }

  @override
  Future<SocialConversationListResponse> listConversations({
    int limit = 30,
    String? cursor,
  }) async => SocialConversationListResponse(data: conversations);

  @override
  Future<SocialMessageListResponse> listMessages(
    String conversationId, {
    int limit = 50,
    String? cursor,
  }) async => SocialMessageListResponse(data: messages);

  @override
  Future<SocialMessage> sendMessage({
    required String conversationId,
    required String clientMessageId,
    required String content,
  }) async {
    final message = SocialMessage(
      id: 'message-${messages.length + 1}',
      conversationId: conversationId,
      senderId: 'user-1',
      clientMessageId: clientMessageId,
      type: 'TEXT',
      content: content,
      createdAt: testNow.add(Duration(minutes: messages.length + 1)),
      updatedAt: testNow.add(Duration(minutes: messages.length + 1)),
      sender: const SocialUser(id: 'user-1', displayName: 'Reader'),
    );
    messages = [message, ...messages];
    return message;
  }

  @override
  Future<void> markConversationRead(
    String conversationId,
    String lastMessageId,
  ) async {}
}

class FakeChatRepository extends ChatRepository {
  FakeChatRepository(super.api);

  @override
  Future<SendChatMessageResponse> sendMessage({
    String? conversationId,
    required String message,
    String? mangaId,
    String? chapterId,
  }) async {
    return SendChatMessageResponse(
      conversationId: conversationId ?? 'conversation-1',
      message: ChatMessage(
        id: 'assistant-1',
        role: 'assistant',
        content: 'Try Alpha Manga.',
        createdAt: testNow,
        sources: const [
          ChatSource(
            type: 'manga',
            id: 'manga-1',
            title: 'Alpha Manga',
            reason: 'Matches your prompt.',
          ),
        ],
      ),
    );
  }
}

final testNow = DateTime(2026, 6, 10);

final testManga = [
  MangaSummary(
    id: 'manga-1',
    title: 'Alpha Manga',
    altTitles: const ['Alpha Alt'],
    description: 'A test manga.',
    tags: const ['Action', 'Drama'],
    authors: const ['ONE'],
    artists: const ['Yusuke Murata'],
    status: 'ongoing',
    year: 2026,
    contentRating: 'safe',
  ),
  MangaSummary(
    id: 'manga-2',
    title: 'Beta Manga',
    altTitles: const [],
    description: 'Another test manga.',
    tags: const ['Drama'],
    authors: const ['Kanehito Yamada'],
    artists: const ['Tsukasa Abe'],
    status: 'completed',
    year: 2025,
    contentRating: 'safe',
  ),
];

final testChapters = [
  ChapterSummary(
    id: 'chapter-1',
    translatedLanguage: 'en',
    publishAt: testNow,
    pages: 2,
    chapter: '1',
    title: 'Start',
    scanlationGroup: 'Group A',
  ),
  ChapterSummary(
    id: 'chapter-2',
    translatedLanguage: 'vi',
    publishAt: testNow.subtract(const Duration(days: 1)),
    pages: 5,
    chapter: '2',
    title: 'Next',
    scanlationGroup: 'Group B',
  ),
];

User testUser() => User(
  id: 'user-1',
  email: 'reader@example.com',
  displayName: 'Reader',
  createdAt: testNow,
);

LibraryItem testLibraryItem({
  required String id,
  required MangaSummary manga,
  bool isFavorite = false,
  String status = 'READING',
  ReadingProgress? progress,
}) => LibraryItem(
  id: id,
  userId: 'user-1',
  mangaId: manga.id,
  status: status,
  isFavorite: isFavorite,
  lastChapterId: progress?.chapterId,
  lastReadAt: testNow,
  createdAt: testNow,
  updatedAt: testNow,
  manga: manga,
  readingProgress: progress,
);

ReadingProgress testProgress({
  required String chapterId,
  required int pageIndex,
  bool completed = false,
}) => ReadingProgress(
  id: 'progress-$chapterId',
  userId: 'user-1',
  mangaId: 'manga-1',
  chapterId: chapterId,
  pageIndex: pageIndex,
  completed: completed,
  createdAt: testNow,
  updatedAt: testNow,
);
