import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../domain/models/models.dart';
import '../../core/widgets.dart';

class HomePopularSection extends StatelessWidget {
  const HomePopularSection({
    super.key,
    required this.items,
    required this.assetUrl,
  });

  final List<MangaSummary> items;
  final String Function(String? url) assetUrl;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SectionHeader(
          title: 'Popular picks',
          action: TextButton(
            onPressed: () => context.go('/discover/popular'),
            child: const Text('View all'),
          ),
        ),
        MangaGrid(
          items: items,
          assetUrl: assetUrl,
          onTap: (MangaSummary manga) => context.push('/manga/${manga.id}'),
        ),
      ],
    );
  }
}
