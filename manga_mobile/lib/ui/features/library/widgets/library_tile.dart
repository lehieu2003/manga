import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../domain/models/models.dart';
import 'library_cover.dart';
import 'library_tile_details.dart';

class LibraryTile extends StatelessWidget {
  const LibraryTile({
    super.key,
    required this.item,
    required this.assetUrl,
    required this.onUpdate,
    required this.onRemove,
  });

  final LibraryItem item;
  final String Function(String? url) assetUrl;

  final Future<void> Function(
    LibraryItem item, {
    String? status,
    bool? favorite,
  })
  onUpdate;

  final Future<void> Function(String mangaId) onRemove;

  @override
  Widget build(BuildContext context) {
    final chapterId = item.readingProgress?.chapterId ?? item.lastChapterId;
    final cover = assetUrl(item.manga?.coverUrl);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final coverLink = InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () => context.push('/manga/${item.mangaId}'),
              child: LibraryCover(coverUrl: cover),
            );

            final details = LibraryTileDetails(
              item: item,
              chapterId: chapterId,
              onUpdate: onUpdate,
              onRemove: onRemove,
            );

            if (constraints.maxWidth < 300) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [coverLink, const SizedBox(height: 10), details],
              );
            }

            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                coverLink,
                const SizedBox(width: 12),
                Expanded(child: details),
              ],
            );
          },
        ),
      ),
    );
  }
}
