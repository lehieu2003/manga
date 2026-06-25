import 'package:flutter/material.dart';

import '../cubit/search_state.dart';
import '../utils/search_formatters.dart';
import 'search_summary_chip.dart';

class SearchSummary extends StatelessWidget {
  const SearchSummary({
    super.key,
    required this.state,
    required this.onClearFilters,
  });

  final SearchState state;
  final VoidCallback onClearFilters;

  @override
  Widget build(BuildContext context) {
    if (!state.hasActiveFilters && state.source == null) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          if (state.source != null)
            SearchSummaryChip(
              label: state.source == 'cache'
                  ? 'Cached results'
                  : 'Live results',
            ),
          SearchSummaryChip(
            label: '${state.items.length} of ${state.total} shown',
          ),
          SearchSummaryChip(label: searchSortLabel(state.sort)),
          if (state.query.trim().isNotEmpty)
            SearchSummaryChip(label: 'Search: ${state.query.trim()}'),
          if (state.author.trim().isNotEmpty)
            SearchSummaryChip(label: 'Author: ${state.author.trim()}'),
          if (state.artist.trim().isNotEmpty)
            SearchSummaryChip(label: 'Artist: ${state.artist.trim()}'),
          for (final tag in state.included)
            SearchSummaryChip(label: 'Include: $tag'),
          for (final tag in state.excluded)
            SearchSummaryChip(label: 'Exclude: $tag'),
          for (final rating in state.ratings) SearchSummaryChip(label: rating),
          for (final status in state.statuses) SearchSummaryChip(label: status),
          if (state.year.trim().isNotEmpty)
            SearchSummaryChip(label: 'Year: ${state.year.trim()}'),
          if (state.hasActiveFilters)
            ActionChip(
              avatar: const Icon(Icons.clear, size: 16),
              label: const Text('Clear filters'),
              onPressed: onClearFilters,
            ),
        ],
      ),
    );
  }
}
