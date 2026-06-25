import '../../../../domain/models/models.dart';
import '../utils/library_formatters.dart';

class LibraryState {
  const LibraryState({
    required this.items,
    required this.loading,
    required this.query,
    required this.tab,
    required this.sort,
    this.error,
    this.notice,
  });

  factory LibraryState.initial() {
    return const LibraryState(
      items: [],
      loading: true,
      query: '',
      tab: 'READING',
      sort: 'lastRead',
    );
  }

  final List<LibraryItem> items;
  final bool loading;
  final String query;
  final String tab;
  final String sort;
  final String? error;
  final String? notice;

  bool get hasActiveFilters => query.trim().isNotEmpty || sort != 'lastRead';

  List<LibraryItem> get visibleItems {
    final needle = query.trim().toLowerCase();

    final tabbed = tab == 'FAVORITES'
        ? items.where((item) => item.isFavorite)
        : items.where((item) => item.status == tab);

    final filtered = tabbed.where((item) {
      if (needle.isEmpty) return true;

      final values = [
        item.manga?.title,
        item.status,
        item.manga?.status,
        ...?item.manga?.tags,
      ];

      return values.whereType<String>().any(
        (value) => value.toLowerCase().contains(needle),
      );
    }).toList();

    filtered.sort((a, b) {
      if (sort == 'title') return libraryTitle(a).compareTo(libraryTitle(b));

      if (sort == 'status') return a.status.compareTo(b.status);

      if (sort == 'favorite') {
        final byFavorite = (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
        if (byFavorite != 0) return byFavorite;
        return libraryActivityTime(b).compareTo(libraryActivityTime(a));
      }

      if (sort == 'updated') return b.updatedAt.compareTo(a.updatedAt);

      return libraryActivityTime(b).compareTo(libraryActivityTime(a));
    });

    return filtered;
  }

  static const _unset = Object();

  LibraryState copyWith({
    List<LibraryItem>? items,
    bool? loading,
    String? query,
    String? tab,
    String? sort,
    Object? error = _unset,
    Object? notice = _unset,
  }) {
    return LibraryState(
      items: items ?? this.items,
      loading: loading ?? this.loading,
      query: query ?? this.query,
      tab: tab ?? this.tab,
      sort: sort ?? this.sort,
      error: error == _unset ? this.error : error as String?,
      notice: notice == _unset ? this.notice : notice as String?,
    );
  }
}
