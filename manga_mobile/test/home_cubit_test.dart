import 'package:flutter_test/flutter_test.dart';
import 'package:manga_mobile/domain/models/library_models.dart';
import 'package:manga_mobile/ui/features/home/home_cubit.dart';

void main() {
  group('HomeCubit', () {
    test('sorts continue items by latest activity', () {
      final cubit = HomeCubit();
      final items = [
        _item('1', updatedAt: DateTime(2024, 1, 1)),
        _item('2', lastReadAt: DateTime(2024, 2, 1)),
        _item('3', updatedAt: DateTime(2024, 3, 1)),
      ];

      final sorted = cubit.sortContinueItems(items);

      expect(sorted.map((item) => item.mangaId).toList(), ['3', '2', '1']);
    });
  });
}

LibraryItem _item(String mangaId, {DateTime? updatedAt, DateTime? lastReadAt}) {
  return LibraryItem(
    id: mangaId,
    userId: 'user-1',
    mangaId: mangaId,
    status: 'READING',
    isFavorite: false,
    createdAt: DateTime(2024),
    updatedAt: updatedAt ?? DateTime(2024),
    lastReadAt: lastReadAt,
  );
}
