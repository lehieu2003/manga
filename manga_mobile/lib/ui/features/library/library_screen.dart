import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../domain/models/models.dart';
import '../../app_state.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';

class LibraryScreen extends StatefulWidget {
  const LibraryScreen({super.key});

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  late AppState _app;
  late Future<List<LibraryItem>> _future;
  bool _initialized = false;
  final _query = TextEditingController();
  String _tab = 'READING';
  String _sort = 'lastRead';

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
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<List<LibraryItem>> _load() => _app.libraryRepository.all();

  Future<void> _update(
    LibraryItem item, {
    String? status,
    bool? favorite,
  }) async {
    try {
      await _app.libraryRepository.upsert(
        item.mangaId,
        status: status ?? item.status,
        isFavorite: favorite ?? item.isFavorite,
      );
      setState(() => _future = _load());
      if (mounted) _showSnack('Library updated.');
    } catch (error) {
      if (mounted) _showSnack(error.toString());
    }
  }

  Future<void> _remove(String mangaId) async {
    try {
      await _app.libraryRepository.remove(mangaId);
      setState(() => _future = _load());
      if (mounted) _showSnack('Removed from library.');
    } catch (error) {
      if (mounted) _showSnack(error.toString());
    }
  }

  void _clearFilters() {
    setState(() {
      _query.clear();
      _sort = 'lastRead';
    });
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<LibraryItem>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const AsyncPane(message: 'Loading library...');
        }
        if (snapshot.hasError) {
          return AsyncPane(
            message: snapshot.error.toString(),
            onRetry: () => setState(() => _future = _load()),
          );
        }
        final items = _visible(snapshot.data ?? const []);
        final hasActiveFilters =
            _query.text.trim().isNotEmpty || _sort != 'lastRead';
        return ListView(
          padding: const EdgeInsets.all(14),
          children: [
            Text(
              'Library',
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'READING', label: Text('Reading')),
                  ButtonSegment(value: 'FAVORITES', label: Text('Favorites')),
                  ButtonSegment(value: 'COMPLETED', label: Text('Done')),
                  ButtonSegment(value: 'PAUSED', label: Text('Paused')),
                ],
                selected: {_tab},
                onSelectionChanged: (value) =>
                    setState(() => _tab = value.first),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _query,
              decoration: const InputDecoration(
                labelText: 'Search title, tag, or status',
                prefixIcon: Icon(Icons.search),
              ),
              onTapOutside: (_) {
                FocusScope.of(context).unfocus();
              },
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              value: _sort,
              decoration: const InputDecoration(labelText: 'Sort'),
              items: const [
                DropdownMenuItem(value: 'lastRead', child: Text('Last read')),
                DropdownMenuItem(
                  value: 'updated',
                  child: Text('Recently updated'),
                ),
                DropdownMenuItem(value: 'title', child: Text('Title A-Z')),
                DropdownMenuItem(value: 'status', child: Text('Status')),
                DropdownMenuItem(
                  value: 'favorite',
                  child: Text('Favorite first'),
                ),
              ],
              onChanged: (value) => setState(() => _sort = value ?? 'lastRead'),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _LibrarySummaryChip(label: _tabLabel(_tab)),
                _LibrarySummaryChip(label: '${items.length} shown'),
                _LibrarySummaryChip(label: _sortLabel(_sort)),
                if (_query.text.trim().isNotEmpty)
                  _LibrarySummaryChip(label: 'Search: ${_query.text.trim()}'),
                if (hasActiveFilters)
                  ActionChip(
                    avatar: const Icon(Icons.clear, size: 16),
                    label: const Text('Clear filters'),
                    onPressed: _clearFilters,
                  ),
              ],
            ),
            SectionHeader(title: '${items.length} shown'),
            if ((snapshot.data ?? const []).isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    children: [
                      const Icon(Icons.library_books, color: MangaTheme.amber),
                      const SizedBox(height: 8),
                      const Text(
                        'Follow a manga to start building your shelf.',
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: () => context.go('/search'),
                        child: const Text('Find manga'),
                      ),
                    ],
                  ),
                ),
              )
            else if (items.isEmpty)
              const AsyncPane(message: 'No manga matches this shelf view.')
            else
              ...items.map(
                (item) => _LibraryTile(
                  item: item,
                  assetUrl: _app.catalogRepository.assetUrl,
                  onUpdate: _update,
                  onRemove: _remove,
                ),
              ),
          ],
        );
      },
    );
  }

  List<LibraryItem> _visible(List<LibraryItem> all) {
    final needle = _query.text.trim().toLowerCase();
    final tabbed = _tab == 'FAVORITES'
        ? all.where((item) => item.isFavorite)
        : all.where((item) => item.status == _tab);
    final filtered = tabbed.where((item) {
      if (needle.isEmpty) return true;
      final values = [
        item.manga?.title,
        item.status,
        item.manga?.status,
        ...?item.manga?.tags,
      ];
      return values.whereType<String>().any(
        (value) => value.toLowerCase().contains(needle),
      );
    }).toList();
    filtered.sort((a, b) {
      if (_sort == 'title') return _title(a).compareTo(_title(b));
      if (_sort == 'status') return a.status.compareTo(b.status);
      if (_sort == 'favorite') {
        final byFavorite = (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
        if (byFavorite != 0) return byFavorite;
        return _activityTime(b).compareTo(_activityTime(a));
      }
      if (_sort == 'updated') return b.updatedAt.compareTo(a.updatedAt);
      return _activityTime(b).compareTo(_activityTime(a));
    });
    return filtered;
  }
}

class _LibraryTile extends StatelessWidget {
  const _LibraryTile({
    required this.item,
    required this.assetUrl,
    required this.onUpdate,
    required this.onRemove,
  });

  final LibraryItem item;
  final String Function(String? url) assetUrl;
  final Future<void> Function(
    LibraryItem item, {
    String? status,
    bool? favorite,
  })
  onUpdate;
  final Future<void> Function(String mangaId) onRemove;

  @override
  Widget build(BuildContext context) {
    final chapterId = item.readingProgress?.chapterId ?? item.lastChapterId;
    final cover = assetUrl(item.manga?.coverUrl);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final coverLink = InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () => context.push('/manga/${item.mangaId}'),
              child: _LibraryCover(coverUrl: cover),
            );
            final details = _LibraryTileDetails(
              item: item,
              chapterId: chapterId,
              onUpdate: onUpdate,
              onRemove: onRemove,
            );

            if (constraints.maxWidth < 300) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [coverLink, const SizedBox(height: 10), details],
              );
            }

            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                coverLink,
                const SizedBox(width: 12),
                Expanded(child: details),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _LibraryTileDetails extends StatelessWidget {
  const _LibraryTileDetails({
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
        Row(
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
                        _title(item),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${item.status} · ${_formatDate(_activityTime(item))}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: MangaTheme.muted,
                        ),
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
        ),
        const SizedBox(height: 10),
        LayoutBuilder(
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
                    onPressed: () => context.push(
                      '/read/$chapterId?mangaId=${item.mangaId}',
                    ),
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
        ),
      ],
    );
  }
}

class _LibraryCover extends StatelessWidget {
  const _LibraryCover({required this.coverUrl});

  final String coverUrl;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        width: 72,
        height: 104,
        child: coverUrl.isEmpty
            ? const ColoredBox(
                color: MangaTheme.panelStrong,
                child: Icon(Icons.menu_book_outlined, color: MangaTheme.amber),
              )
            : CachedNetworkImage(
                imageUrl: coverUrl,
                fit: BoxFit.cover,
                placeholder: (_, _) => const ColoredBox(
                  color: MangaTheme.panelStrong,
                  child: Center(
                    child: SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
                errorWidget: (_, _, _) => const ColoredBox(
                  color: MangaTheme.panelStrong,
                  child: Icon(
                    Icons.broken_image_outlined,
                    color: MangaTheme.muted,
                  ),
                ),
              ),
      ),
    );
  }
}

class _LibrarySummaryChip extends StatelessWidget {
  const _LibrarySummaryChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(visualDensity: VisualDensity.compact, label: Text(label));
  }
}

String _title(LibraryItem item) => item.manga?.title ?? item.mangaId;
DateTime _activityTime(LibraryItem item) =>
    item.readingProgress?.updatedAt ?? item.lastReadAt ?? item.updatedAt;
String _formatDate(DateTime date) =>
    '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

String _tabLabel(String tab) => switch (tab) {
  'FAVORITES' => 'Favorites',
  'COMPLETED' => 'Completed',
  'PAUSED' => 'Paused',
  _ => 'Reading',
};

String _sortLabel(String sort) => switch (sort) {
  'updated' => 'Recently updated',
  'title' => 'Title A-Z',
  'status' => 'Status',
  'favorite' => 'Favorite first',
  _ => 'Last read',
};
