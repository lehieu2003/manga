import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../domain/models/models.dart';
import '../../app_state.dart';
import '../../core/widgets.dart';

enum DiscoveryPreset { search, popular, latest }

class SearchScreen extends StatefulWidget {
  const SearchScreen({
    super.key,
    this.preset = DiscoveryPreset.search,
    this.routeGenre,
  });

  final DiscoveryPreset preset;
  final String? routeGenre;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _query = TextEditingController();
  final _year = TextEditingController();
  List<GenreSummary> _genres = [];
  List<MangaSummary> _items = [];
  List<String> _included = [];
  final List<String> _excluded = [];
  final List<String> _ratings = ['safe', 'suggestive'];
  final List<String> _statuses = [];
  String _sort = 'relevance';
  String? _source;
  int _offset = 0;
  int _total = 0;
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _applyInitialDiscoveryState();
      _load(reset: true);
      _loadGenres();
    });
  }

  @override
  void dispose() {
    _query.dispose();
    _year.dispose();
    super.dispose();
  }

  void _applyInitialDiscoveryState() {
    final uri = GoRouterState.of(context).uri;
    final queryTag = uri.queryParameters['tag'];
    final routeGenre = widget.routeGenre == null
        ? null
        : Uri.decodeComponent(widget.routeGenre!);
    _included = {
      if (routeGenre != null && routeGenre.isNotEmpty) routeGenre,
      if (queryTag != null && queryTag.isNotEmpty) queryTag,
    }.toList();
    _sort = switch (widget.preset) {
      DiscoveryPreset.popular => 'followed',
      DiscoveryPreset.latest => 'latest',
      DiscoveryPreset.search => 'relevance',
    };
  }

  Future<void> _loadGenres() async {
    try {
      final genres = await AppScope.of(context).catalogRepository.genres();
      if (mounted) setState(() => _genres = genres);
    } catch (_) {
      // Search still works without genre suggestions.
    }
  }

  Future<void> _load({required bool reset}) async {
    setState(() {
      if (reset) {
        _loading = true;
        _offset = 0;
      } else {
        _loadingMore = true;
      }
      _error = null;
    });
    try {
      final parsedYear = int.tryParse(_year.text.trim());
      final page = await AppScope.of(context).catalogRepository.searchManga(
        query: _query.text.trim().isEmpty ? null : _query.text.trim(),
        offset: reset ? 0 : _offset,
        includedTags: _included,
        excludedTags: _excluded,
        contentRating: _ratings,
        status: _statuses,
        year: parsedYear,
        sort: _sort,
      );
      setState(() {
        _items = reset ? page.data : [..._items, ...page.data];
        _offset = page.offset + page.limit;
        _total = page.total;
        _source = page.source;
      });
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
          _loadingMore = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final hasFilters = _hasActiveFilters;
    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        Text(
          _title,
          style: Theme.of(
            context,
          ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _query,
          decoration: InputDecoration(
            labelText: 'Title or keyword',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: IconButton(
              icon: const Icon(Icons.arrow_forward),
              onPressed: () => _load(reset: true),
            ),
          ),
          onSubmitted: (_) => _load(reset: true),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                value: _sort,
                decoration: const InputDecoration(labelText: 'Sort'),
                items: const [
                  DropdownMenuItem(
                    value: 'relevance',
                    child: Text('Relevance'),
                  ),
                  DropdownMenuItem(value: 'latest', child: Text('Latest')),
                  DropdownMenuItem(value: 'followed', child: Text('Popular')),
                  DropdownMenuItem(value: 'title', child: Text('Title A-Z')),
                  DropdownMenuItem(value: 'created', child: Text('Created')),
                  DropdownMenuItem(value: 'updated', child: Text('Updated')),
                ],
                onChanged: (value) {
                  _sort = value ?? 'relevance';
                  _load(reset: true);
                },
              ),
            ),
            const SizedBox(width: 10),
            SizedBox(
              width: 110,
              child: TextField(
                controller: _year,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Year'),
                onSubmitted: (_) => _load(reset: true),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          children: ['safe', 'suggestive'].map((rating) {
            return FilterChip(
              label: Text(rating),
              selected: _ratings.contains(rating),
              onSelected: (_) {
                setState(() {
                  if (_ratings.contains(rating) && _ratings.length > 1) {
                    _ratings.remove(rating);
                  } else if (!_ratings.contains(rating)) {
                    _ratings.add(rating);
                  }
                });
                _load(reset: true);
              },
            );
          }).toList(),
        ),
        Wrap(
          spacing: 8,
          children: ['ongoing', 'completed', 'hiatus', 'cancelled'].map((
            status,
          ) {
            return FilterChip(
              label: Text(status),
              selected: _statuses.contains(status),
              onSelected: (_) {
                setState(() => _toggle(_statuses, status));
                _load(reset: true);
              },
            );
          }).toList(),
        ),
        if (_genres.isNotEmpty) ...[
          SectionHeader(title: 'Include tags'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _genres.take(18).map((genre) {
              return FilterChip(
                label: Text(genre.name),
                selected: _included.contains(genre.name),
                onSelected: (_) {
                  setState(() {
                    _toggle(_included, genre.name);
                    _excluded.remove(genre.name);
                  });
                  _load(reset: true);
                },
              );
            }).toList(),
          ),
          SectionHeader(title: 'Exclude tags'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _genres.take(18).map((genre) {
              return FilterChip(
                label: Text(genre.name),
                selected: _excluded.contains(genre.name),
                onSelected: (_) {
                  setState(() {
                    _toggle(_excluded, genre.name);
                    _included.remove(genre.name);
                  });
                  _load(reset: true);
                },
              );
            }).toList(),
          ),
        ],
        if (hasFilters || _source != null) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (_source != null)
                _SummaryChip(
                  label: _source == 'cache' ? 'Cached results' : 'Live results',
                ),
              _SummaryChip(label: '${_items.length} of $_total shown'),
              _SummaryChip(label: _sortLabel(_sort)),
              if (_query.text.trim().isNotEmpty)
                _SummaryChip(label: 'Search: ${_query.text.trim()}'),
              for (final tag in _included) _SummaryChip(label: 'Include: $tag'),
              for (final tag in _excluded) _SummaryChip(label: 'Exclude: $tag'),
              for (final rating in _ratings) _SummaryChip(label: rating),
              for (final status in _statuses) _SummaryChip(label: status),
              if (_year.text.trim().isNotEmpty)
                _SummaryChip(label: 'Year: ${_year.text.trim()}'),
              if (hasFilters)
                ActionChip(
                  avatar: const Icon(Icons.clear, size: 16),
                  label: const Text('Clear filters'),
                  onPressed: _clearFilters,
                ),
            ],
          ),
        ],
        if (_loading)
          const AsyncPane(message: 'Searching...')
        else if (_error != null)
          AsyncPane(message: _error!, onRetry: () => _load(reset: true))
        else if (_items.isEmpty)
          AsyncPane(
            message: hasFilters
                ? 'No manga matches these filters.'
                : 'No manga found. Try another title or genre.',
          )
        else ...[
          SectionHeader(title: '${_items.length} of $_total results'),
          MangaGrid(
            items: _items,
            assetUrl: app.catalogRepository.assetUrl,
            onTap: (manga) => context.push('/manga/${manga.id}'),
          ),
          if (_offset < _total)
            Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton(
                onPressed: _loadingMore ? null : () => _load(reset: false),
                child: Text(_loadingMore ? 'Loading...' : 'Load more'),
              ),
            ),
        ],
      ],
    );
  }

  String get _title {
    if (widget.routeGenre != null && widget.routeGenre!.isNotEmpty) {
      return 'Genre: ${Uri.decodeComponent(widget.routeGenre!)}';
    }
    return switch (widget.preset) {
      DiscoveryPreset.popular => 'Popular manga',
      DiscoveryPreset.latest => 'Latest updates',
      DiscoveryPreset.search => 'Search MangaDex',
    };
  }

  bool get _hasActiveFilters {
    return _query.text.trim().isNotEmpty ||
        _included.isNotEmpty ||
        _excluded.isNotEmpty ||
        _statuses.isNotEmpty ||
        _year.text.trim().isNotEmpty ||
        _sort !=
            switch (widget.preset) {
              DiscoveryPreset.popular => 'followed',
              DiscoveryPreset.latest => 'latest',
              DiscoveryPreset.search => 'relevance',
            } ||
        !_sameStringSet(_ratings, const ['safe', 'suggestive']);
  }

  void _clearFilters() {
    setState(() {
      _query.clear();
      _year.clear();
      _included.clear();
      _excluded.clear();
      _statuses.clear();
      _ratings
        ..clear()
        ..addAll(const ['safe', 'suggestive']);
      _sort = switch (widget.preset) {
        DiscoveryPreset.popular => 'followed',
        DiscoveryPreset.latest => 'latest',
        DiscoveryPreset.search => 'relevance',
      };
    });
    _load(reset: true);
  }
}

void _toggle(List<String> list, String value) {
  if (list.contains(value)) {
    list.remove(value);
  } else {
    list.add(value);
  }
}

bool _sameStringSet(List<String> left, List<String> right) =>
    left.length == right.length && left.toSet().containsAll(right);

String _sortLabel(String sort) => switch (sort) {
  'latest' => 'Latest',
  'followed' => 'Popular',
  'title' => 'Title A-Z',
  'created' => 'Created newest',
  'updated' => 'Updated newest',
  _ => 'Relevance',
};

class _SummaryChip extends StatelessWidget {
  const _SummaryChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(visualDensity: VisualDensity.compact, label: Text(label));
  }
}
