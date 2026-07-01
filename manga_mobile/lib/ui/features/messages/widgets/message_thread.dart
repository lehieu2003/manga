import 'package:flutter/material.dart';

import '../../../../domain/models/models.dart';
import '../cubit/messages_state.dart';
import 'message_bubble.dart';
import 'social_avatar.dart';

class MessageThread extends StatelessWidget {
  const MessageThread({
    super.key,
    required this.state,
    required this.currentUserId,
    required this.messageController,
    required this.onBack,
    required this.onSend,
    required this.onShareManga,
    required this.onInviteMember,
    required this.onCancelInvite,
    required this.onToggleMute,
    required this.onToggleReaction,
    required this.onTypingChanged,
    required this.onTypingStopped,
    this.showBackButton = false,
  });

  final MessagesState state;
  final String currentUserId;
  final TextEditingController messageController;
  final VoidCallback onBack;
  final ValueChanged<String> onSend;
  final VoidCallback onShareManga;
  final VoidCallback onInviteMember;
  final ValueChanged<String> onCancelInvite;
  final VoidCallback onToggleMute;
  final void Function(SocialMessage message, String emoji) onToggleReaction;
  final ValueChanged<String> onTypingChanged;
  final VoidCallback onTypingStopped;
  final bool showBackButton;

  @override
  Widget build(BuildContext context) {
    final conversation = state.selectedConversation;
    if (conversation == null) {
      return const Center(child: Text('No active conversation.'));
    }

    final title = conversation.titleFor(currentUserId);
    final typingName = typingLabelFor(state.typingUsers, conversation.id);
    final typingSentence = typingSentenceFor(typingName);
    final avatarUrl = _conversationAvatarUrl(conversation, currentUserId);
    final canManageInvites =
        conversation.type == 'GROUP' &&
        conversation.currentMember?.status == 'ACTIVE' &&
        (conversation.currentMember?.role == 'OWNER' ||
            conversation.currentMember?.role == 'ADMIN');
    final pendingMembers = conversation.members
        .where((member) => member.status == 'PENDING_INVITE')
        .toList();
    final mutedUntil = conversation.currentMember?.mutedUntil;
    final isMuted = mutedUntil != null && mutedUntil.isAfter(DateTime.now());

    return Column(
      children: [
        SafeArea(
          bottom: false,
          child: ListTile(
            leading: showBackButton
                ? IconButton(
                    tooltip: 'Back to chats',
                    onPressed: onBack,
                    icon: const Icon(Icons.arrow_back),
                  )
                : SocialAvatar(label: title, avatarUrl: avatarUrl),
            title: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
            subtitle: Text(
              typingSentence.isEmpty ? 'Active now' : typingSentence,
            ),
            trailing: canManageInvites
                ? Wrap(
                    spacing: 4,
                    children: [
                      IconButton.filledTonal(
                        tooltip: 'Invite member',
                        onPressed: onInviteMember,
                        icon: const Icon(Icons.person_add_alt),
                      ),
                      IconButton(
                        tooltip: isMuted
                            ? 'Unmute conversation'
                            : 'Mute conversation',
                        onPressed: onToggleMute,
                        icon: Icon(
                          isMuted
                              ? Icons.notifications_off
                              : Icons.notifications_none,
                        ),
                      ),
                    ],
                  )
                : IconButton(
                    tooltip: isMuted
                        ? 'Unmute conversation'
                        : 'Mute conversation',
                    onPressed: onToggleMute,
                    icon: Icon(
                      isMuted
                          ? Icons.notifications_off
                          : Icons.notifications_none,
                    ),
                  ),
          ),
        ),
        if (canManageInvites && pendingMembers.isNotEmpty)
          SizedBox(
            height: 44,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              scrollDirection: Axis.horizontal,
              itemCount: pendingMembers.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final member = pendingMembers[index];
                return InputChip(
                  avatar: SocialAvatar(
                    label: member.user.displayName,
                    avatarUrl: member.user.avatarUrl,
                    radius: 12,
                  ),
                  label: Text(member.user.displayName),
                  tooltip: 'Cancel invite for ${member.user.displayName}',
                  onDeleted: () => onCancelInvite(member.userId),
                  deleteIcon: const Icon(Icons.close, size: 16),
                );
              },
            ),
          ),
        const Divider(height: 1),
        Expanded(
          child: state.messages.isEmpty && typingName.isEmpty
              ? const Center(child: Text('No messages yet.'))
              : ListView.builder(
                  reverse: true,
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 18),
                  itemCount:
                      state.messages.length + (typingName.isEmpty ? 0 : 1),
                  itemBuilder: (context, index) {
                    if (typingName.isNotEmpty && index == 0) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: _TypingIndicator(label: typingSentence),
                      );
                    }
                    final messageIndex =
                        state.messages.length -
                        1 -
                        (typingName.isEmpty ? index : index - 1);
                    final message = state.messages[messageIndex];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: MessageBubble(
                        message: message,
                        own: message.senderId == currentUserId,
                        onToggleReaction: (emoji) =>
                            onToggleReaction(message, emoji),
                      ),
                    );
                  },
                ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(28),
              ),
              child: Row(
                children: [
                  const SizedBox(width: 8),
                  IconButton(
                    tooltip: 'Share manga',
                    onPressed: onShareManga,
                    icon: const Icon(Icons.menu_book_outlined),
                  ),
                  Expanded(
                    child: TextField(
                      controller: messageController,
                      minLines: 1,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        hintText: 'Message',
                        border: InputBorder.none,
                      ),
                      onChanged: onTypingChanged,
                      onTapOutside: (_) => FocusScope.of(context).unfocus(),
                    ),
                  ),
                  IconButton.filled(
                    tooltip: 'Send message',
                    onPressed: state.sending
                        ? null
                        : () {
                            final text = messageController.text;
                            messageController.clear();
                            onTypingStopped();
                            onSend(text);
                          },
                    icon: state.sending
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send),
                  ),
                  const SizedBox(width: 6),
                ],
              ),
            ),
          ),
        ),
      ],
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

class _TypingIndicator extends StatelessWidget {
  const _TypingIndicator({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      key: const ValueKey('message-thread-typing-indicator'),
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        const CircleAvatar(radius: 12, child: Text('...')),
        const SizedBox(width: 6),
        DecoratedBox(
          decoration: BoxDecoration(
            color: scheme.surfaceContainerHighest,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
              bottomLeft: Radius.circular(6),
              bottomRight: Radius.circular(20),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
            child: Text(
              label,
              style: TextStyle(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
