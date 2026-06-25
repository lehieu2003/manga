import 'package:flutter/material.dart';

class SearchTextFields extends StatelessWidget {
  const SearchTextFields({
    super.key,
    required this.queryController,
    required this.authorController,
    required this.artistController,
    required this.onQueryChanged,
    required this.onAuthorChanged,
    required this.onArtistChanged,
    required this.onSearchSubmitted,
  });

  final TextEditingController queryController;
  final TextEditingController authorController;
  final TextEditingController artistController;

  final ValueChanged<String> onQueryChanged;
  final ValueChanged<String> onAuthorChanged;
  final ValueChanged<String> onArtistChanged;
  final VoidCallback onSearchSubmitted;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TextField(
          controller: queryController,
          decoration: InputDecoration(
            labelText: 'Title or keyword',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: IconButton(
              icon: const Icon(Icons.arrow_forward),
              onPressed: onSearchSubmitted,
            ),
          ),
          onChanged: onQueryChanged,
          onTapOutside: (_) {
            FocusScope.of(context).unfocus();
          },
          onSubmitted: (_) => onSearchSubmitted(),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: authorController,
                decoration: const InputDecoration(
                  labelText: 'Author',
                  prefixIcon: Icon(Icons.person_search_outlined),
                ),
                onChanged: onAuthorChanged,
                onSubmitted: (_) => onSearchSubmitted(),
                onTapOutside: (_) {
                  FocusScope.of(context).unfocus();
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: artistController,
                decoration: const InputDecoration(
                  labelText: 'Artist',
                  prefixIcon: Icon(Icons.brush_outlined),
                ),
                onChanged: onArtistChanged,
                onSubmitted: (_) => onSearchSubmitted(),
                onTapOutside: (_) {
                  FocusScope.of(context).unfocus();
                },
              ),
            ),
          ],
        ),
      ],
    );
  }
}
