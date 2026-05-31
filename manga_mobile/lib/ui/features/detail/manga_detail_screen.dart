import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../domain/models/models.dart';
import '../../app_state.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';

class MangaDetailScreen extends StatefulWidget {
  const MangaDetailScreen({super.key, required this.mangaId});

  final String mangaId;

  @override
  State<MangaDetailScreen> createState() => _MangaDetailScreenState();
}

class _MangaDetailScreenState extends State<MangaDetailScreen> {
  late AppState _app;
  late Future<void> _future;
  bool _initialized = false;
  MangaSummary? _manga;
  LibraryItem? _libraryItem;
  MangaProgressPayload? _progress;
  final List<ChapterSummary> _chapters = [];
  final List<String> _languages = ['vi', 'en'];
  String _chapterSearch = '';
  String _sort = 'newest';
  int _chapterOffset = 0;
  int _chapterTotal = 0;
  bool _loadingMore = false;
  String? _error;

  @override
  void initState() {
    super.initState();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _app = AppScope.of(context);
    if (!_initialized) {
      _future = _load();
      _initialized = true;
    }
  }

  Future<void> _load() async {
    final results = await Future.wait([
      _app.catalogRepository.manga(widget.mangaId),
      _app.catalogRepository.chapters(
        widget.mangaId,
        translatedLanguage: _languages,
      ),
      if (_app.isSignedIn)
        _app.libraryRepository.item(widget.mangaId)
      else
        Future.value(null),
      if (_app.isSignedIn)
        _app.libraryRepository.mangaProgress(widget.mangaId)
      else
        Future.value(null),
    ]);
    _manga = results[0] as MangaSummary;
    final chapterPage = results[1] as Paginated<ChapterSummary>;
    _chapters
      ..clear()
      ..addAll(chapterPage.data);
    _chapterOffset = chapterPage.offset + chapterPage.limit;
    _chapterTotal = chapterPage.total;
    _libraryItem = results[2] as LibraryItem?;
    _progress = results[3] as MangaProgressPayload?;
  }

  Future<void> _reloadChapters() async {
    setState(() {
      _chapters.clear();
      _chapterOffset = 0;
      _chapterTotal = 0;
    });
    final page = await _app.catalogRepository.chapters(
      widget.mangaId,
      translatedLanguage: _languages,
    );
    setState(() {
      _chapters.addAll(page.data);
      _chapterOffset = page.offset + page.limit;
      _chapterTotal = page.total;
    });
  }

  Future<void> _loadMoreChapters() async {
    setState(() => _loadingMore = true);
    try {
      final page = await _app.catalogRepository.chapters(
        widget.mangaId,
        offset: _chapterOffset,
        translatedLanguage: _languages,
      );
      setState(() {
        _chapters.addAll(page.data);
        _chapterOffset = page.offset + page.limit;
      });
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _follow() async {
    try {
      final item = await _app.libraryRepository.upsert(
        widget.mangaId,
        status: 'READING',
        isFavorite: true,
      );
      setState(() => _libraryItem = item);
    } catch (error) {
      setState(() => _error = error.toString());
    }
  }

  Future<void> _remove() async {
    await _app.libraryRepository.remove(widget.mangaId);
    setState(() => _libraryItem = null);
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Manga detail')),
      body: FutureBuilder<void>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const AsyncPane(message: 'Loading manga...');
          }
          if (snapshot.hasError) {
            return AsyncPane(
              message: snapshot.error.toString(),
              onRetry: () => setState(() => _future = _load()),
            );
          }
          final manga = _manga!;
          final cover = app.catalogRepository.assetUrl(manga.coverUrl);
          final visible = _visibleChapters();
          final continueChapter =
              visible
                  .where(
                    (chapter) => chapter.id == _progress?.progress?.chapterId,
                  )
                  .firstOrNull ??
              _progress?.chapter;
          return ListView(
            padding: const EdgeInsets.all(14),
            children: [
              Card(
                clipBehavior: Clip.antiAlias,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (cover.isNotEmpty)
                      AspectRatio(
                        aspectRatio: 0.72,
                        child: CachedNetworkImage(
                          imageUrl: cover,
                          fit: BoxFit.cover,
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            manga.status ?? 'Manga',
                            style: const TextStyle(
                              color: MangaTheme.amber,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            manga.title,
                            style: Theme.of(context).textTheme.headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w900),
                          ),
                          if (manga.altTitles.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              manga.altTitles.take(3).join(' · '),
                              style: const TextStyle(color: MangaTheme.muted),
                            ),
                          ],
                          const SizedBox(height: 12),
                          Text(
                            manga.description.isEmpty
                                ? 'No description available.'
                                : manga.description,
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: manga.tags
                                .take(12)
                                .map((tag) => Chip(label: Text(tag)))
                                .toList(),
                          ),
                          if (_error != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                _error!,
                                style: const TextStyle(
                                  color: MangaTheme.sakura,
                                ),
                              ),
                            ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 10,
                            runSpacing: 8,
                            children: [
                              FilledButton.icon(
                                onPressed: app.isSignedIn
                                    ? (_libraryItem == null ? _follow : null)
                                    : () => context.push('/login'),
                                icon: Icon(
                                  _libraryItem == null
                                      ? Icons.favorite_border
                                      : Icons.bookmark_added,
                                ),
                                label: Text(
                                  app.isSignedIn
                                      ? (_libraryItem == null
                                            ? 'Follow'
                                            : 'In library')
                                      : 'Login to follow',
                                ),
                              ),
                              if (_libraryItem != null)
                                OutlinedButton.icon(
                                  onPressed: _remove,
                                  icon: const Icon(Icons.delete_outline),
                                  label: const Text('Remove'),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (_progress?.progress != null && continueChapter != null)
                Card(
                  child: ListTile(
                    leading: const Icon(
                      Icons.play_circle,
                      color: MangaTheme.amber,
                    ),
                    title: const Text('Continue Reading'),
                    subtitle: Text(
                      'Chapter ${continueChapter.chapter ?? '?'} · page ${_progress!.progress!.pageIndex + 1}',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push(
                      '/read/${continueChapter.id}?mangaId=${widget.mangaId}',
                    ),
                  ),
                ),
              SectionHeader(title: 'Chapters ($_chapterTotal)'),
              Wrap(
                spacing: 8,
                children: ['vi', 'en'].map((language) {
                  return FilterChip(
                    label: Text(language.toUpperCase()),
                    selected: _languages.contains(language),
                    onSelected: (_) async {
                      setState(() {
                        if (_languages.contains(language)) {
                          _languages.remove(language);
                        } else {
                          _languages.add(language);
                        }
                      });
                      await _reloadChapters();
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      decoration: const InputDecoration(
                        labelText: 'Search chapter',
                        prefixIcon: Icon(Icons.search),
                      ),
                      onChanged: (value) =>
                          setState(() => _chapterSearch = value),
                    ),
                  ),
                  const SizedBox(width: 10),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'newest', icon: Icon(Icons.south)),
                      ButtonSegment(value: 'oldest', icon: Icon(Icons.north)),
                    ],
                    selected: {_sort},
                    onSelectionChanged: (value) =>
                        setState(() => _sort = value.first),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ...visible.map(
                (chapter) => _ChapterRow(
                  chapter: chapter,
                  mangaId: widget.mangaId,
                  currentProgress: _progress?.progress,
                  chaptersProgress: _progress?.chaptersProgress ?? const [],
                ),
              ),
              if (_chapterOffset < _chapterTotal)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: FilledButton(
                    onPressed: _loadingMore ? null : _loadMoreChapters,
                    child: Text(_loadingMore ? 'Loading...' : 'Load more'),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  List<ChapterSummary> _visibleChapters() {
    final needle = _chapterSearch.trim().toLowerCase();
    final filtered = _chapters.where((chapter) {
      if (needle.isEmpty) return true;
      return [chapter.chapter, chapter.title].whereType<String>().any(
        (value) => value.toLowerCase().contains(needle),
      );
    }).toList();
    filtered.sort((a, b) {
      final byNumber = _chapterValue(a).compareTo(_chapterValue(b));
      final byDate = a.publishAt.compareTo(b.publishAt);
      final result = byNumber == 0 ? byDate : byNumber;
      return _sort == 'oldest' ? result : -result;
    });
    return filtered;
  }
}

class _ChapterRow extends StatelessWidget {
  const _ChapterRow({
    required this.chapter,
    required this.mangaId,
    required this.currentProgress,
    required this.chaptersProgress,
  });

  final ChapterSummary chapter;
  final String mangaId;
  final ReadingProgress? currentProgress;
  final List<ReadingProgress> chaptersProgress;

  @override
  Widget build(BuildContext context) {
    final explicit = chaptersProgress
        .where((progress) => progress.chapterId == chapter.id)
        .firstOrNull;
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
        title: Text(
          'Chapter ${chapter.chapter ?? '?'}',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          '[${chapter.translatedLanguage.toUpperCase()}] ${chapter.pages} pages${chapter.title == null ? '' : ' · ${chapter.title}'}',
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/read/${chapter.id}?mangaId=$mangaId'),
      ),
    );
  }
}

double _chapterValue(ChapterSummary chapter) {
  final parsed = double.tryParse(chapter.chapter ?? '');
  if (parsed != null) return parsed;
  return chapter.publishAt.millisecondsSinceEpoch / 1000000000000;
}
