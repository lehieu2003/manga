import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../app_state.dart';
import '../../core/widgets.dart';
import 'cubit/search_cubit.dart';
import 'cubit/search_state.dart';
import 'search_discovery_preset.dart';
import 'utils/search_formatters.dart';
import 'widgets/search_filter_chips.dart';
import 'widgets/search_genre_section.dart';
import 'widgets/search_sort_year_row.dart';
import 'widgets/search_summary.dart';
import 'widgets/search_text_fields.dart';

class SearchScreen extends StatelessWidget {
  const SearchScreen({
    super.key,
    this.preset = DiscoveryPreset.search,
    this.routeGenre,
  });

  final DiscoveryPreset preset;
  final String? routeGenre;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.read(context);
    final queryTag = GoRouterState.of(context).uri.queryParameters['tag'];

    return BlocProvider(
      create: (_) => SearchCubit(
        catalogRepository: app.catalogRepository,
        preset: preset,
        routeGenre: routeGenre,
        queryTag: queryTag,
      )..initialize(),
      child: _SearchView(assetUrl: app.catalogRepository.assetUrl),
    );
  }
}

class _SearchView extends StatefulWidget {
  const _SearchView({required this.assetUrl});

  final String Function(String? url) assetUrl;

  @override
  State<_SearchView> createState() => _SearchViewState();
}

class _SearchViewState extends State<_SearchView> {
  final _query = TextEditingController();
  final _year = TextEditingController();
  final _author = TextEditingController();
  final _artist = TextEditingController();

  @override
  void dispose() {
    _query.dispose();
    _year.dispose();
    _author.dispose();
    _artist.dispose();
    super.dispose();
  }

  void _syncControllers(SearchState state) {
    _syncController(_query, state.query);
    _syncController(_year, state.year);
    _syncController(_author, state.author);
    _syncController(_artist, state.artist);
  }

  void _syncController(TextEditingController controller, String text) {
    if (controller.text == text) return;

    controller.value = TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<SearchCubit, SearchState>(
      listenWhen: (previous, current) {
        return previous.query != current.query ||
            previous.year != current.year ||
            previous.author != current.author ||
            previous.artist != current.artist;
      },
      listener: (context, state) {
        _syncControllers(state);
      },
      builder: (context, state) {
        final cubit = context.read<SearchCubit>();

        return ListView(
          padding: const EdgeInsets.all(14),
          children: [
            Text(
              searchTitle(preset: state.preset, routeGenre: state.routeGenre),
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            SearchTextFields(
              queryController: _query,
              authorController: _author,
              artistController: _artist,
              onQueryChanged: cubit.setQuery,
              onAuthorChanged: cubit.setAuthor,
              onArtistChanged: cubit.setArtist,
              onSearchSubmitted: () => cubit.load(reset: true),
            ),
            const SizedBox(height: 10),
            SearchSortYearRow(
              sort: state.sort,
              yearController: _year,
              onSortChanged: (value) => cubit.setSort(value),
              onYearChanged: cubit.setYear,
              onSearchSubmitted: () => cubit.load(reset: true),
            ),
            const SizedBox(height: 10),
            SearchFilterChips(
              ratings: state.ratings,
              statuses: state.statuses,
              onRatingSelected: cubit.toggleRating,
              onStatusSelected: cubit.toggleStatus,
            ),
            SearchGenreSection(
              genres: state.genres,
              included: state.included,
              excluded: state.excluded,
              onIncludedSelected: cubit.toggleIncludedTag,
              onExcludedSelected: cubit.toggleExcludedTag,
            ),
            SearchSummary(state: state, onClearFilters: cubit.clearFilters),
            _buildResults(context, state),
          ],
        );
      },
    );
  }

  Widget _buildResults(BuildContext context, SearchState state) {
    final cubit = context.read<SearchCubit>();

    if (state.loading) {
      return const AsyncPane(message: 'Searching...');
    }

    if (state.error != null) {
      return AsyncPane(
        message: state.error!,
        onRetry: () => cubit.load(reset: true),
      );
    }

    if (state.items.isEmpty) {
      return AsyncPane(
        message: state.hasActiveFilters
            ? 'No manga matches these filters.'
            : 'No manga found. Try another title or genre.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(title: '${state.items.length} of ${state.total} results'),
        MangaGrid(
          items: state.items,
          assetUrl: widget.assetUrl,
          onTap: (manga) => context.push('/manga/${manga.id}'),
        ),
        if (state.canLoadMore)
          Padding(
            padding: const EdgeInsets.all(16),
            child: FilledButton(
              onPressed: state.loadingMore
                  ? null
                  : () => cubit.load(reset: false),
              child: Text(state.loadingMore ? 'Loading...' : 'Load more'),
            ),
          ),
      ],
    );
  }
}
