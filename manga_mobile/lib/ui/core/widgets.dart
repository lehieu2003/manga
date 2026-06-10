import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../domain/models/models.dart';

class MangaCardTile extends StatelessWidget {
  const MangaCardTile({
    super.key,
    required this.manga,
    required this.assetUrl,
    required this.onTap,
  });

  final MangaSummary manga;
  final String Function(String? url) assetUrl;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cover = assetUrl(manga.coverUrl);
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 0.72,
              child: cover.isEmpty
                  ? ColoredBox(
                      color: scheme.surfaceContainerHighest,
                      child: Icon(
                        Icons.menu_book_outlined,
                        size: 42,
                        color: scheme.primary,
                      ),
                    )
                  : CachedNetworkImage(
                      imageUrl: cover,
                      fit: BoxFit.cover,
                      errorWidget: (_, _, _) =>
                          const Icon(Icons.broken_image_outlined),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    manga.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    [
                      manga.status,
                      manga.year?.toString(),
                    ].whereType<String>().join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MangaGrid extends StatelessWidget {
  const MangaGrid({
    super.key,
    required this.items,
    required this.assetUrl,
    required this.onTap,
  });

  final List<MangaSummary> items;
  final String Function(String? url) assetUrl;
  final void Function(MangaSummary manga) onTap;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.48,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) => MangaCardTile(
        manga: items[index],
        assetUrl: assetUrl,
        onTap: () => onTap(items[index]),
      ),
    );
  }
}

class AsyncPane extends StatelessWidget {
  const AsyncPane({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.action});

  final String title;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 20, 4, 10),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
            ),
          ),
          if (action != null) action!,
        ],
      ),
    );
  }
}
