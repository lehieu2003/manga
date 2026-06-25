import 'package:flutter/material.dart';

import '../../../core/theme.dart';

class TinyBadge extends StatelessWidget {
  const TinyBadge({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: MangaTheme.amber.withValues(alpha: 0.5)),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: MangaTheme.amber,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}
