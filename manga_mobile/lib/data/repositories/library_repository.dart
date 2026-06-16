import '../../domain/models/models.dart';
import '../services/api_client.dart';

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
