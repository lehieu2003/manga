import 'package:manga_mobile/data/repositories/repositories.dart';
import 'package:manga_mobile/domain/models/models.dart';

import '../helpers/test_app.dart';

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
