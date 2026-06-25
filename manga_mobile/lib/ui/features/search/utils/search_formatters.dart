import '../search_discovery_preset.dart';

String defaultSearchSort(DiscoveryPreset preset) {
  return switch (preset) {
    DiscoveryPreset.popular => 'followed',
    DiscoveryPreset.latest => 'latest',
    DiscoveryPreset.search => 'relevance',
  };
}

String searchTitle({
  required DiscoveryPreset preset,
  required String? routeGenre,
}) {
  if (routeGenre != null && routeGenre.isNotEmpty) {
    return 'Genre: ${Uri.decodeComponent(routeGenre)}';
  }

  return switch (preset) {
    DiscoveryPreset.popular => 'Popular manga',
    DiscoveryPreset.latest => 'Latest updates',
    DiscoveryPreset.search => 'Search MangaDex',
  };
}

String searchSortLabel(String sort) {
  return switch (sort) {
    'latest' => 'Latest',
    'followed' => 'Popular',
    'title' => 'Title A-Z',
    'created' => 'Created newest',
    'updated' => 'Updated newest',
    _ => 'Relevance',
  };
}

bool sameStringSet(List<String> left, List<String> right) {
  return left.length == right.length && left.toSet().containsAll(right);
}
