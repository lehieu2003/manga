import '../../../../domain/models/models.dart';

class ReaderState {
  const ReaderState({
    required this.chapterId,
    required this.mangaId,
    required this.pages,
    required this.chapters,
    required this.pageIndex,
    required this.paged,
    required this.contain,
    required this.dataSaver,
    required this.loading,
    this.reader,
    this.progress,
    this.error,
  });

  factory ReaderState.initial({
    required String chapterId,
    required String? mangaId,
  }) {
    return ReaderState(
      chapterId: chapterId,
      mangaId: mangaId,
      pages: const [],
      chapters: const [],
      pageIndex: 0,
      paged: false,
      contain: false,
      dataSaver: true,
      loading: true,
    );
  }

  final String chapterId;
  final String? mangaId;

  final List<String> pages;
  final List<ChapterSummary> chapters;
  final MangaProgressPayload? progress;
  final ReaderPayload? reader;

  final int pageIndex;
  final bool paged;
  final bool contain;
  final bool dataSaver;

  final bool loading;
  final String? error;

  bool get hasPages => pages.isNotEmpty;

  int get displayPageNumber => pages.isEmpty ? 0 : pageIndex + 1;

  bool get isCompleted => pages.isNotEmpty && pageIndex >= pages.length - 1;

  static const _unset = Object();

  ReaderState copyWith({
    List<String>? pages,
    List<ChapterSummary>? chapters,
    int? pageIndex,
    bool? paged,
    bool? contain,
    bool? dataSaver,
    bool? loading,
    Object? reader = _unset,
    Object? progress = _unset,
    Object? error = _unset,
  }) {
    return ReaderState(
      chapterId: chapterId,
      mangaId: mangaId,
      pages: pages ?? this.pages,
      chapters: chapters ?? this.chapters,
      pageIndex: pageIndex ?? this.pageIndex,
      paged: paged ?? this.paged,
      contain: contain ?? this.contain,
      dataSaver: dataSaver ?? this.dataSaver,
      loading: loading ?? this.loading,
      reader: reader == _unset ? this.reader : reader as ReaderPayload?,
      progress: progress == _unset
          ? this.progress
          : progress as MangaProgressPayload?,
      error: error == _unset ? this.error : error as String?,
    );
  }
}
