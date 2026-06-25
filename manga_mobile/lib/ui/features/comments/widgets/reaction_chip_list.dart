import 'package:flutter/material.dart';

import '../../../../domain/models/models.dart';
import '../utils/comment_formatters.dart';

const reactionTypes = ['LIKE', 'HEART', 'SAD', 'LAUGH', 'ANGRY'];

class ReactionChipList extends StatelessWidget {
  const ReactionChipList({
    super.key,
    required this.comment,
    required this.user,
    required this.visible,
    required this.onToggleReaction,
  });

  final CommentItem comment;
  final User? user;
  final bool visible;
  final ValueChanged<String> onToggleReaction;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final type in reactionTypes)
          FilterChip(
            label: Text(
              '${reactionLabel(type)} ${comment.reactionCounts[type] ?? 0}',
            ),
            selected: comment.currentUserReaction == type,
            onSelected: user == null || !visible
                ? null
                : (_) => onToggleReaction(type),
          ),
      ],
    );
  }
}
