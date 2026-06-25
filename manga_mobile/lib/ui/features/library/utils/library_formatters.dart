import '../../../../domain/models/models.dart';

String libraryTitle(LibraryItem item) {
  return item.manga?.title ?? item.mangaId;
}

DateTime libraryActivityTime(LibraryItem item) {
  return item.readingProgress?.updatedAt ?? item.lastReadAt ?? item.updatedAt;
}

String formatLibraryDate(DateTime date) {
  final month = date.month.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');

  return '${date.year}-$month-$day';
}

String libraryTabLabel(String tab) {
  return switch (tab) {
    'FAVORITES' => 'Favorites',
    'PLAN_TO_READ' => 'Plan to read',
    'COMPLETED' => 'Completed',
    'PAUSED' => 'Paused',
    'DROPPED' => 'Dropped',
    _ => 'Reading',
  };
}

String librarySortLabel(String sort) {
  return switch (sort) {
    'updated' => 'Recently updated',
    'title' => 'Title A-Z',
    'status' => 'Status',
    'favorite' => 'Favorite first',
    _ => 'Last read',
  };
}
