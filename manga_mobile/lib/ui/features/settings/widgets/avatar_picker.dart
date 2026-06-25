import 'dart:io';

import 'package:flutter/material.dart';

class AvatarPicker extends StatelessWidget {
  const AvatarPicker({
    super.key,
    required this.imagePath,
    required this.avatarUrl,
    required this.onPick,
  });

  final String? imagePath;
  final String? avatarUrl;
  final VoidCallback? onPick;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasAvatar = imagePath != null || (avatarUrl?.isNotEmpty ?? false);

    return Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox.square(
            dimension: 72,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
              ),
              child: !hasAvatar
                  ? Icon(
                      Icons.person_outline,
                      color: theme.colorScheme.primary,
                      size: 32,
                    )
                  : imagePath != null
                  ? Image.file(File(imagePath!), fit: BoxFit.cover)
                  : Image.network(
                      avatarUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) =>
                          const Icon(Icons.broken_image_outlined),
                    ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Avatar image',
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Choose a JPG, PNG, WebP, or GIF from your device.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: onPick,
                icon: const Icon(Icons.photo_library_outlined),
                label: Text(
                  imagePath == null ? 'Choose image' : 'Change image',
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
