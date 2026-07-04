import 'package:manga_mobile/domain/models/models.dart';

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

SocialCall testCall({
  String id = 'call-1',
  String conversationId = 'conversation-1',
  String initiatorId = 'user-2',
  String mediaType = 'VIDEO',
  String status = 'RINGING',
  bool joined = false,
}) {
  final currentUserJoined = initiatorId == 'user-1' || joined;
  final peerJoined = initiatorId == 'user-2' || joined;
  return SocialCall(
    id: id,
    conversationId: conversationId,
    initiatorId: initiatorId,
    mediaType: mediaType,
    status: status,
    startedAt: testNow,
    createdAt: testNow,
    updatedAt: testNow,
    participants: [
      SocialCallParticipant(
        id: '$id-participant-1',
        callId: id,
        userId: 'user-1',
        status: currentUserJoined ? 'JOINED' : 'INVITED',
        joinedAt: currentUserJoined ? testNow : null,
        createdAt: testNow,
        updatedAt: testNow,
        user: const SocialUser(id: 'user-1', displayName: 'Reader'),
      ),
      SocialCallParticipant(
        id: '$id-participant-2',
        callId: id,
        userId: 'user-2',
        status: peerJoined ? 'JOINED' : 'INVITED',
        joinedAt: peerJoined ? testNow : null,
        createdAt: testNow,
        updatedAt: testNow,
        user: const SocialUser(id: 'user-2', displayName: 'Mina'),
      ),
    ],
  );
}

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
