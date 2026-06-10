import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../domain/models/models.dart';
import '../../app_state.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<_HomeData> _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future = _load();
  }

  Future<_HomeData> _load() async {
    final app = AppScope.of(context);
    final results = await Future.wait([
      app.catalogRepository.searchManga(limit: 12, sort: 'followed'),
      app.catalogRepository.searchManga(query: 'one', limit: 8, sort: 'latest'),
      app.catalogRepository.genres(),
      if (app.isSignedIn)
        app.libraryRepository.all()
      else
        Future.value(<LibraryItem>[]),
    ]);
    return _HomeData(
      popular: (results[0] as Paginated<MangaSummary>).data,
      latest: (results[1] as Paginated<MangaSummary>).data,
      genres: results[2] as List<GenreSummary>,
      library: results[3] as List<LibraryItem>,
    );
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    return RefreshIndicator(
      onRefresh: () async => setState(() => _future = _load()),
      child: FutureBuilder<_HomeData>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const AsyncPane(message: 'Loading manga shelf...');
          }
          if (snapshot.hasError) {
            return AsyncPane(
              message: snapshot.error.toString(),
              onRetry: () => setState(() => _future = _load()),
            );
          }
          final data = snapshot.data!;
          final continueItems =
              data.library
                  .where(
                    (item) =>
                        item.readingProgress != null || item.lastReadAt != null,
                  )
                  .toList()
                ..sort((a, b) => _activityTime(b).compareTo(_activityTime(a)));
          return ListView(
            padding: const EdgeInsets.all(14),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'MANGA CAFE READER',
                        style: TextStyle(
                          color: MangaTheme.amber,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'A warm shelf for reading, tracking, and continuing every chapter.',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 10,
                        children: [
                          FilledButton.icon(
                            onPressed: () => context.go('/search'),
                            icon: const Icon(Icons.explore),
                            label: const Text('Explore'),
                          ),
                          OutlinedButton.icon(
                            onPressed: () => context.go(
                              app.isSignedIn ? '/library' : '/login',
                            ),
                            icon: const Icon(Icons.history),
                            label: const Text('Continue'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              if (app.isSignedIn) ...[
                SectionHeader(
                  title: 'Continue Reading',
                  action: TextButton(
                    onPressed: () => context.go('/library'),
                    child: const Text('Library'),
                  ),
                ),
                if (continueItems.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: Text(
                        'Follow a manga and start a chapter to see it here.',
                      ),
                    ),
                  )
                else
                  _ContinueTile(item: continueItems.first),
                if (continueItems.length > 1) ...[
                  const SizedBox(height: 8),
                  ...continueItems
                      .skip(1)
                      .take(5)
                      .map((item) => _RecentTile(item: item)),
                ],
              ],
              SectionHeader(title: 'Browse by genre'),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: data.genres.take(14).map((genre) {
                  return ActionChip(
                    label: Text('${genre.name} ${genre.count}'),
                    onPressed: () => context.go(
                      '/genres/${Uri.encodeComponent(genre.name)}',
                    ),
                  );
                }).toList(),
              ),
              SectionHeader(
                title: 'Popular picks',
                action: TextButton(
                  onPressed: () => context.go('/discover/popular'),
                  child: const Text('View all'),
                ),
              ),
              MangaGrid(
                items: data.popular,
                assetUrl: app.catalogRepository.assetUrl,
                onTap: (manga) => context.push('/manga/${manga.id}'),
              ),
              SectionHeader(
                title: 'Latest starters',
                action: TextButton(
                  onPressed: () => context.go('/discover/latest'),
                  child: const Text('Latest updates'),
                ),
              ),
              MangaGrid(
                items: data.latest,
                assetUrl: app.catalogRepository.assetUrl,
                onTap: (manga) => context.push('/manga/${manga.id}'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ContinueTile extends StatelessWidget {
  const _ContinueTile({required this.item});

  final LibraryItem item;

  @override
  Widget build(BuildContext context) {
    final progress = item.readingProgress;
    final chapterId = progress?.chapterId ?? item.lastChapterId;
    return Card(
      child: ListTile(
        leading: const Icon(Icons.play_circle_fill, color: MangaTheme.amber),
        title: Text(
          item.manga?.title ?? item.mangaId,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          progress == null ? item.status : 'Page ${progress.pageIndex + 1}',
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: chapterId == null
            ? () => context.push('/manga/${item.mangaId}')
            : () => context.push('/read/$chapterId?mangaId=${item.mangaId}'),
      ),
    );
  }
}

class _RecentTile extends StatelessWidget {
  const _RecentTile({required this.item});

  final LibraryItem item;

  @override
  Widget build(BuildContext context) {
    final chapterId = item.readingProgress?.chapterId ?? item.lastChapterId;
    return ListTile(
      dense: true,
      title: Text(
        item.manga?.title ?? item.mangaId,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(_formatDate(_activityTime(item))),
      onTap: chapterId == null
          ? () => context.push('/manga/${item.mangaId}')
          : () => context.push('/read/$chapterId?mangaId=${item.mangaId}'),
    );
  }
}

class _HomeData {
  const _HomeData({
    required this.popular,
    required this.latest,
    required this.genres,
    required this.library,
  });

  final List<MangaSummary> popular;
  final List<MangaSummary> latest;
  final List<GenreSummary> genres;
  final List<LibraryItem> library;
}

DateTime _activityTime(LibraryItem item) =>
    item.readingProgress?.updatedAt ?? item.lastReadAt ?? item.updatedAt;
String _formatDate(DateTime date) =>
    '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
