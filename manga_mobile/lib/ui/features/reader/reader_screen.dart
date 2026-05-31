import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../domain/models/models.dart';
import '../../app_state.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';

class ReaderScreen extends StatefulWidget {
  const ReaderScreen({super.key, required this.chapterId, this.mangaId});

  final String chapterId;
  final String? mangaId;

  @override
  State<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends State<ReaderScreen> {
  late Future<void> _future;
  List<String> _pages = [];
  List<ChapterSummary> _chapters = [];
  MangaProgressPayload? _progress;
  int _pageIndex = 0;
  bool _paged = false;
  bool _contain = false;
  Timer? _saveTimer;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void didUpdateWidget(covariant ReaderScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.chapterId != widget.chapterId) {
      _pageIndex = 0;
      _future = _load();
    }
  }

  @override
  void dispose() {
    _saveTimer?.cancel();
    _saveProgress();
    super.dispose();
  }

  Future<void> _load() async {
    final app = AppScope.of(context);
    final reader = await app.catalogRepository.reader(widget.chapterId);
    _pages = reader.dataSaverPageUrls
        .map(app.catalogRepository.assetUrl)
        .where((url) => url.isNotEmpty)
        .toList();
    if (widget.mangaId != null) {
      final results = await Future.wait([
        app.catalogRepository.chapters(widget.mangaId!),
        if (app.isSignedIn)
          app.libraryRepository.mangaProgress(widget.mangaId!)
        else
          Future.value(null),
      ]);
      _chapters = (results[0] as Paginated<ChapterSummary>).data
        ..sort(_compareChapters);
      _progress = results[1] as MangaProgressPayload?;
      if (_progress?.progress?.chapterId == widget.chapterId) {
        _pageIndex = _progress!.progress!.pageIndex.clamp(
          0,
          (_pages.length - 1).clamp(0, 9999),
        );
      }
    }
  }

  void _setPage(int index) {
    if (_pages.isEmpty) return;
    setState(() => _pageIndex = index.clamp(0, _pages.length - 1));
    _scheduleSave();
  }

  void _scheduleSave() {
    _saveTimer?.cancel();
    _saveTimer = Timer(const Duration(milliseconds: 900), _saveProgress);
  }

  Future<void> _saveProgress() async {
    final app = AppScope.of(context);
    if (!app.isSignedIn || widget.mangaId == null || _pages.isEmpty) return;
    await app.libraryRepository.saveProgress(
      widget.chapterId,
      mangaId: widget.mangaId!,
      pageIndex: _pageIndex,
      completed: _pageIndex >= _pages.length - 1,
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      onPopInvokedWithResult: (_, _) => _saveProgress(),
      child: Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.black,
          title: Text(
            'Page ${_pages.isEmpty ? 0 : _pageIndex + 1}/${_pages.length}',
          ),
          actions: [
            IconButton(
              tooltip: _paged ? 'Vertical mode' : 'Paged mode',
              onPressed: () => setState(() => _paged = !_paged),
              icon: Icon(_paged ? Icons.view_stream : Icons.view_carousel),
            ),
            IconButton(
              tooltip: 'Image fit',
              onPressed: () => setState(() => _contain = !_contain),
              icon: const Icon(Icons.fit_screen),
            ),
          ],
        ),
        body: FutureBuilder<void>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const AsyncPane(message: 'Preparing reader...');
            }
            if (snapshot.hasError) {
              return AsyncPane(
                message: snapshot.error.toString(),
                onRetry: () => setState(() => _future = _load()),
              );
            }
            if (_pages.isEmpty) {
              return const AsyncPane(
                message: 'No readable pages were returned.',
              );
            }
            return Column(
              children: [
                _ChapterNav(
                  chapterId: widget.chapterId,
                  mangaId: widget.mangaId,
                  chapters: _chapters,
                ),
                Expanded(
                  child: _paged
                      ? _pagedReader()
                      : _verticalReader(onVisible: _setPage),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _pagedReader() {
    return GestureDetector(
      onTapUp: (details) {
        final width = MediaQuery.sizeOf(context).width;
        _setPage(
          details.localPosition.dx > width / 2
              ? _pageIndex + 1
              : _pageIndex - 1,
        );
      },
      onHorizontalDragEnd: (details) {
        final velocity = details.primaryVelocity ?? 0;
        if (velocity < 0) {
          _setPage(_pageIndex + 1);
        }
        if (velocity > 0) {
          _setPage(_pageIndex - 1);
        }
      },
      child: Center(
        child: CachedNetworkImage(
          imageUrl: _pages[_pageIndex],
          fit: _contain ? BoxFit.contain : BoxFit.fitWidth,
          width: double.infinity,
          errorWidget: (_, _, _) =>
              const Icon(Icons.broken_image, color: MangaTheme.sakura),
        ),
      ),
    );
  }

  Widget _verticalReader({required void Function(int index) onVisible}) {
    return NotificationListener<ScrollNotification>(
      onNotification: (notification) {
        final viewport = notification.metrics.viewportDimension;
        if (viewport > 0) {
          final next = (notification.metrics.pixels / viewport).round().clamp(
            0,
            _pages.length - 1,
          );
          if (next != _pageIndex) onVisible(next);
        }
        return false;
      },
      child: ListView.builder(
        itemCount: _pages.length,
        itemBuilder: (context, index) => CachedNetworkImage(
          imageUrl: _pages[index],
          fit: _contain ? BoxFit.contain : BoxFit.fitWidth,
          width: double.infinity,
          errorWidget: (_, _, _) => const SizedBox(
            height: 220,
            child: Icon(Icons.broken_image, color: MangaTheme.sakura),
          ),
        ),
      ),
    );
  }
}

class _ChapterNav extends StatelessWidget {
  const _ChapterNav({
    required this.chapterId,
    required this.mangaId,
    required this.chapters,
  });

  final String chapterId;
  final String? mangaId;
  final List<ChapterSummary> chapters;

  @override
  Widget build(BuildContext context) {
    if (mangaId == null || chapters.isEmpty) return const SizedBox.shrink();
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
                  : () => context.pushReplacement(
                      '/read/${previous.id}?mangaId=$mangaId',
                    ),
              icon: const Icon(Icons.chevron_left),
            ),
            Expanded(
              child: DropdownButtonFormField<String>(
                value: current >= 0 ? chapterId : null,
                decoration: const InputDecoration(isDense: true),
                items: chapters
                    .map(
                      (chapter) => DropdownMenuItem(
                        value: chapter.id,
                        child: Text(
                          'Ch. ${chapter.chapter ?? '?'} [${chapter.translatedLanguage.toUpperCase()}]',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
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
                  : () => context.pushReplacement(
                      '/read/${next.id}?mangaId=$mangaId',
                    ),
              icon: const Icon(Icons.chevron_right),
            ),
          ],
        ),
      ),
    );
  }
}

int _compareChapters(ChapterSummary a, ChapterSummary b) {
  final byNumber = _chapterValue(a).compareTo(_chapterValue(b));
  if (byNumber != 0) return byNumber;
  return a.publishAt.compareTo(b.publishAt);
}

double _chapterValue(ChapterSummary chapter) {
  final parsed = double.tryParse(chapter.chapter ?? '');
  if (parsed != null) return parsed;
  return chapter.publishAt.millisecondsSinceEpoch / 1000000000000;
}
