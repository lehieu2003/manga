import 'package:manga_mobile/data/repositories/repositories.dart';
import 'package:manga_mobile/domain/models/models.dart';

import '../helpers/test_app.dart';

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
