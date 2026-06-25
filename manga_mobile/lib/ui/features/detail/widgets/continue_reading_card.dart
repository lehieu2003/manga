import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../domain/models/models.dart';
import '../../../core/theme.dart';

class ContinueReadingCard extends StatelessWidget {
  const ContinueReadingCard({
    super.key,
    required this.mangaId,
    required this.chapter,
    required this.progress,
  });

  final String mangaId;
  final ChapterSummary chapter;
  final ReadingProgress progress;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.play_circle, color: MangaTheme.amber),
        title: const Text('Continue Reading'),
        subtitle: Text(
          'Chapter ${chapter.chapter ?? '?'} · page ${progress.pageIndex + 1}',
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/read/${chapter.id}?mangaId=$mangaId'),
      ),
    );
  }
}
