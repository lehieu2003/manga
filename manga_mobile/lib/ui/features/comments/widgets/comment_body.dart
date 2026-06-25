import 'package:flutter/material.dart';

import '../../../../domain/models/models.dart';
import '../../../core/theme.dart';

class CommentBody extends StatelessWidget {
  const CommentBody({
    super.key,
    required this.comment,
    required this.revealed,
    required this.onReveal,
  });

  final CommentItem comment;
  final bool revealed;
  final VoidCallback onReveal;

  @override
  Widget build(BuildContext context) {
    if (!comment.isVisible) {
      return Text(
        comment.status == 'DELETED'
            ? 'Comment deleted'
            : 'Comment hidden by moderation',
        style: const TextStyle(color: MangaTheme.muted),
      );
    }

    if (comment.isSpoiler && !revealed) {
      return OutlinedButton.icon(
        onPressed: onReveal,
        icon: const Icon(Icons.visibility),
        label: const Text('Spoiler hidden. Tap to reveal.'),
      );
    }

    return Text(comment.content);
  }
}
