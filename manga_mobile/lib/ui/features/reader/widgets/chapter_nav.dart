import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../domain/models/models.dart';
import '../../../core/theme.dart';

class ChapterNav extends StatelessWidget {
  const ChapterNav({
    super.key,
    required this.chapterId,
    required this.mangaId,
    required this.chapters,
  });

  final String chapterId;
  final String? mangaId;
  final List<ChapterSummary> chapters;

  @override
  Widget build(BuildContext context) {
    if (mangaId == null) {
      return const Material(
        color: Colors.black,
        child: Padding(
          padding: EdgeInsets.all(10),
          child: Text(
            'Chapter navigation needs manga context.',
            textAlign: TextAlign.center,
            style: TextStyle(color: MangaTheme.muted),
          ),
        ),
      );
    }

    if (chapters.isEmpty) {
      return const Material(
        color: Colors.black,
        child: Padding(
          padding: EdgeInsets.all(10),
          child: Text(
            'Chapter navigation is unavailable while chapter context loads.',
            textAlign: TextAlign.center,
            style: TextStyle(color: MangaTheme.muted),
          ),
        ),
      );
    }

    final current = chapters.indexWhere((chapter) => chapter.id == chapterId);
    final previous = current > 0 ? chapters[current - 1] : null;
    final next = current >= 0 && current < chapters.length - 1
        ? chapters[current + 1]
        : null;

    return Material(
      color: Colors.black,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Row(
          children: [
            IconButton(
              onPressed: previous == null
                  ? null
                  : () {
                      context.pushReplacement(
                        '/read/${previous.id}?mangaId=$mangaId',
                      );
                    },
              icon: const Icon(Icons.chevron_left),
            ),
            Expanded(
              child: DropdownButtonFormField<String>(
                value: current >= 0 ? chapterId : null,
                decoration: const InputDecoration(isDense: true),
                items: chapters.map((chapter) {
                  return DropdownMenuItem(
                    value: chapter.id,
                    child: Text(
                      'Ch. ${chapter.chapter ?? '?'} '
                      '[${chapter.translatedLanguage.toUpperCase()}]',
                      overflow: TextOverflow.ellipsis,
                    ),
                  );
                }).toList(),
                onChanged: (id) {
                  if (id != null && id != chapterId) {
                    context.pushReplacement('/read/$id?mangaId=$mangaId');
                  }
                },
              ),
            ),
            IconButton(
              onPressed: next == null
                  ? null
                  : () {
                      context.pushReplacement(
                        '/read/${next.id}?mangaId=$mangaId',
                      );
                    },
              icon: const Icon(Icons.chevron_right),
            ),
          ],
        ),
      ),
    );
  }
}
