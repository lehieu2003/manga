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
  late Future<List<LibraryItem>> _future;
  final _query = TextEditingController();
  String _tab = 'READING';
  String _sort = 'lastRead';

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<List<LibraryItem>> _load() =>
      AppScope.of(context).libraryRepository.all();

  Future<void> _update(
    LibraryItem item, {
    String? status,
    bool? favorite,
  }) async {
    await AppScope.of(context).libraryRepository.upsert(
      item.mangaId,
      status: status ?? item.status,
      isFavorite: favorite ?? item.isFavorite,
    );
    setState(() => _future = _load());
  }

  Future<void> _remove(String mangaId) async {
    await AppScope.of(context).libraryRepository.remove(mangaId);
    setState(() => _future = _load());
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
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'READING', label: Text('Reading')),
                ButtonSegment(value: 'FAVORITES', label: Text('Favorites')),
                ButtonSegment(value: 'COMPLETED', label: Text('Done')),
                ButtonSegment(value: 'PAUSED', label: Text('Paused')),
              ],
              selected: {_tab},
              onSelectionChanged: (value) => setState(() => _tab = value.first),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _query,
              decoration: const InputDecoration(
                labelText: 'Search title, tag, or status',
                prefixIcon: Icon(Icons.search),
              ),
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
        return b.isFavorite.toString().compareTo(a.isFavorite.toString());
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
    required this.onUpdate,
    required this.onRemove,
  });

  final LibraryItem item;
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.menu_book, color: MangaTheme.amber),
              title: Text(
                _title(item),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Text(
                '${item.status} · ${_formatDate(_activityTime(item))}',
              ),
              trailing: IconButton(
                onPressed: () => onUpdate(item, favorite: !item.isFavorite),
                icon: Icon(
                  item.isFavorite ? Icons.favorite : Icons.favorite_border,
                  color: MangaTheme.sakura,
                ),
              ),
              onTap: () => context.push('/manga/${item.mangaId}'),
            ),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: item.status,
                    decoration: const InputDecoration(isDense: true),
                    items: const [
                      DropdownMenuItem(
                        value: 'READING',
                        child: Text('Reading'),
                      ),
                      DropdownMenuItem(
                        value: 'PLAN_TO_READ',
                        child: Text('Plan'),
                      ),
                      DropdownMenuItem(
                        value: 'COMPLETED',
                        child: Text('Completed'),
                      ),
                      DropdownMenuItem(value: 'PAUSED', child: Text('Paused')),
                      DropdownMenuItem(
                        value: 'DROPPED',
                        child: Text('Dropped'),
                      ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        onUpdate(item, status: value);
                      }
                    },
                  ),
                ),
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
            ),
          ],
        ),
      ),
    );
  }
}

String _title(LibraryItem item) => item.manga?.title ?? item.mangaId;
DateTime _activityTime(LibraryItem item) =>
    item.readingProgress?.updatedAt ?? item.lastReadAt ?? item.updatedAt;
String _formatDate(DateTime date) =>
    '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
