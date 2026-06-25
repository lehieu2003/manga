import 'package:flutter/material.dart';
import 'package:manga_mobile/ui/features/chat/local_chat_message.dart.dart';
import 'package:manga_mobile/ui/features/chat/source_tile.dart.dart';

import '../../core/theme.dart';

class ChatBubble extends StatelessWidget {
  const ChatBubble({
    super.key,
    required this.item,
    required this.pendingMessage,
    required this.onRetry,
  });

  final LocalChatMessage item;
  final String? pendingMessage;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final message = item.message;
    final isUser = message.role == 'user';
    final scheme = Theme.of(context).colorScheme;

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        width: MediaQuery.sizeOf(context).width * 0.82,
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isUser
              ? scheme.primaryContainer
              : item.isError
              ? MangaTheme.sakura.withValues(alpha: 0.2)
              : scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(message.content),
            if (item.isPending)
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: LinearProgressIndicator(),
              ),
            if (item.isError)
              TextButton.icon(
                onPressed: pendingMessage == null ? null : onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            for (final source in message.sources.take(4))
              SourceTile(source: source),
          ],
        ),
      ),
    );
  }
}
