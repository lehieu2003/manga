import 'package:flutter/material.dart';
import 'package:manga_mobile/ui/features/chat/local_chat_message.dart.dart';

import '../../../domain/models/models.dart';
import '../../app_state.dart';
import 'chat_bubble.dart';
import 'starter_prompts.dart';

class ChatAssistantSheet extends StatefulWidget {
  const ChatAssistantSheet({super.key, this.mangaId, this.chapterId});

  final String? mangaId;
  final String? chapterId;

  @override
  State<ChatAssistantSheet> createState() => _ChatAssistantSheetState();
}

class _ChatAssistantSheetState extends State<ChatAssistantSheet> {
  final _input = TextEditingController();
  final _scrollController = ScrollController();

  final List<LocalChatMessage> _messages = [];

  String? _conversationId;
  String? _pendingMessage;
  bool _sending = false;

  @override
  void dispose() {
    _input.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;

      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send([String? forcedMessage]) async {
    final content = (forcedMessage ?? _input.text).trim();

    if (content.isEmpty || _sending) return;

    _input.clear();

    setState(() {
      _sending = true;
      _pendingMessage = content;

      _messages.add(
        LocalChatMessage(
          message: ChatMessage(
            id: 'local-${DateTime.now().microsecondsSinceEpoch}',
            role: 'user',
            content: content,
            createdAt: DateTime.now(),
          ),
        ),
      );

      _messages.add(
        LocalChatMessage(
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

    _scrollToBottom();

    try {
      final response = await AppScope.of(context).chatRepository.sendMessage(
        conversationId: _conversationId,
        message: content,
        mangaId: widget.mangaId,
        chapterId: widget.chapterId,
      );

      if (!mounted) return;

      setState(() {
        _conversationId = response.conversationId;
        _messages.removeWhere((item) => item.isPending);
        _messages.add(LocalChatMessage(message: response.message));
        _pendingMessage = null;
      });

      _scrollToBottom();
    } catch (error) {
      if (!mounted) return;

      setState(() {
        final pendingIndex = _messages.indexWhere((item) => item.isPending);

        if (pendingIndex >= 0) {
          _messages[pendingIndex] = LocalChatMessage(
            message: ChatMessage(
              id: 'error-${DateTime.now().microsecondsSinceEpoch}',
              role: 'assistant',
              content: 'Something went wrong. Please try again.',
              createdAt: DateTime.now(),
            ),
            isError: true,
          );
        }
      });

      _scrollToBottom();
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
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
              _buildHeader(context),
              const SizedBox(height: 12),
              Expanded(
                child: _messages.isEmpty
                    ? StarterPrompts(onSend: _send)
                    : ListView.builder(
                        controller: _scrollController,
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          return ChatBubble(
                            item: _messages[index],
                            pendingMessage: _pendingMessage,
                            onRetry: () => _send(_pendingMessage),
                          );
                        },
                      ),
              ),
              const SizedBox(height: 10),
              _buildInputBar(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      children: [
        const CircleAvatar(child: Icon(Icons.smart_toy_outlined)),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _messages.isEmpty ? 'Ask the shelf' : 'Manga assistant',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
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
    );
  }

  Widget _buildInputBar() {
    return Row(
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
            onTapOutside: (_) {
              FocusScope.of(context).unfocus();
            },
            onSubmitted: (_) => _send(),
          ),
        ),
        const SizedBox(width: 8),
        IconButton.filled(
          onPressed: _sending ? null : () => _send(),
          icon: const Icon(Icons.send),
        ),
      ],
    );
  }
}
