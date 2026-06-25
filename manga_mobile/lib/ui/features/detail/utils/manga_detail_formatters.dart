import '../../../../domain/models/models.dart';

double chapterValue(ChapterSummary chapter) {
  final parsed = double.tryParse(chapter.chapter ?? '');
  if (parsed != null) return parsed;

  return chapter.publishAt.millisecondsSinceEpoch / 1000000000000;
}

String formatMangaDate(DateTime date) {
  final month = date.month.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');

  return '${date.year}-$month-$day';
}

ReadingProgress? findChapterProgress(
  List<ReadingProgress> progresses,
  String chapterId,
) {
  for (final progress in progresses) {
    if (progress.chapterId == chapterId) {
      return progress;
    }
  }

  return null;
}
