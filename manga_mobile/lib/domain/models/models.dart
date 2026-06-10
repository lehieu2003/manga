class User {
  const User({
    required this.id,
    required this.email,
    required this.displayName,
    required this.createdAt,
    this.avatarUrl,
  });

  final String id;
  final String email;
  final String displayName;
  final String? avatarUrl;
  final DateTime createdAt;

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json['id'] as String,
    email: json['email'] as String,
    displayName: json['displayName'] as String,
    avatarUrl: json['avatarUrl'] as String?,
    createdAt:
        DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
  );
}

class MangaSummary {
  const MangaSummary({
    required this.id,
    required this.title,
    required this.altTitles,
    required this.description,
    required this.tags,
    this.authors = const [],
    this.artists = const [],
    this.status,
    this.year,
    this.contentRating,
    this.coverUrl,
  });

  final String id;
  final String title;
  final List<String> altTitles;
  final String description;
  final String? status;
  final int? year;
  final String? contentRating;
  final List<String> tags;
  final List<String> authors;
  final List<String> artists;
  final String? coverUrl;

  factory MangaSummary.fromJson(Map<String, dynamic> json) => MangaSummary(
    id: json['id'] as String,
    title: json['title']?.toString() ?? 'Untitled manga',
    altTitles: _stringList(json['altTitles']),
    description: json['description']?.toString() ?? '',
    status: json['status'] as String?,
    year: json['year'] is int
        ? json['year'] as int
        : int.tryParse('${json['year']}'),
    contentRating: json['contentRating'] as String?,
    tags: _stringList(json['tags']),
    authors: _stringList(json['authors']),
    artists: _stringList(json['artists']),
    coverUrl: json['coverUrl'] as String?,
  );
}

class GenreSummary {
  const GenreSummary({
    required this.name,
    required this.count,
    this.id,
    this.group,
    this.aliases = const [],
  });

  final String? id;
  final String name;
  final String? group;
  final List<String> aliases;
  final int count;

  factory GenreSummary.fromJson(Map<String, dynamic> json) => GenreSummary(
    id: json['id'] as String?,
    name: json['name']?.toString() ?? '',
    group: json['group'] as String?,
    aliases: _stringList(json['aliases']),
    count: json['count'] is int
        ? json['count'] as int
        : int.tryParse('${json['count']}') ?? 0,
  );
}

class ChapterSummary {
  const ChapterSummary({
    required this.id,
    required this.translatedLanguage,
    required this.publishAt,
    required this.pages,
    this.title,
    this.chapter,
    this.volume,
    this.scanlationGroup,
  });

  final String id;
  final String? title;
  final String? chapter;
  final String? volume;
  final String translatedLanguage;
  final DateTime publishAt;
  final int pages;
  final String? scanlationGroup;

  factory ChapterSummary.fromJson(Map<String, dynamic> json) => ChapterSummary(
    id: json['id'] as String,
    title: json['title'] as String?,
    chapter: json['chapter'] as String?,
    volume: json['volume'] as String?,
    translatedLanguage: json['translatedLanguage']?.toString() ?? 'en',
    publishAt:
        DateTime.tryParse(json['publishAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    pages: json['pages'] is int
        ? json['pages'] as int
        : int.tryParse('${json['pages']}') ?? 0,
    scanlationGroup: json['scanlationGroup'] as String?,
  );
}

class Paginated<T> {
  const Paginated({
    required this.data,
    required this.limit,
    required this.offset,
    required this.total,
    this.source,
  });

  final List<T> data;
  final int limit;
  final int offset;
  final int total;
  final String? source;
}

class ReaderPayload {
  const ReaderPayload({
    required this.pageUrls,
    required this.dataSaverPageUrls,
  });

  final List<String> pageUrls;
  final List<String> dataSaverPageUrls;

  factory ReaderPayload.fromJson(Map<String, dynamic> json) => ReaderPayload(
    pageUrls: _stringList(json['pageUrls']),
    dataSaverPageUrls: _stringList(json['dataSaverPageUrls']),
  );
}

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

List<String> _stringList(Object? value) =>
    (value as List<dynamic>? ?? []).map((item) => item.toString()).toList();
