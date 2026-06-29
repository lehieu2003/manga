import 'package:flutter/material.dart';

import '../../../app_state.dart';

class SocialAvatar extends StatefulWidget {
  const SocialAvatar({
    super.key,
    required this.label,
    this.avatarUrl,
    this.radius = 24,
    this.icon,
  });

  final String label;
  final String? avatarUrl;
  final double radius;
  final IconData? icon;

  @override
  State<SocialAvatar> createState() => _SocialAvatarState();
}

class _SocialAvatarState extends State<SocialAvatar> {
  String? _failedUrl;

  @override
  Widget build(BuildContext context) {
    final resolved = widget.avatarUrl == null || widget.avatarUrl!.trim().isEmpty
        ? ''
        : AppScope.read(context).catalogRepository.assetUrl(widget.avatarUrl);
    final fallback = widget.icon == null
        ? Text(_initial(widget.label))
        : Icon(widget.icon, size: widget.radius * 0.86);

    if (resolved.isEmpty || resolved == _failedUrl) {
      return CircleAvatar(radius: widget.radius, child: fallback);
    }

    return CircleAvatar(
      radius: widget.radius,
      backgroundImage: NetworkImage(resolved),
      onBackgroundImageError: (_, _) {
        if (mounted) setState(() => _failedUrl = resolved);
      },
      child: null,
    );
  }
}

String _initial(String label) {
  final trimmed = label.trim();
  if (trimmed.isEmpty) return '?';
  return trimmed.characters.first.toUpperCase();
}
