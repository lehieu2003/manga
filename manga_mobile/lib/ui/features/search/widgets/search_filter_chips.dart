import 'package:flutter/material.dart';

class SearchFilterChips extends StatelessWidget {
  const SearchFilterChips({
    super.key,
    required this.ratings,
    required this.statuses,
    required this.onRatingSelected,
    required this.onStatusSelected,
  });

  final List<String> ratings;
  final List<String> statuses;

  final ValueChanged<String> onRatingSelected;
  final ValueChanged<String> onStatusSelected;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          children: ['safe', 'suggestive'].map((rating) {
            return FilterChip(
              label: Text(rating),
              selected: ratings.contains(rating),
              onSelected: (_) => onRatingSelected(rating),
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
              selected: statuses.contains(status),
              onSelected: (_) => onStatusSelected(status),
            );
          }).toList(),
        ),
      ],
    );
  }
}
