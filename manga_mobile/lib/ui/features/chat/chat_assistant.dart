import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../domain/models/models.dart';
import '../../app_state.dart';
import '../../core/theme.dart';

const _starterPrompts = [
  'Recommend something completed.',
  'What should I continue reading?',
  'Find romance manga with school-life tags.',
  'Suggest something based on my library.',
];

class ChatAssistantButton extends StatelessWidget {
  const ChatAssistantButton({super.key, this.mangaId, this.chapterId});

  final String? mangaId;
  final String? chapterId;

  @override
  Widget build(BuildContext context) {
    if (!AppScope.of(context).isSignedIn) return const SizedBox.shrink();

    final color = Theme.of(context).colorScheme.primary;

    return Tooltip(
      message: 'Open manga assistant',
      child: GestureDetector(
        onTap: () => showModalBottomSheet<void>(
          context: context,
          isScrollControlled: true,
          builder: (_) =>
              ChatAssistantSheet(mangaId: mangaId, chapterId: chapterId),
        ),
        child: Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.35),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: const Icon(
            Icons.chat_bubble_outline,
            color: Colors.white,
            size: 26,
          ),
        ),
      ),
    );
  }
}

class ChatAssistantSheet extends StatefulWidget {
  const ChatAssistantSheet({super.key, this.mangaId, this.chapterId});

  final String? mangaId;
  final String? chapterId;

  @override
  State<ChatAssistantSheet> createState() => _ChatAssistantSheetState();
}

class _ChatAssistantSheetState extends State<ChatAssistantSheet> {
  final _input = TextEditingController();
  final List<_LocalChatMessage> _messages = [];
  String? _conversationId;
  String? _pendingMessage;
  bool _sending = false;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  Future<void> _send([String? forcedMessage]) async {
    final content = (forcedMessage ?? _input.text).trim();
    if (content.isEmpty || _sending) return;
    _input.clear();
    setState(() {
      _sending = true;
      _pendingMessage = content;
      _messages.add(
        _LocalChatMessage(
          message: ChatMessage(
            id: 'local-${DateTime.now().microsecondsSinceEpoch}',
            role: 'user',
            content: content,
            createdAt: DateTime.now(),
          ),
        ),
      );
      _messages.add(
        _LocalChatMessage(
          message: ChatMessage(
            id: 'pending-${DateTime.now().microsecondsSinceEpoch}',
            role: 'assistant',
            content: 'Thinking...',
            createdAt: DateTime.now(),
          ),
          isPending: true,
        ),
      );
    });
    try {
      final response = await AppScope.of(context).chatRepository.sendMessage(
        conversationId: _conversationId,
        message: content,
        mangaId: widget.mangaId,
        chapterId: widget.chapterId,
      );
      setState(() {
        _conversationId = response.conversationId;
        _messages.removeWhere((item) => item.isPending);
        _messages.add(_LocalChatMessage(message: response.message));
        _pendingMessage = null;
      });
    } catch (error) {
      setState(() {
        final pendingIndex = _messages.indexWhere((item) => item.isPending);
        if (pendingIndex >= 0) {
          _messages[pendingIndex] = _LocalChatMessage(
            message: ChatMessage(
              id: 'error-${DateTime.now().microsecondsSinceEpoch}',
              role: 'assistant',
              content: error.toString(),
              createdAt: DateTime.now(),
            ),
            isError: true,
          );
        }
      });
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 12, 16, 16 + bottomInset),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.78,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const CircleAvatar(child: Icon(Icons.smart_toy_outlined)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _messages.isEmpty
                              ? 'Ask the shelf'
                              : 'Manga assistant',
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w900),
                        ),
                        const Text('Catalog RAG'),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: _messages.isEmpty
                    ? _StarterPrompts(onSend: _send)
                    : ListView.builder(
                        itemCount: _messages.length,
                        itemBuilder: (context, index) => _ChatBubble(
                          item: _messages[index],
                          pendingMessage: _pendingMessage,
                          onRetry: () => _send(_pendingMessage),
                        ),
                      ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      maxLength: 1200,
                      minLines: 1,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Ask for manga...',
                        counterText: '',
                      ),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _sending ? null : () => _send(),
                    icon: const Icon(Icons.send),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StarterPrompts extends StatelessWidget {
  const _StarterPrompts({required this.onSend});

  final Future<void> Function(String message) onSend;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        for (final prompt in _starterPrompts)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: OutlinedButton(
              onPressed: () => onSend(prompt),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(prompt),
              ),
            ),
          ),
      ],
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({
    required this.item,
    required this.pendingMessage,
    required this.onRetry,
  });

  final _LocalChatMessage item;
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
              _SourceTile(source: source),
          ],
        ),
      ),
    );
  }
}

class _SourceTile extends StatelessWidget {
  const _SourceTile({required this.source});

  final ChatSource source;

  @override
  Widget build(BuildContext context) {
    final coverUrl = AppScope.of(
      context,
    ).catalogRepository.assetUrl(source.coverUrl);
    return Card(
      child: ListTile(
        leading: SizedBox(
          width: 42,
          height: 56,
          child: coverUrl.isEmpty
              ? const Icon(Icons.menu_book_outlined)
              : CachedNetworkImage(imageUrl: coverUrl, fit: BoxFit.cover),
        ),
        title: Text(source.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text(
          source.type == 'chapter' ? 'Chapter source' : 'Manga source',
        ),
        trailing: const Icon(Icons.open_in_new),
        onTap: () {
          final router = GoRouter.of(context);
          Navigator.pop(context);
          router.push(
            source.type == 'chapter'
                ? '/read/${source.id}'
                : '/manga/${source.id}',
          );
        },
      ),
    );
  }
}

class _LocalChatMessage {
  const _LocalChatMessage({
    required this.message,
    this.isPending = false,
    this.isError = false,
  });

  final ChatMessage message;
  final bool isPending;
  final bool isError;
}
