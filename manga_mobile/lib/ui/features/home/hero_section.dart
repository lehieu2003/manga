import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app_state.dart';
import '../../core/theme.dart';

class HomeHeroSection extends StatelessWidget {
  const HomeHeroSection({super.key, required this.app});

  final AppState app;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'MANGA CAFE READER',
              style: TextStyle(
                color: MangaTheme.amber,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'A warm shelf for reading, tracking, and continuing every chapter.',
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 10,
              children: [
                FilledButton.icon(
                  onPressed: () => context.go('/search'),
                  icon: const Icon(Icons.explore),
                  label: const Text('Explore'),
                ),
                OutlinedButton.icon(
                  onPressed: () =>
                      context.go(app.isSignedIn ? '/library' : '/login'),
                  icon: const Icon(Icons.history),
                  label: const Text('Continue'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
