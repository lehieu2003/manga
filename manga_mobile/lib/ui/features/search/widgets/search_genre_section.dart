import 'package:flutter/material.dart';

import '../../../../domain/models/models.dart';
import '../../../core/widgets.dart';

class SearchGenreSection extends StatelessWidget {
  const SearchGenreSection({
    super.key,
    required this.genres,
    required this.included,
    required this.excluded,
    required this.onIncludedSelected,
    required this.onExcludedSelected,
  });

  final List<GenreSummary> genres;
  final List<String> included;
  final List<String> excluded;

  final ValueChanged<String> onIncludedSelected;
  final ValueChanged<String> onExcludedSelected;

  @override
  Widget build(BuildContext context) {
    if (genres.isEmpty) return const SizedBox.shrink();

    final shownGenres = genres.take(18).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(title: 'Include tags'),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: shownGenres.map((genre) {
            return FilterChip(
              label: Text(genre.name),
              selected: included.contains(genre.name),
              onSelected: (_) => onIncludedSelected(genre.name),
            );
          }).toList(),
        ),
        SectionHeader(title: 'Exclude tags'),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: shownGenres.map((genre) {
            return FilterChip(
              label: Text(genre.name),
              selected: excluded.contains(genre.name),
              onSelected: (_) => onExcludedSelected(genre.name),
            );
          }).toList(),
        ),
      ],
    );
  }
}
