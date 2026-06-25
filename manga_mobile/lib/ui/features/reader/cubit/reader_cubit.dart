import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../data/repositories/repositories.dart';
import '../../../../data/services/reader_settings_store.dart';
import '../../../../domain/models/models.dart';
import '../utils/reader_formatters.dart';
import 'reader_state.dart';

class ReaderCubit extends Cubit<ReaderState> {
  ReaderCubit({
    required this.chapterId,
    required this.mangaId,
    required this.catalogRepository,
    required this.libraryRepository,
    required this.readerSettingsStore,
    required this.isSignedIn,
    required this.assetUrl,
  }) : super(ReaderState.initial(chapterId: chapterId, mangaId: mangaId));

  final String chapterId;
  final String? mangaId;

  final CatalogRepository catalogRepository;
  final LibraryRepository libraryRepository;
  final ReaderSettingsStore readerSettingsStore;

  final bool isSignedIn;
  final String Function(String? url) assetUrl;

  Timer? _saveTimer;

  Future<void> load() async {
    emit(state.copyWith(loading: true, error: null));

    try {
      final settings = await readerSettingsStore.readSettings();

      final reader = await catalogRepository.reader(chapterId);

      final pages = _buildPages(reader: reader, dataSaver: settings.dataSaver);

      var pageIndex = 0;
      List<ChapterSummary> chapters = const [];
      MangaProgressPayload? progress;

      if (mangaId != null) {
        final results = await Future.wait<Object?>([
          catalogRepository.chapters(mangaId!),
          if (isSignedIn)
            libraryRepository.mangaProgress(mangaId!)
          else
            Future.value(null),
        ]);

        chapters = [...(results[0] as Paginated<ChapterSummary>).data]
          ..sort(compareChapters);

        progress = results[1] as MangaProgressPayload?;

        if (progress?.progress?.chapterId == chapterId) {
          pageIndex = _clampPageIndex(progress!.progress!.pageIndex, pages);
        }
      }

      emit(
        state.copyWith(
          reader: reader,
          pages: pages,
          chapters: chapters,
          progress: progress,
          pageIndex: pageIndex,
          paged: settings.paged,
          contain: settings.contain,
          dataSaver: settings.dataSaver,
          loading: false,
          error: null,
        ),
      );
    } catch (error) {
      emit(state.copyWith(loading: false, error: error.toString()));
    }
  }

  void toggleQuality() {
    final reader = state.reader;
    if (reader == null) return;

    final nextDataSaver = !state.dataSaver;

    final pages = _buildPages(reader: reader, dataSaver: nextDataSaver);

    emit(
      state.copyWith(
        dataSaver: nextDataSaver,
        pages: pages,
        pageIndex: _clampPageIndex(state.pageIndex, pages),
      ),
    );

    _saveReaderSettings();
  }

  void togglePaged() {
    emit(state.copyWith(paged: !state.paged));

    _saveReaderSettings();
  }

  void toggleContain() {
    emit(state.copyWith(contain: !state.contain));

    _saveReaderSettings();
  }

  void setPage(int index) {
    if (state.pages.isEmpty) return;

    emit(state.copyWith(pageIndex: _clampPageIndex(index, state.pages)));

    _scheduleSave();
  }

  Future<void> saveProgress() async {
    if (!isSignedIn || mangaId == null || state.pages.isEmpty) return;

    await libraryRepository.saveProgress(
      chapterId,
      mangaId: mangaId!,
      pageIndex: state.pageIndex,
      completed: state.isCompleted,
    );
  }

  void _scheduleSave() {
    _saveTimer?.cancel();
    _saveTimer = Timer(const Duration(milliseconds: 900), saveProgress);
  }

  void _saveReaderSettings() {
    unawaited(
      readerSettingsStore.saveSettings(
        ReaderSettings(
          paged: state.paged,
          contain: state.contain,
          dataSaver: state.dataSaver,
        ),
      ),
    );
  }

  List<String> _buildPages({
    required ReaderPayload reader,
    required bool dataSaver,
  }) {
    final urls = dataSaver ? reader.dataSaverPageUrls : reader.pageUrls;

    return urls.map(assetUrl).where((url) => url.isNotEmpty).toList();
  }

  int _clampPageIndex(int index, List<String> pages) {
    if (pages.isEmpty) return 0;

    return index.clamp(0, pages.length - 1);
  }

  @override
  Future<void> close() async {
    _saveTimer?.cancel();
    await saveProgress();
    return super.close();
  }
}
