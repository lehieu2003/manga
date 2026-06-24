import '../../../domain/models/models.dart';

class HomeState {
  const HomeState({
    this.isLoading = false,
    this.error,
    this.popular = const <MangaSummary>[],
    this.latest = const <MangaSummary>[],
    this.genres = const <GenreSummary>[],
    this.library = const <LibraryItem>[],
    this.continueItems = const <LibraryItem>[],
  });

  final bool isLoading;
  final String? error;
  final List<MangaSummary> popular;
  final List<MangaSummary> latest;
  final List<GenreSummary> genres;
  final List<LibraryItem> library;
  final List<LibraryItem> continueItems;

  bool get hasData => popular.isNotEmpty || latest.isNotEmpty;

  // Sentinel object để phân biệt "không truyền" vs "xoá error"
  static const _keep = Object();

  HomeState copyWith({
    bool? isLoading,
    Object? error = _keep, // dùng sentinel thay vì String?
    List<MangaSummary>? popular,
    List<MangaSummary>? latest,
    List<GenreSummary>? genres,
    List<LibraryItem>? library,
    List<LibraryItem>? continueItems,
  }) {
    return HomeState(
      isLoading: isLoading ?? this.isLoading,
      // Nếu không truyền error → giữ nguyên giá trị cũ
      // Nếu truyền null → xoá error
      // Nếu truyền string → set error mới
      error: error == _keep ? this.error : error as String?,
      popular: popular ?? this.popular,
      latest: latest ?? this.latest,
      genres: genres ?? this.genres,
      library: library ?? this.library,
      continueItems: continueItems ?? this.continueItems,
    );
  }
}
