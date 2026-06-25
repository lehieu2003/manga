import 'package:flutter/material.dart';

class SearchSummaryChip extends StatelessWidget {
  const SearchSummaryChip({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(visualDensity: VisualDensity.compact, label: Text(label));
  }
}
