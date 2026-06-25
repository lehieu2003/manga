import 'package:flutter/material.dart';

class ChapterGroupFilters extends StatelessWidget {
  const ChapterGroupFilters({
    super.key,
    required this.groups,
    required this.selectedGroups,
    required this.onSelected,
  });

  final List<String> groups;
  final Set<String> selectedGroups;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    if (groups.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: groups.map((group) {
          return FilterChip(
            label: Text(group),
            selected: selectedGroups.contains(group),
            onSelected: (_) => onSelected(group),
          );
        }).toList(),
      ),
    );
  }
}
