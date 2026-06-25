import '../../../../domain/models/models.dart';
import '../search_discovery_preset.dart';
import '../utils/search_formatters.dart';

class SearchState {
  const SearchState({
    required this.preset,
    required this.routeGenre,
    required this.genres,
    required this.items,
    required this.included,
    required this.excluded,
    required this.ratings,
    required this.statuses,
    required this.query,
    required this.author,
    required this.artist,
    required this.year,
    required this.sort,
    required this.offset,
    required this.total,
    required this.loading,
    required this.loadingMore,
    this.source,
    this.error,
  });

  factory SearchState.initial({
    required DiscoveryPreset preset,
    required String? routeGenre,
    required String? queryTag,
  }) {
    final decodedRouteGenre = routeGenre == null || routeGenre.isEmpty
        ? null
        : Uri.decodeComponent(routeGenre);

    final included = {
      if (decodedRouteGenre != null && decodedRouteGenre.isNotEmpty)
        decodedRouteGenre,
      if (queryTag != null && queryTag.isNotEmpty) queryTag,
    }.toList();

    return SearchState(
      preset: preset,
      routeGenre: routeGenre,
      genres: const [],
      items: const [],
      included: included,
      excluded: const [],
      ratings: const ['safe', 'suggestive'],
      statuses: const [],
      query: '',
      author: '',
      artist: '',
      year: '',
      sort: defaultSearchSort(preset),
      offset: 0,
      total: 0,
      loading: true,
      loadingMore: false,
    );
  }

  final DiscoveryPreset preset;
  final String? routeGenre;

  final List<GenreSummary> genres;
  final List<MangaSummary> items;

  final List<String> included;
  final List<String> excluded;
  final List<String> ratings;
  final List<String> statuses;

  final String query;
  final String author;
  final String artist;
  final String year;

  final String sort;
  final String? source;

  final int offset;
  final int total;

  final bool loading;
  final bool loadingMore;
  final String? error;

  bool get canLoadMore => offset < total;

  bool get hasActiveFilters {
    return query.trim().isNotEmpty ||
        author.trim().isNotEmpty ||
        artist.trim().isNotEmpty ||
        included.isNotEmpty ||
        excluded.isNotEmpty ||
        statuses.isNotEmpty ||
        year.trim().isNotEmpty ||
        sort != defaultSearchSort(preset) ||
        !sameStringSet(ratings, const ['safe', 'suggestive']);
  }

  static const _unset = Object();

  SearchState copyWith({
    List<GenreSummary>? genres,
    List<MangaSummary>? items,
    List<String>? included,
    List<String>? excluded,
    List<String>? ratings,
    List<String>? statuses,
    String? query,
    String? author,
    String? artist,
    String? year,
    String? sort,
    int? offset,
    int? total,
    bool? loading,
    bool? loadingMore,
    Object? source = _unset,
    Object? error = _unset,
  }) {
    return SearchState(
      preset: preset,
      routeGenre: routeGenre,
      genres: genres ?? this.genres,
      items: items ?? this.items,
      included: included ?? this.included,
      excluded: excluded ?? this.excluded,
      ratings: ratings ?? this.ratings,
      statuses: statuses ?? this.statuses,
      query: query ?? this.query,
      author: author ?? this.author,
      artist: artist ?? this.artist,
      year: year ?? this.year,
      sort: sort ?? this.sort,
      offset: offset ?? this.offset,
      total: total ?? this.total,
      loading: loading ?? this.loading,
      loadingMore: loadingMore ?? this.loadingMore,
      source: source == _unset ? this.source : source as String?,
      error: error == _unset ? this.error : error as String?,
    );
  }
}
