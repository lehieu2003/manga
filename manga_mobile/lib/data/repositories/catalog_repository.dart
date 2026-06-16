import '../../domain/models/models.dart';
import '../services/api_client.dart';

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
