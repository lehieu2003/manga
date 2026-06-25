import 'package:flutter/material.dart';

import '../cubit/manga_detail_state.dart';
import '../utils/manga_detail_formatters.dart';
import 'info_chip.dart';

class ChapterFilterBar extends StatelessWidget {
  const ChapterFilterBar({
    super.key,
    required this.state,
    required this.searchController,
    required this.onClearFilters,
    required this.onLanguageSelected,
    required this.onSearchChanged,
    required this.onSortChanged,
  });

  final MangaDetailState state;
  final TextEditingController searchController;

  final VoidCallback onClearFilters;
  final ValueChanged<String> onLanguageSelected;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<String> onSortChanged;

  @override
  Widget build(BuildContext context) {
    final visible = state.visibleChapters;
    final latestPublishAt = state.latestPublishAt;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            InfoChip(label: '${state.languages.length} languages'),
            InfoChip(label: '${visible.length} visible'),
            if (latestPublishAt != null)
              InfoChip(label: 'Latest ${formatMangaDate(latestPublishAt)}'),
            const InfoChip(label: 'Current'),
            const InfoChip(label: 'Read'),
            const InfoChip(label: 'New'),
            if (state.hasChapterFilters)
              ActionChip(
                avatar: const Icon(Icons.clear, size: 16),
                label: const Text('Clear filters'),
                onPressed: onClearFilters,
              ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: ['vi', 'en'].map((language) {
            return FilterChip(
              label: Text(language.toUpperCase()),
              selected: state.languages.contains(language),
              onSelected: (_) => onLanguageSelected(language),
            );
          }).toList(),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: searchController,
                decoration: const InputDecoration(
                  labelText: 'Search chapter',
                  prefixIcon: Icon(Icons.search),
                ),
                onTapOutside: (_) {
                  FocusScope.of(context).unfocus();
                },
                onChanged: onSearchChanged,
              ),
            ),
            const SizedBox(width: 10),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'newest', icon: Icon(Icons.south)),
                ButtonSegment(value: 'oldest', icon: Icon(Icons.north)),
              ],
              selected: {state.sort},
              onSelectionChanged: (value) {
                onSortChanged(value.first);
              },
            ),
          ],
        ),
      ],
    );
  }
}
