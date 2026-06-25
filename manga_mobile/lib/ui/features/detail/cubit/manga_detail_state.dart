import '../../../../domain/models/models.dart';
import '../utils/manga_detail_formatters.dart';

class MangaDetailState {
  const MangaDetailState({
    required this.mangaId,
    required this.chapters,
    required this.languages,
    required this.selectedGroups,
    required this.chapterSearch,
    required this.sort,
    required this.chapterOffset,
    required this.chapterTotal,
    required this.loading,
    required this.loadingMore,
    this.manga,
    this.libraryItem,
    this.progress,
    this.error,
    this.notice,
  });

  factory MangaDetailState.initial(String mangaId) {
    return MangaDetailState(
      mangaId: mangaId,
      chapters: const [],
      languages: const ['vi', 'en'],
      selectedGroups: const {},
      chapterSearch: '',
      sort: 'newest',
      chapterOffset: 0,
      chapterTotal: 0,
      loading: true,
      loadingMore: false,
    );
  }

  final String mangaId;

  final MangaSummary? manga;
  final LibraryItem? libraryItem;
  final MangaProgressPayload? progress;

  final List<ChapterSummary> chapters;
  final List<String> languages;
  final Set<String> selectedGroups;

  final String chapterSearch;
  final String sort;

  final int chapterOffset;
  final int chapterTotal;

  final bool loading;
  final bool loadingMore;

  final String? error;
  final String? notice;

  bool get canLoadMore => chapterOffset < chapterTotal;

  bool get hasChapterFilters {
    return chapterSearch.trim().isNotEmpty ||
        selectedGroups.isNotEmpty ||
        languages.length != 2 ||
        sort != 'newest';
  }

  List<ChapterSummary> get visibleChapters {
    final needle = chapterSearch.trim().toLowerCase();

    final filtered = chapters
        .where((chapter) {
          if (needle.isEmpty) return true;

          return [chapter.chapter, chapter.title].whereType<String>().any(
            (value) => value.toLowerCase().contains(needle),
          );
        })
        .where((chapter) {
          if (selectedGroups.isEmpty) return true;

          final group = chapter.scanlationGroup;
          return group != null && selectedGroups.contains(group);
        })
        .toList();

    filtered.sort((a, b) {
      final byNumber = chapterValue(a).compareTo(chapterValue(b));
      final byDate = a.publishAt.compareTo(b.publishAt);
      final result = byNumber == 0 ? byDate : byNumber;

      return sort == 'oldest' ? result : -result;
    });

    return filtered;
  }

  DateTime? get latestPublishAt {
    if (chapters.isEmpty) return null;

    return chapters
        .map((chapter) => chapter.publishAt)
        .reduce((a, b) => a.isAfter(b) ? a : b);
  }

  List<String> get groups {
    final values = chapters
        .map((chapter) => chapter.scanlationGroup)
        .whereType<String>()
        .where((group) => group.trim().isNotEmpty)
        .toSet()
        .toList();

    values.sort();
    return values;
  }

  ChapterSummary? get continueChapter {
    final progressChapterId = progress?.progress?.chapterId;

    if (progressChapterId != null) {
      for (final chapter in visibleChapters) {
        if (chapter.id == progressChapterId) {
          return chapter;
        }
      }
    }

    return progress?.chapter;
  }

  static const _unset = Object();

  MangaDetailState copyWith({
    MangaSummary? manga,
    Object? libraryItem = _unset,
    Object? progress = _unset,
    List<ChapterSummary>? chapters,
    List<String>? languages,
    Set<String>? selectedGroups,
    String? chapterSearch,
    String? sort,
    int? chapterOffset,
    int? chapterTotal,
    bool? loading,
    bool? loadingMore,
    Object? error = _unset,
    Object? notice = _unset,
  }) {
    return MangaDetailState(
      mangaId: mangaId,
      manga: manga ?? this.manga,
      libraryItem: libraryItem == _unset
          ? this.libraryItem
          : libraryItem as LibraryItem?,
      progress: progress == _unset
          ? this.progress
          : progress as MangaProgressPayload?,
      chapters: chapters ?? this.chapters,
      languages: languages ?? this.languages,
      selectedGroups: selectedGroups ?? this.selectedGroups,
      chapterSearch: chapterSearch ?? this.chapterSearch,
      sort: sort ?? this.sort,
      chapterOffset: chapterOffset ?? this.chapterOffset,
      chapterTotal: chapterTotal ?? this.chapterTotal,
      loading: loading ?? this.loading,
      loadingMore: loadingMore ?? this.loadingMore,
      error: error == _unset ? this.error : error as String?,
      notice: notice == _unset ? this.notice : notice as String?,
    );
  }
}
