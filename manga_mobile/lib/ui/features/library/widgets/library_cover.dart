import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/theme.dart';

class LibraryCover extends StatelessWidget {
  const LibraryCover({super.key, required this.coverUrl});

  final String coverUrl;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        width: 72,
        height: 104,
        child: coverUrl.isEmpty
            ? const ColoredBox(
                color: MangaTheme.panelStrong,
                child: Icon(Icons.menu_book_outlined, color: MangaTheme.amber),
              )
            : CachedNetworkImage(
                imageUrl: coverUrl,
                fit: BoxFit.cover,
                placeholder: (_, _) => const ColoredBox(
                  color: MangaTheme.panelStrong,
                  child: Center(
                    child: SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
                errorWidget: (_, _, _) => const ColoredBox(
                  color: MangaTheme.panelStrong,
                  child: Icon(
                    Icons.broken_image_outlined,
                    color: MangaTheme.muted,
                  ),
                ),
              ),
      ),
    );
  }
}
