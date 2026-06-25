import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../domain/models/models.dart';
import '../../../core/theme.dart';

class MangaInfoCard extends StatelessWidget {
  const MangaInfoCard({
    super.key,
    required this.manga,
    required this.coverUrl,
    required this.isSignedIn,
    required this.libraryItem,
    required this.error,
    required this.onFollow,
    required this.onRemove,
    required this.onLogin,
  });

  final MangaSummary manga;
  final String coverUrl;
  final bool isSignedIn;
  final LibraryItem? libraryItem;
  final String? error;

  final VoidCallback onFollow;
  final VoidCallback onRemove;
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (coverUrl.isNotEmpty)
            AspectRatio(
              aspectRatio: 0.72,
              child: CachedNetworkImage(imageUrl: coverUrl, fit: BoxFit.cover),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  manga.status ?? 'Manga',
                  style: const TextStyle(
                    color: MangaTheme.amber,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  manga.title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                if (manga.altTitles.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    manga.altTitles.take(3).join(' · '),
                    style: const TextStyle(color: MangaTheme.muted),
                  ),
                ],
                const SizedBox(height: 12),
                Text(
                  manga.description.isEmpty
                      ? 'No description available.'
                      : manga.description,
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: manga.tags
                      .take(12)
                      .map((tag) => Chip(label: Text(tag)))
                      .toList(),
                ),
                if (error != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    error!,
                    style: const TextStyle(color: MangaTheme.sakura),
                  ),
                ],
                const SizedBox(height: 12),
                Wrap(
                  spacing: 10,
                  runSpacing: 8,
                  children: [
                    FilledButton.icon(
                      onPressed: isSignedIn
                          ? (libraryItem == null ? onFollow : null)
                          : onLogin,
                      icon: Icon(
                        libraryItem == null
                            ? Icons.favorite_border
                            : Icons.bookmark_added,
                      ),
                      label: Text(
                        isSignedIn
                            ? (libraryItem == null ? 'Follow' : 'In library')
                            : 'Login to follow',
                      ),
                    ),
                    if (libraryItem != null)
                      OutlinedButton.icon(
                        onPressed: onRemove,
                        icon: const Icon(Icons.delete_outline),
                        label: const Text('Remove'),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
