import 'package:flutter/material.dart';

import '../../../domain/models/models.dart';
import '../../core/widgets.dart';

class HomeGenreSection extends StatelessWidget {
  const HomeGenreSection({
    super.key,
    required this.genres,
    required this.onGenreTap,
  });

  final List<GenreSummary> genres;
  final ValueChanged<String> onGenreTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(title: 'Browse by genre'),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: genres.take(14).map((genre) {
            return ActionChip(
              label: Text('${genre.name} ${genre.count}'),
              onPressed: () => onGenreTap(genre.name),
            );
          }).toList(),
        ),
      ],
    );
  }
}
