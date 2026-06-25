import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/theme.dart';

class PagedReaderView extends StatelessWidget {
  const PagedReaderView({
    super.key,
    required this.pages,
    required this.pageIndex,
    required this.contain,
    required this.onPageChanged,
  });

  final List<String> pages;
  final int pageIndex;
  final bool contain;
  final ValueChanged<int> onPageChanged;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapUp: (details) {
        final width = MediaQuery.sizeOf(context).width;

        onPageChanged(
          details.localPosition.dx > width / 2 ? pageIndex + 1 : pageIndex - 1,
        );
      },
      onHorizontalDragEnd: (details) {
        final velocity = details.primaryVelocity ?? 0;

        if (velocity < 0) {
          onPageChanged(pageIndex + 1);
        }

        if (velocity > 0) {
          onPageChanged(pageIndex - 1);
        }
      },
      child: Center(
        child: CachedNetworkImage(
          imageUrl: pages[pageIndex],
          fit: contain ? BoxFit.contain : BoxFit.fitWidth,
          width: double.infinity,
          errorWidget: (_, _, _) {
            return const Icon(Icons.broken_image, color: MangaTheme.sakura);
          },
        ),
      ),
    );
  }
}
