import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../domain/models/models.dart';
import '../../../core/theme.dart';
import '../utils/library_formatters.dart';

class LibraryTileDetails extends StatelessWidget {
  const LibraryTileDetails({
    super.key,
    required this.item,
    required this.chapterId,
    required this.onUpdate,
    required this.onRemove,
  });

  final LibraryItem item;
  final String? chapterId;

  final Future<void> Function(
    LibraryItem item, {
    String? status,
    bool? favorite,
  })
  onUpdate;

  final Future<void> Function(String mangaId) onRemove;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildTitleRow(context),
        const SizedBox(height: 10),
        _buildActionsRow(context),
      ],
    );
  }

  Widget _buildTitleRow(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: () => context.push('/manga/${item.mangaId}'),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    libraryTitle(item),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${item.status} · ${formatLibraryDate(libraryActivityTime(item))}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(
                      context,
                    ).textTheme.bodySmall?.copyWith(color: MangaTheme.muted),
                  ),
                ],
              ),
            ),
          ),
        ),
        IconButton(
          tooltip: item.isFavorite ? 'Unfavorite' : 'Favorite',
          onPressed: () => onUpdate(item, favorite: !item.isFavorite),
          icon: Icon(
            item.isFavorite ? Icons.favorite : Icons.favorite_border,
            color: MangaTheme.sakura,
          ),
        ),
      ],
    );
  }

  Widget _buildActionsRow(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final statusMenu = DropdownButtonFormField<String>(
          value: item.status,
          isExpanded: true,
          decoration: const InputDecoration(isDense: true),
          items: const [
            DropdownMenuItem(value: 'READING', child: Text('Reading')),
            DropdownMenuItem(value: 'PLAN_TO_READ', child: Text('Plan')),
            DropdownMenuItem(value: 'COMPLETED', child: Text('Completed')),
            DropdownMenuItem(value: 'PAUSED', child: Text('Paused')),
            DropdownMenuItem(value: 'DROPPED', child: Text('Dropped')),
          ],
          onChanged: (value) {
            if (value != null) {
              onUpdate(item, status: value);
            }
          },
        );

        final actions = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              tooltip: 'Remove',
              onPressed: () => onRemove(item.mangaId),
              icon: const Icon(Icons.delete_outline),
            ),
            if (chapterId != null)
              IconButton(
                tooltip: 'Continue',
                onPressed: () =>
                    context.push('/read/$chapterId?mangaId=${item.mangaId}'),
                icon: const Icon(
                  Icons.play_circle_fill,
                  color: MangaTheme.amber,
                ),
              ),
          ],
        );

        if (constraints.maxWidth < 220) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              statusMenu,
              Align(alignment: Alignment.centerRight, child: actions),
            ],
          );
        }

        return Row(
          children: [
            Expanded(child: statusMenu),
            actions,
          ],
        );
      },
    );
  }
}
