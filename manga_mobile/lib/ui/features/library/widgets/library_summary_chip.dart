import 'package:flutter/material.dart';

class LibrarySummaryChip extends StatelessWidget {
  const LibrarySummaryChip({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(visualDensity: VisualDensity.compact, label: Text(label));
  }
}
