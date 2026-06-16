import 'json_helpers.dart';

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
    altTitles: stringList(json['altTitles']),
    description: json['description']?.toString() ?? '',
    status: json['status'] as String?,
    year: json['year'] is int
        ? json['year'] as int
        : int.tryParse('${json['year']}'),
    contentRating: json['contentRating'] as String?,
    tags: stringList(json['tags']),
    authors: stringList(json['authors']),
    artists: stringList(json['artists']),
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
    aliases: stringList(json['aliases']),
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
    pageUrls: stringList(json['pageUrls']),
    dataSaverPageUrls: stringList(json['dataSaverPageUrls']),
  );
}
