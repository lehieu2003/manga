import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../data/repositories/repositories.dart';
import '../../../../domain/models/models.dart';
import 'manga_detail_state.dart';

class MangaDetailCubit extends Cubit<MangaDetailState> {
  MangaDetailCubit({
    required this.mangaId,
    required this.catalogRepository,
    required this.libraryRepository,
    required this.isSignedIn,
  }) : super(MangaDetailState.initial(mangaId));

  final String mangaId;
  final CatalogRepository catalogRepository;
  final LibraryRepository libraryRepository;
  final bool isSignedIn;

  Future<void> load() async {
    emit(state.copyWith(loading: true, error: null, notice: null));

    try {
      final results = await Future.wait<Object?>([
        catalogRepository.manga(mangaId),
        catalogRepository.chapters(
          mangaId,
          translatedLanguage: state.languages,
        ),
        if (isSignedIn) libraryRepository.item(mangaId) else Future.value(null),
        if (isSignedIn)
          libraryRepository.mangaProgress(mangaId)
        else
          Future.value(null),
      ]);

      final manga = results[0] as MangaSummary;
      final chapterPage = results[1] as Paginated<ChapterSummary>;
      final libraryItem = results[2] as LibraryItem?;
      final progress = results[3] as MangaProgressPayload?;

      emit(
        state.copyWith(
          manga: manga,
          chapters: chapterPage.data,
          chapterOffset: chapterPage.offset + chapterPage.limit,
          chapterTotal: chapterPage.total,
          libraryItem: libraryItem,
          progress: progress,
          loading: false,
          error: null,
        ),
      );
    } catch (error) {
      emit(state.copyWith(loading: false, error: error.toString()));
    }
  }

  Future<void> reloadChapters() async {
    emit(
      state.copyWith(
        chapters: const [],
        chapterOffset: 0,
        chapterTotal: 0,
        error: null,
      ),
    );

    try {
      final page = await catalogRepository.chapters(
        mangaId,
        translatedLanguage: state.languages,
      );

      emit(
        state.copyWith(
          chapters: page.data,
          chapterOffset: page.offset + page.limit,
          chapterTotal: page.total,
          error: null,
        ),
      );
    } catch (error) {
      emit(state.copyWith(error: error.toString(), notice: error.toString()));
    }
  }

  Future<void> loadMoreChapters() async {
    if (state.loadingMore || !state.canLoadMore) return;

    emit(state.copyWith(loadingMore: true));

    try {
      final page = await catalogRepository.chapters(
        mangaId,
        offset: state.chapterOffset,
        translatedLanguage: state.languages,
      );

      emit(
        state.copyWith(
          chapters: [...state.chapters, ...page.data],
          chapterOffset: page.offset + page.limit,
          chapterTotal: page.total,
          loadingMore: false,
        ),
      );
    } catch (error) {
      emit(state.copyWith(loadingMore: false, notice: error.toString()));
    }
  }

  Future<void> follow() async {
    if (!isSignedIn) return;

    try {
      final item = await libraryRepository.upsert(
        mangaId,
        status: 'READING',
        isFavorite: true,
      );

      emit(
        state.copyWith(
          libraryItem: item,
          error: null,
          notice: 'Added to library.',
        ),
      );
    } catch (error) {
      emit(state.copyWith(error: error.toString(), notice: error.toString()));
    }
  }

  Future<void> remove() async {
    if (!isSignedIn) return;

    try {
      await libraryRepository.remove(mangaId);

      emit(state.copyWith(libraryItem: null, notice: 'Removed from library.'));
    } catch (error) {
      emit(state.copyWith(notice: error.toString()));
    }
  }

  Future<void> setChapterSearch(String value) async {
    emit(state.copyWith(chapterSearch: value));

    final needle = value.trim();

    if (needle.isEmpty) return;
    if (state.visibleChapters.isNotEmpty) return;
    if (!state.canLoadMore || state.loadingMore) return;

    await loadMoreChapters();
  }

  Future<void> toggleLanguage(String language) async {
    final languages = [...state.languages];

    if (languages.contains(language)) {
      languages.remove(language);
    } else {
      languages.add(language);
    }

    emit(state.copyWith(languages: languages));

    await reloadChapters();
  }

  void toggleGroup(String group) {
    final selectedGroups = {...state.selectedGroups};

    if (selectedGroups.contains(group)) {
      selectedGroups.remove(group);
    } else {
      selectedGroups.add(group);
    }

    emit(state.copyWith(selectedGroups: selectedGroups));
  }

  void setSort(String sort) {
    emit(state.copyWith(sort: sort));
  }

  Future<void> clearChapterFilters() async {
    emit(
      state.copyWith(
        chapterSearch: '',
        languages: const ['vi', 'en'],
        selectedGroups: const {},
        sort: 'newest',
      ),
    );

    await reloadChapters();
  }

  void clearNotice() {
    emit(state.copyWith(notice: null));
  }
}
