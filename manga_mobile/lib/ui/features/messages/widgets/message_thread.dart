import 'package:flutter/material.dart';

import '../cubit/messages_state.dart';
import 'message_bubble.dart';

class MessageThread extends StatelessWidget {
  const MessageThread({
    super.key,
    required this.state,
    required this.currentUserId,
    required this.messageController,
    required this.onBack,
    required this.onSend,
    required this.onTypingChanged,
    required this.onTypingStopped,
    this.showBackButton = false,
  });

  final MessagesState state;
  final String currentUserId;
  final TextEditingController messageController;
  final VoidCallback onBack;
  final ValueChanged<String> onSend;
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
    final typingName = state.typingUsers[conversation.id];

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
                : CircleAvatar(child: Text(title.characters.first)),
            title: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
            subtitle: Text(
              typingName == null ? 'Active now' : '$typingName is typing...',
            ),
            trailing: IconButton(
              tooltip: 'Conversation options',
              onPressed: () {},
              icon: const Icon(Icons.more_horiz),
            ),
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: state.messages.isEmpty
              ? const Center(child: Text('No messages yet.'))
              : ListView.builder(
                  reverse: true,
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 18),
                  itemCount: state.messages.length,
                  itemBuilder: (context, index) {
                    final message =
                        state.messages[state.messages.length - 1 - index];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: MessageBubble(
                        message: message,
                        own: message.senderId == currentUserId,
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
                    tooltip: 'More actions',
                    onPressed: () {},
                    icon: const Icon(Icons.add_circle_outline),
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
