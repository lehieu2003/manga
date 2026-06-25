import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../app_state.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import 'cubit/library_cubit.dart';
import 'cubit/library_state.dart';
import 'utils/library_formatters.dart';
import 'widgets/library_summary_chip.dart';
import 'widgets/library_tile.dart';

class LibraryScreen extends StatelessWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.read(context);

    return BlocProvider(
      create: (_) =>
          LibraryCubit(libraryRepository: app.libraryRepository)..load(),
      child: _LibraryView(assetUrl: app.catalogRepository.assetUrl),
    );
  }
}

class _LibraryView extends StatefulWidget {
  const _LibraryView({required this.assetUrl});

  final String Function(String? url) assetUrl;

  @override
  State<_LibraryView> createState() => _LibraryViewState();
}

class _LibraryViewState extends State<_LibraryView> {
  final _query = TextEditingController();

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  void _syncQueryController(String query) {
    if (_query.text == query) return;

    _query.value = TextEditingValue(
      text: query,
      selection: TextSelection.collapsed(offset: query.length),
    );
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<LibraryCubit, LibraryState>(
      listenWhen: (previous, current) {
        return previous.notice != current.notice ||
            previous.query != current.query;
      },
      listener: (context, state) {
        _syncQueryController(state.query);

        if (state.notice != null) {
          _showSnack(state.notice!);
          context.read<LibraryCubit>().clearNotice();
        }
      },
      builder: (context, state) {
        if (state.loading) {
          return const AsyncPane(message: 'Loading library...');
        }

        if (state.error != null) {
          return AsyncPane(
            message: state.error!,
            onRetry: () => context.read<LibraryCubit>().load(),
          );
        }

        final items = state.visibleItems;

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
            _buildTabs(context, state),
            const SizedBox(height: 12),
            _buildSearchField(context),
            const SizedBox(height: 10),
            _buildSortDropdown(context, state),
            const SizedBox(height: 10),
            _buildSummary(context, state, items.length),
            SectionHeader(title: '${items.length} shown'),
            if (state.items.isEmpty)
              _buildEmptyLibraryCard(context)
            else if (items.isEmpty)
              const AsyncPane(message: 'No manga matches this shelf view.')
            else
              ...items.map((item) {
                final cubit = context.read<LibraryCubit>();

                return LibraryTile(
                  item: item,
                  assetUrl: widget.assetUrl,
                  onUpdate: cubit.updateItem,
                  onRemove: cubit.removeItem,
                );
              }),
          ],
        );
      },
    );
  }

  Widget _buildTabs(BuildContext context, LibraryState state) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: SegmentedButton<String>(
        segments: const [
          ButtonSegment(value: 'READING', label: Text('Reading')),
          ButtonSegment(value: 'PLAN_TO_READ', label: Text('Plan')),
          ButtonSegment(value: 'FAVORITES', label: Text('Favorites')),
          ButtonSegment(value: 'COMPLETED', label: Text('Done')),
          ButtonSegment(value: 'PAUSED', label: Text('Paused')),
          ButtonSegment(value: 'DROPPED', label: Text('Dropped')),
        ],
        selected: {state.tab},
        onSelectionChanged: (value) {
          context.read<LibraryCubit>().setTab(value.first);
        },
      ),
    );
  }

  Widget _buildSearchField(BuildContext context) {
    return TextField(
      controller: _query,
      decoration: const InputDecoration(
        labelText: 'Search title, tag, or status',
        prefixIcon: Icon(Icons.search),
      ),
      onTapOutside: (_) {
        FocusScope.of(context).unfocus();
      },
      onChanged: (value) {
        context.read<LibraryCubit>().setQuery(value);
      },
    );
  }

  Widget _buildSortDropdown(BuildContext context, LibraryState state) {
    return DropdownButtonFormField<String>(
      value: state.sort,
      decoration: const InputDecoration(labelText: 'Sort'),
      items: const [
        DropdownMenuItem(value: 'lastRead', child: Text('Last read')),
        DropdownMenuItem(value: 'updated', child: Text('Recently updated')),
        DropdownMenuItem(value: 'title', child: Text('Title A-Z')),
        DropdownMenuItem(value: 'status', child: Text('Status')),
        DropdownMenuItem(value: 'favorite', child: Text('Favorite first')),
      ],
      onChanged: (value) {
        context.read<LibraryCubit>().setSort(value ?? 'lastRead');
      },
    );
  }

  Widget _buildSummary(
    BuildContext context,
    LibraryState state,
    int shownCount,
  ) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        LibrarySummaryChip(label: libraryTabLabel(state.tab)),
        LibrarySummaryChip(label: '$shownCount shown'),
        LibrarySummaryChip(label: librarySortLabel(state.sort)),
        if (state.query.trim().isNotEmpty)
          LibrarySummaryChip(label: 'Search: ${state.query.trim()}'),
        if (state.hasActiveFilters)
          ActionChip(
            avatar: const Icon(Icons.clear, size: 16),
            label: const Text('Clear filters'),
            onPressed: () {
              context.read<LibraryCubit>().clearFilters();
            },
          ),
      ],
    );
  }

  Widget _buildEmptyLibraryCard(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [
            const Icon(Icons.library_books, color: MangaTheme.amber),
            const SizedBox(height: 8),
            const Text('Follow a manga to start building your shelf.'),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => context.go('/search'),
              child: const Text('Find manga'),
            ),
          ],
        ),
      ),
    );
  }
}
