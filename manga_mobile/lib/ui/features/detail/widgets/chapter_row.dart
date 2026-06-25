import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../domain/models/models.dart';
import '../../../core/theme.dart';
import '../utils/manga_detail_formatters.dart';
import 'tiny_badge.dart';

class ChapterRow extends StatelessWidget {
  const ChapterRow({
    super.key,
    required this.chapter,
    required this.mangaId,
    required this.currentProgress,
    required this.chaptersProgress,
    required this.isLatest,
  });

  final ChapterSummary chapter;
  final String mangaId;
  final ReadingProgress? currentProgress;
  final List<ReadingProgress> chaptersProgress;
  final bool isLatest;

  @override
  Widget build(BuildContext context) {
    final explicit = findChapterProgress(chaptersProgress, chapter.id);

    final state = chapter.id == currentProgress?.chapterId
        ? 'Current'
        : explicit?.completed == true
        ? 'Read'
        : 'New';

    return Card(
      child: ListTile(
        leading: Icon(
          state == 'Read'
              ? Icons.check_circle
              : state == 'Current'
              ? Icons.play_circle
              : Icons.circle_outlined,
          color: MangaTheme.amber,
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                'Chapter ${chapter.chapter ?? '?'}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            TinyBadge(label: chapter.translatedLanguage.toUpperCase()),
            if (isLatest) ...[
              const SizedBox(width: 6),
              const TinyBadge(label: 'NEW'),
            ],
          ],
        ),
        subtitle: Text(
          '$state · ${chapter.pages} pages'
          '${chapter.title == null ? '' : ' · ${chapter.title}'}'
          '${chapter.scanlationGroup == null ? '' : ' · ${chapter.scanlationGroup}'}',
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/read/${chapter.id}?mangaId=$mangaId'),
      ),
    );
  }
}
