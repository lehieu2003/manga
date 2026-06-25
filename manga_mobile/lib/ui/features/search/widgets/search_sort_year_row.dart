import 'package:flutter/material.dart';

class SearchSortYearRow extends StatelessWidget {
  const SearchSortYearRow({
    super.key,
    required this.sort,
    required this.yearController,
    required this.onSortChanged,
    required this.onYearChanged,
    required this.onSearchSubmitted,
  });

  final String sort;
  final TextEditingController yearController;
  final ValueChanged<String> onSortChanged;
  final ValueChanged<String> onYearChanged;
  final VoidCallback onSearchSubmitted;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: DropdownButtonFormField<String>(
            value: sort,
            decoration: const InputDecoration(labelText: 'Sort'),
            items: const [
              DropdownMenuItem(value: 'relevance', child: Text('Relevance')),
              DropdownMenuItem(value: 'latest', child: Text('Latest')),
              DropdownMenuItem(value: 'followed', child: Text('Popular')),
              DropdownMenuItem(value: 'title', child: Text('Title A-Z')),
              DropdownMenuItem(value: 'created', child: Text('Created')),
              DropdownMenuItem(value: 'updated', child: Text('Updated')),
            ],
            onChanged: (value) {
              onSortChanged(value ?? 'relevance');
            },
          ),
        ),
        const SizedBox(width: 10),
        SizedBox(
          width: 110,
          child: TextField(
            controller: yearController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Year'),
            onChanged: onYearChanged,
            onSubmitted: (_) => onSearchSubmitted(),
            onTapOutside: (_) {
              FocusScope.of(context).unfocus();
            },
          ),
        ),
      ],
    );
  }
}
