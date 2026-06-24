import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../domain/models/models.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';

class HomeContinueSection extends StatelessWidget {
  const HomeContinueSection({
    super.key,
    required this.continueItems,
    required this.onLibraryTap,
  });

  final List<LibraryItem> continueItems;
  final VoidCallback onLibraryTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SectionHeader(
          title: 'Continue Reading',
          action: TextButton(
            onPressed: onLibraryTap,
            child: const Text('Library'),
          ),
        ),
        if (continueItems.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Follow a manga and start a chapter to see it here.'),
            ),
          )
        else ...[
          _ContinueTile(item: continueItems.first),
          if (continueItems.length > 1) ...[
            const SizedBox(height: 8),
            ...continueItems
                .skip(1)
                .take(5)
                .map((item) => _RecentTile(item: item)),
          ],
        ],
      ],
    );
  }
}

class _ContinueTile extends StatelessWidget {
  const _ContinueTile({required this.item});

  final LibraryItem item;

  @override
  Widget build(BuildContext context) {
    final progress = item.readingProgress;
    final chapterId = progress?.chapterId ?? item.lastChapterId;

    return Card(
      child: ListTile(
        leading: const Icon(Icons.play_circle_fill, color: MangaTheme.amber),
        title: Text(
          item.manga?.title ?? item.mangaId,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          progress == null ? item.status : 'Page ${progress.pageIndex + 1}',
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: chapterId == null
            ? () => context.push('/manga/${item.mangaId}')
            : () => context.push(
                '/read/$chapterId?mangaId=${Uri.encodeComponent(item.mangaId)}',
              ),
      ),
    );
  }
}

class _RecentTile extends StatelessWidget {
  const _RecentTile({required this.item});

  final LibraryItem item;

  @override
  Widget build(BuildContext context) {
    final chapterId = item.readingProgress?.chapterId ?? item.lastChapterId;

    return ListTile(
      dense: true,
      title: Text(
        item.manga?.title ?? item.mangaId,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(_formatDate(_activityTime(item))),
      onTap: chapterId == null
          ? () => context.push('/manga/${item.mangaId}')
          : () => context.push(
              '/read/$chapterId?mangaId=${Uri.encodeComponent(item.mangaId)}',
            ),
    );
  }
}

DateTime _activityTime(LibraryItem item) =>
    item.readingProgress?.updatedAt ?? item.lastReadAt ?? item.updatedAt;
String _formatDate(DateTime date) =>
    '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
