import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../data/services/reader_settings_store.dart';
import '../../../domain/models/models.dart';
import '../../app_state.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../chat/chat_assistant.dart';
import '../comments/comment_section.dart';

class ReaderScreen extends StatefulWidget {
  const ReaderScreen({super.key, required this.chapterId, this.mangaId});

  final String chapterId;
  final String? mangaId;

  @override
  State<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends State<ReaderScreen> {
  late AppState _app;
  late Future<void> _future;
  bool _initialized = false;
  List<String> _pages = [];
  List<ChapterSummary> _chapters = [];
  MangaProgressPayload? _progress;
  int _pageIndex = 0;
  bool _paged = false;
  bool _contain = false;
  bool _dataSaver = true;
  ReaderPayload? _reader;
  Timer? _saveTimer;

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
    final settings = await _app.readerSettingsStore.readSettings();
    _paged = settings.paged;
    _contain = settings.contain;
    _dataSaver = settings.dataSaver;
    final reader = await _app.catalogRepository.reader(widget.chapterId);
    _reader = reader;
    _applyReaderPages();
    if (widget.mangaId != null) {
      final results = await Future.wait([
        _app.catalogRepository.chapters(widget.mangaId!),
        if (_app.isSignedIn)
          _app.libraryRepository.mangaProgress(widget.mangaId!)
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
    if (mounted) _preloadAround(_pageIndex);
  }

  void _applyReaderPages() {
    final reader = _reader;
    if (reader == null) return;
    final urls = _dataSaver ? reader.dataSaverPageUrls : reader.pageUrls;
    _pages = urls
        .map(_app.catalogRepository.assetUrl)
        .where((url) => url.isNotEmpty)
        .toList();
    _pageIndex = _pageIndex.clamp(0, (_pages.length - 1).clamp(0, 9999));
  }

  void _toggleQuality() {
    setState(() {
      _dataSaver = !_dataSaver;
      _applyReaderPages();
    });
    _saveReaderSettings();
    _preloadAround(_pageIndex);
  }

  void _saveReaderSettings() {
    unawaited(
      _app.readerSettingsStore.saveSettings(
        ReaderSettings(paged: _paged, contain: _contain, dataSaver: _dataSaver),
      ),
    );
  }

  void _setPage(int index) {
    if (_pages.isEmpty) return;
    setState(() => _pageIndex = index.clamp(0, _pages.length - 1));
    _preloadAround(_pageIndex);
    _scheduleSave();
  }

  void _preloadAround(int index) {
    if (!_paged || !mounted) return;
    for (final next in [index + 1, index + 2]) {
      if (next >= 0 && next < _pages.length) {
        precacheImage(CachedNetworkImageProvider(_pages[next]), context);
      }
    }
  }

  void _scheduleSave() {
    _saveTimer?.cancel();
    _saveTimer = Timer(const Duration(milliseconds: 900), _saveProgress);
  }

  Future<void> _saveProgress() async {
    if (!_app.isSignedIn || widget.mangaId == null || _pages.isEmpty) return;
    await _app.libraryRepository.saveProgress(
      widget.chapterId,
      mangaId: widget.mangaId!,
      pageIndex: _pageIndex,
      completed: _pageIndex >= _pages.length - 1,
    );
  }

  void _openComments() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: SizedBox(
            height: MediaQuery.sizeOf(context).height * 0.78,
            child: SingleChildScrollView(
              child: CommentSection(
                targetType: 'CHAPTER',
                targetId: widget.chapterId,
                compact: true,
              ),
            ),
          ),
        ),
      ),
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
              tooltip: 'Chapter comments',
              onPressed: _openComments,
              icon: const Icon(Icons.mode_comment_outlined),
            ),
            IconButton(
              tooltip: _dataSaver ? 'Use original quality' : 'Use data saver',
              onPressed: _toggleQuality,
              icon: Icon(_dataSaver ? Icons.hd_outlined : Icons.data_saver_on),
            ),
            IconButton(
              tooltip: _paged ? 'Vertical mode' : 'Paged mode',
              onPressed: () {
                setState(() => _paged = !_paged);
                _saveReaderSettings();
                _preloadAround(_pageIndex);
              },
              icon: Icon(_paged ? Icons.view_stream : Icons.view_carousel),
            ),
            IconButton(
              tooltip: 'Image fit',
              onPressed: () {
                setState(() => _contain = !_contain);
                _saveReaderSettings();
              },
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
              return _ReaderErrorPane(
                message: snapshot.error.toString(),
                mangaId: widget.mangaId,
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
        floatingActionButton: _app.isSignedIn
            ? ChatAssistantButton(
                mangaId: widget.mangaId,
                chapterId: widget.chapterId,
              )
            : null,
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

class _ReaderErrorPane extends StatelessWidget {
  const _ReaderErrorPane({
    required this.message,
    required this.mangaId,
    required this.onRetry,
  });

  final String message;
  final String? mangaId;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              alignment: WrapAlignment.center,
              children: [
                FilledButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                ),
                if (mangaId != null)
                  OutlinedButton.icon(
                    onPressed: () => context.go('/manga/$mangaId'),
                    icon: const Icon(Icons.menu_book_outlined),
                    label: const Text('Back to chapters'),
                  ),
              ],
            ),
          ],
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
