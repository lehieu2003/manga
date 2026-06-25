import '../../../../domain/models/models.dart';

int compareChapters(ChapterSummary a, ChapterSummary b) {
  final byNumber = readerChapterValue(a).compareTo(readerChapterValue(b));

  if (byNumber != 0) return byNumber;

  return a.publishAt.compareTo(b.publishAt);
}

double readerChapterValue(ChapterSummary chapter) {
  final parsed = double.tryParse(chapter.chapter ?? '');

  if (parsed != null) return parsed;

  return chapter.publishAt.millisecondsSinceEpoch / 1000000000000;
}
