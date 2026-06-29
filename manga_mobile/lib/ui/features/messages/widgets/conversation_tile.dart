import 'package:flutter/material.dart';

import '../../../../domain/models/models.dart';
import 'social_avatar.dart';

class ConversationTile extends StatelessWidget {
  const ConversationTile({
    super.key,
    required this.conversation,
    required this.currentUserId,
    required this.selected,
    required this.onTap,
    this.typingLabel,
  });

  final SocialConversation conversation;
  final String currentUserId;
  final bool selected;
  final VoidCallback onTap;
  final String? typingLabel;

  @override
  Widget build(BuildContext context) {
    final latest = conversation.latestMessage;
    final preview = typingLabel != null
        ? '$typingLabel is typing...'
        : latest?.deletedAt != null
        ? 'Deleted message'
        : latest?.mangaShare != null
        ? 'Shared ${latest!.mangaShare!.manga.title}'
        : latest?.content ?? 'No messages yet';

    final scheme = Theme.of(context).colorScheme;
    final avatarUrl = _conversationAvatarUrl(conversation, currentUserId);

    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: selected
              ? scheme.primaryContainer.withValues(alpha: 0.58)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
          child: Row(
            children: [
              SocialAvatar(
                radius: 28,
                label: conversation.titleFor(currentUserId),
                avatarUrl: avatarUrl,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      conversation.titleFor(currentUserId),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      preview,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: typingLabel == null
                            ? scheme.onSurfaceVariant
                            : scheme.primary,
                        fontWeight: typingLabel == null
                            ? FontWeight.normal
                            : FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                _timeLabel(latest?.createdAt ?? conversation.updatedAt),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String? _conversationAvatarUrl(
  SocialConversation conversation,
  String currentUserId,
) {
  if (conversation.avatarUrl != null && conversation.avatarUrl!.isNotEmpty) {
    return conversation.avatarUrl;
  }
  for (final member in conversation.members) {
    if (member.userId != currentUserId) return member.user.avatarUrl;
  }
  return null;
}

String _timeLabel(DateTime date) {
  final local = date.toLocal();
  final hour12 = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final hour = hour12.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  final period = local.hour < 12 ? 'AM' : 'PM';
  return '$hour:$minute $period';
}
