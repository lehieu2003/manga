import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../app_state.dart';
import 'chat_bubble.dart';
import 'cubit/chat_assistant_cubit.dart';
import 'cubit/chat_assistant_state.dart';
import 'starter_prompts.dart';

class ChatAssistantSheet extends StatelessWidget {
  const ChatAssistantSheet({super.key, this.mangaId, this.chapterId});

  final String? mangaId;
  final String? chapterId;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.read(context);
    return BlocProvider(
      create: (context) => ChatAssistantCubit(
        chatRepository: app.chatRepository,
        mangaId: mangaId,
        chapterId: chapterId,
      ),
      child: const _ChatAssistantView(),
    );
  }
}

class _ChatAssistantView extends StatefulWidget {
  const _ChatAssistantView();

  @override
  State<_ChatAssistantView> createState() => _ChatAssistantViewState();
}

class _ChatAssistantViewState extends State<_ChatAssistantView> {
  final _input = TextEditingController();
  final _scrollController = ScrollController();

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

  void _send(BuildContext context, [String? forcedMessage]) {
    final content = (forcedMessage ?? _input.text).trim();

    if (content.isEmpty) return;

    _input.clear();
    context.read<ChatAssistantCubit>().sendMessage(content);
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return BlocConsumer<ChatAssistantCubit, ChatAssistantState>(
      listenWhen: (previous, current) {
        return previous.messages.length != current.messages.length ||
            previous.sending != current.sending;
      },
      listener: (context, state) {
        _scrollToBottom();
      },
      builder: (context, state) {
        return GestureDetector(
          behavior: HitTestBehavior.translucent,
          onTap: () {
            FocusScope.of(context).unfocus();
          },
          child: SafeArea(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 12, 16, 16 + bottomInset),
              child: SizedBox(
                height: MediaQuery.sizeOf(context).height * 0.78,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeader(context, state),
                    const SizedBox(height: 12),
                    Expanded(
                      child: state.messages.isEmpty
                          ? StarterPrompts(
                              onSend: (message) async {
                                _send(context, message);
                              },
                            )
                          : ListView.builder(
                              controller: _scrollController,
                              itemCount: state.messages.length,
                              itemBuilder: (context, index) {
                                return ChatBubble(
                                  item: state.messages[index],
                                  pendingMessage: state.pendingMessage,
                                  onRetry: () {
                                    context
                                        .read<ChatAssistantCubit>()
                                        .retryLastMessage();
                                  },
                                );
                              },
                            ),
                    ),
                    const SizedBox(height: 10),
                    _buildInputBar(context, state),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context, ChatAssistantState state) {
    return Row(
      children: [
        const CircleAvatar(child: Icon(Icons.smart_toy_outlined)),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                state.messages.isEmpty ? 'Ask the shelf' : 'Manga assistant',
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

  Widget _buildInputBar(BuildContext context, ChatAssistantState state) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _input,
            maxLength: 1200,
            minLines: 1,
            maxLines: 3,
            enabled: !state.sending,
            decoration: const InputDecoration(
              labelText: 'Ask for manga...',
              counterText: '',
            ),
            onTapOutside: (_) {
              FocusScope.of(context).unfocus();
            },
            onSubmitted: (_) {
              _send(context);
            },
          ),
        ),
        const SizedBox(width: 8),
        IconButton.filled(
          onPressed: state.sending ? null : () => _send(context),
          icon: const Icon(Icons.send),
        ),
      ],
    );
  }
}
