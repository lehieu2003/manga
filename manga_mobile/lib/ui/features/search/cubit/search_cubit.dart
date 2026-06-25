import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../data/repositories/repositories.dart';
import '../search_discovery_preset.dart';
import '../utils/search_formatters.dart';
import 'search_state.dart';

class SearchCubit extends Cubit<SearchState> {
  SearchCubit({
    required this.catalogRepository,
    required DiscoveryPreset preset,
    required String? routeGenre,
    required String? queryTag,
  }) : super(
         SearchState.initial(
           preset: preset,
           routeGenre: routeGenre,
           queryTag: queryTag,
         ),
       );

  final CatalogRepository catalogRepository;

  Future<void> initialize() async {
    await Future.wait([load(reset: true), loadGenres()]);
  }

  Future<void> loadGenres() async {
    try {
      final genres = await catalogRepository.genres();

      emit(state.copyWith(genres: genres));
    } catch (_) {
      // Search still works without genre suggestions.
    }
  }

  Future<void> load({required bool reset}) async {
    emit(
      state.copyWith(
        loading: reset ? true : state.loading,
        loadingMore: reset ? false : true,
        offset: reset ? 0 : state.offset,
        error: null,
      ),
    );

    try {
      final parsedYear = int.tryParse(state.year.trim());

      final page = await catalogRepository.searchManga(
        query: state.query.trim().isEmpty ? null : state.query.trim(),
        offset: reset ? 0 : state.offset,
        includedTags: state.included,
        excludedTags: state.excluded,
        contentRating: state.ratings,
        status: state.statuses,
        year: parsedYear,
        author: state.author.trim().isEmpty ? null : state.author.trim(),
        artist: state.artist.trim().isEmpty ? null : state.artist.trim(),
        sort: state.sort,
      );

      emit(
        state.copyWith(
          items: reset ? page.data : [...state.items, ...page.data],
          offset: page.offset + page.limit,
          total: page.total,
          source: page.source,
          loading: false,
          loadingMore: false,
          error: null,
        ),
      );
    } catch (error) {
      emit(
        state.copyWith(
          loading: false,
          loadingMore: false,
          error: error.toString(),
        ),
      );
    }
  }

  void setQuery(String value) {
    emit(state.copyWith(query: value));
  }

  void setAuthor(String value) {
    emit(state.copyWith(author: value));
  }

  void setArtist(String value) {
    emit(state.copyWith(artist: value));
  }

  void setYear(String value) {
    emit(state.copyWith(year: value));
  }

  Future<void> setSort(String value) async {
    emit(state.copyWith(sort: value));
    await load(reset: true);
  }

  Future<void> toggleRating(String rating) async {
    final ratings = [...state.ratings];

    if (ratings.contains(rating) && ratings.length > 1) {
      ratings.remove(rating);
    } else if (!ratings.contains(rating)) {
      ratings.add(rating);
    }

    emit(state.copyWith(ratings: ratings));
    await load(reset: true);
  }

  Future<void> toggleStatus(String status) async {
    final statuses = _toggleValue(state.statuses, status);

    emit(state.copyWith(statuses: statuses));
    await load(reset: true);
  }

  Future<void> toggleIncludedTag(String tag) async {
    final included = _toggleValue(state.included, tag);
    final excluded = [...state.excluded]..remove(tag);

    emit(state.copyWith(included: included, excluded: excluded));

    await load(reset: true);
  }

  Future<void> toggleExcludedTag(String tag) async {
    final excluded = _toggleValue(state.excluded, tag);
    final included = [...state.included]..remove(tag);

    emit(state.copyWith(included: included, excluded: excluded));

    await load(reset: true);
  }

  Future<void> clearFilters() async {
    emit(
      state.copyWith(
        query: '',
        author: '',
        artist: '',
        year: '',
        included: const [],
        excluded: const [],
        statuses: const [],
        ratings: const ['safe', 'suggestive'],
        sort: defaultSearchSort(state.preset),
      ),
    );

    await load(reset: true);
  }

  List<String> _toggleValue(List<String> list, String value) {
    final next = [...list];

    if (next.contains(value)) {
      next.remove(value);
    } else {
      next.add(value);
    }

    return next;
  }
}
