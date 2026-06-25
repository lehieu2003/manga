import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/theme.dart';

class VerticalReaderView extends StatelessWidget {
  const VerticalReaderView({
    super.key,
    required this.pages,
    required this.contain,
    required this.onVisible,
  });

  final List<String> pages;
  final bool contain;
  final ValueChanged<int> onVisible;

  @override
  Widget build(BuildContext context) {
    return NotificationListener<ScrollNotification>(
      onNotification: (notification) {
        final viewport = notification.metrics.viewportDimension;

        if (viewport > 0) {
          final next = (notification.metrics.pixels / viewport).round().clamp(
            0,
            pages.length - 1,
          );

          onVisible(next);
        }

        return false;
      },
      child: ListView.builder(
        itemCount: pages.length,
        itemBuilder: (context, index) {
          return CachedNetworkImage(
            imageUrl: pages[index],
            fit: contain ? BoxFit.contain : BoxFit.fitWidth,
            width: double.infinity,
            errorWidget: (_, _, _) {
              return const SizedBox(
                height: 220,
                child: Icon(Icons.broken_image, color: MangaTheme.sakura),
              );
            },
          );
        },
      ),
    );
  }
}
