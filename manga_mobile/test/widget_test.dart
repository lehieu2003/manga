import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:manga_mobile/data/repositories/repositories.dart';
import 'package:manga_mobile/data/services/api_client.dart';
import 'package:manga_mobile/domain/models/models.dart';
import 'package:manga_mobile/main.dart';
import 'package:manga_mobile/ui/app_state.dart';
import 'package:manga_mobile/ui/core/theme.dart';
import 'package:manga_mobile/ui/features/detail/manga_detail_screen.dart';
import 'package:manga_mobile/ui/features/reader/reader_screen.dart';

void main() {
  testWidgets('search supports discovery and genre routes with clear filters', (
    tester,
  ) async {
    final app = _buildApp();
    await tester.pumpWidget(MyApp(appState: app));
    await tester.pumpAndSettle();

    await tester.tap(find.text('View all'));
    await tester.pumpAndSettle();

    expect(find.text('Popular manga'), findsOneWidget);
    expect(find.text('Popular'), findsWidgets);

    await tester.tap(find.text('Home'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Action 3'),
      120,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Action 3'));
    await tester.pumpAndSettle();

    expect(find.text('Genre: Action'), findsOneWidget);
    await tester.drag(find.byType(ListView), const Offset(0, -520));
    await tester.pumpAndSettle();
    expect(find.text('Include: Action'), findsOneWidget);

    await tester.tap(find.text('Clear filters'));
    await tester.pumpAndSettle();

    expect(find.text('Include: Action'), findsNothing);
  });

  testWidgets('library shows summaries, clears filters, and updates actions', (
    tester,
  ) async {
    final app = _buildApp(signedIn: true);
    await tester.pumpWidget(MyApp(appState: app));
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.library_books_outlined));
    await tester.pumpAndSettle();

    expect(find.text('Reading'), findsWidgets);
    expect(find.text('2 shown'), findsWidgets);

    await tester.enterText(find.byType(TextField).first, 'beta');
    await tester.pumpAndSettle();
    expect(find.text('Search: beta'), findsOneWidget);
    expect(find.text('1 shown'), findsWidgets);

    await tester.tap(find.text('Clear filters'));
    await tester.pumpAndSettle();
    expect(find.text('Search: beta'), findsNothing);

    await tester.drag(find.byType(ListView), const Offset(0, -220));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Favorite').first, warnIfMissed: false);
    await tester.pumpAndSettle();
  });

  testWidgets('detail page shows continue card and chapter filter metadata', (
    tester,
  ) async {
    final app = _buildApp(signedIn: true);
    await tester.pumpWidget(
      _screenHost(app, const MangaDetailScreen(mangaId: 'manga-1')),
    );
    await tester.pumpAndSettle();

    expect(find.text('Continue Reading'), findsOneWidget);
    expect(find.text('Chapters (2)'), findsOneWidget);
    expect(find.text('2 languages'), findsOneWidget);
    expect(find.text('Current'), findsWidgets);
    expect(find.text('Read'), findsWidgets);
    await tester.scrollUntilVisible(
      find.text('NEW'),
      120,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('NEW'), findsOneWidget);
    expect(find.text('Group A'), findsOneWidget);
  });

  testWidgets(
    'reader exposes mode controls and missing manga context message',
    (tester) async {
      final app = _buildApp(signedIn: true);
      await tester.pumpWidget(
        AppScope(
          appState: app,
          child: MaterialApp(
            theme: MangaTheme.dark(),
            home: const ReaderScreen(chapterId: 'chapter-1'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.text('Chapter navigation needs manga context.'),
        findsOneWidget,
      );

      await tester.tap(find.byTooltip('Paged mode'));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Vertical mode'), findsOneWidget);
    },
  );

  testWidgets('settings validates password confirmation with snackbar', (
    tester,
  ) async {
    final app = _buildApp(signedIn: true);
    await tester.pumpWidget(MyApp(appState: app));
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.person_outline));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextField, 'New password'),
      '12345678',
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'Confirm new password'),
      '87654321',
    );
    await tester.drag(find.byType(ListView), const Offset(0, -420));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Change password'));
    await tester.pumpAndSettle();

    expect(
      find.text('New password confirmation does not match.'),
      findsWidgets,
    );
  });
}

TestAppState _buildApp({bool signedIn = false}) {
  final api = ApiClient(baseUrl: 'http://localhost:4000/api');
  final user = _user();
  final app = TestAppState(
    authRepository: FakeAuthRepository(api, user),
    catalogRepository: FakeCatalogRepository(api),
    libraryRepository: FakeLibraryRepository(api),
  )..isBooting = false;
  if (signedIn) app.user = user;
  return app;
}

Widget _screenHost(AppState app, Widget child) {
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
  });
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
    String sort = 'relevance',
  }) async {
    final data = _manga
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
      _manga.firstWhere((manga) => manga.id == id);

  @override
  Future<Paginated<ChapterSummary>> chapters(
    String mangaId, {
    int limit = 100,
    int offset = 0,
    List<String> translatedLanguage = const ['vi', 'en'],
  }) async {
    final chapters = _chapters
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
    pageUrls: ['/page-1.jpg', '/page-2.jpg'],
    dataSaverPageUrls: ['/page-1.jpg', '/page-2.jpg'],
  );
}

class FakeLibraryRepository extends LibraryRepository {
  FakeLibraryRepository(super.api);

  final List<LibraryItem> _items = [
    _libraryItem(
      id: 'library-1',
      manga: _manga[0],
      isFavorite: true,
      progress: _progress(chapterId: 'chapter-1', pageIndex: 0),
    ),
    _libraryItem(id: 'library-2', manga: _manga[1]),
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
    final updated = _libraryItem(
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
        progress: _progress(chapterId: 'chapter-1', pageIndex: 0),
        chaptersProgress: [
          _progress(chapterId: 'chapter-1', pageIndex: 0),
          _progress(chapterId: 'chapter-2', pageIndex: 4, completed: true),
        ],
        chapter: _chapters.first,
      );

  @override
  Future<ReadingProgress> saveProgress(
    String chapterId, {
    required String mangaId,
    required int pageIndex,
    required bool completed,
  }) async => _progress(
    chapterId: chapterId,
    pageIndex: pageIndex,
    completed: completed,
  );
}

final _now = DateTime(2026, 6, 10);

final _manga = [
  MangaSummary(
    id: 'manga-1',
    title: 'Alpha Manga',
    altTitles: const ['Alpha Alt'],
    description: 'A test manga.',
    tags: const ['Action', 'Drama'],
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
    status: 'completed',
    year: 2025,
    contentRating: 'safe',
  ),
];

final _chapters = [
  ChapterSummary(
    id: 'chapter-1',
    translatedLanguage: 'en',
    publishAt: _now,
    pages: 2,
    chapter: '1',
    title: 'Start',
    scanlationGroup: 'Group A',
  ),
  ChapterSummary(
    id: 'chapter-2',
    translatedLanguage: 'vi',
    publishAt: _now.subtract(const Duration(days: 1)),
    pages: 5,
    chapter: '2',
    title: 'Next',
    scanlationGroup: 'Group B',
  ),
];

User _user() => User(
  id: 'user-1',
  email: 'reader@example.com',
  displayName: 'Reader',
  createdAt: _now,
);

LibraryItem _libraryItem({
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
  lastReadAt: _now,
  createdAt: _now,
  updatedAt: _now,
  manga: manga,
  readingProgress: progress,
);

ReadingProgress _progress({
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
  createdAt: _now,
  updatedAt: _now,
);
