import 'package:flutter/material.dart';

import '../../../../domain/models/models.dart';

class MessageBubble extends StatelessWidget {
  const MessageBubble({super.key, required this.message, required this.own});

  final SocialMessage message;
  final bool own;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final content = message.deletedAt != null
        ? 'Deleted message'
        : message.content ?? '';

    return Row(
      mainAxisAlignment: own ? MainAxisAlignment.end : MainAxisAlignment.start,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (!own) ...[
          CircleAvatar(
            radius: 12,
            child: Text(message.sender?.displayName.characters.first ?? '?'),
          ),
          const SizedBox(width: 6),
        ],
        Flexible(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 340),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: own ? scheme.primary : scheme.surfaceContainerHighest,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(20),
                  topRight: const Radius.circular(20),
                  bottomLeft: Radius.circular(own ? 20 : 6),
                  bottomRight: Radius.circular(own ? 6 : 20),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 9,
                ),
                child: Column(
                  crossAxisAlignment: own
                      ? CrossAxisAlignment.end
                      : CrossAxisAlignment.start,
                  children: [
                    Text(
                      content,
                      style: TextStyle(
                        color: own ? scheme.onPrimary : scheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _timeLabel(message.createdAt),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: own
                            ? scheme.onPrimary.withValues(alpha: 0.76)
                            : scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

String _timeLabel(DateTime date) {
  final local = date.toLocal();
  final hour12 = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final hour = hour12.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  final period = local.hour < 12 ? 'AM' : 'PM';
  return '$hour:$minute $period';
}
