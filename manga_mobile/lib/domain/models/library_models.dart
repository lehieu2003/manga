import 'catalog_models.dart';

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
