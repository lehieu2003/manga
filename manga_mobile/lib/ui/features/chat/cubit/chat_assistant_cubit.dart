import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:manga_mobile/ui/features/chat/local_chat_message.dart.dart';

import '../../../../domain/models/models.dart';
import 'chat_assistant_state.dart';

class ChatAssistantCubit extends Cubit<ChatAssistantState> {
  ChatAssistantCubit({
    required this.chatRepository,
    this.mangaId,
    this.chapterId,
  }) : super(ChatAssistantState.initial());

  /// Nếu project của bạn có type cụ thể, ví dụ ChatRepository,
  /// thì đổi dynamic thành ChatRepository.
  final dynamic chatRepository;

  final String? mangaId;
  final String? chapterId;

  Future<void> sendMessage(String rawContent) async {
    final content = rawContent.trim();

    if (content.isEmpty || state.sending) return;

    final userMessage = LocalChatMessage(
      message: ChatMessage(
        id: 'local-${DateTime.now().microsecondsSinceEpoch}',
        role: 'user',
        content: content,
        createdAt: DateTime.now(),
      ),
    );

    final pendingAssistantMessage = LocalChatMessage(
      message: ChatMessage(
        id: 'pending-${DateTime.now().microsecondsSinceEpoch}',
        role: 'assistant',
        content: 'Thinking...',
        createdAt: DateTime.now(),
      ),
      isPending: true,
    );

    emit(
      state.copyWith(
        sending: true,
        pendingMessage: content,
        messages: [...state.messages, userMessage, pendingAssistantMessage],
      ),
    );

    await _sendToRepository(content);
  }

  Future<void> retryLastMessage() async {
    final content = state.pendingMessage;

    if (content == null || content.trim().isEmpty || state.sending) return;

    final messages = [...state.messages];
    final errorIndex = messages.lastIndexWhere((item) => item.isError);

    if (errorIndex >= 0) {
      messages[errorIndex] = LocalChatMessage(
        message: ChatMessage(
          id: 'pending-${DateTime.now().microsecondsSinceEpoch}',
          role: 'assistant',
          content: 'Thinking...',
          createdAt: DateTime.now(),
        ),
        isPending: true,
      );
    } else {
      messages.add(
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
    }

    emit(state.copyWith(sending: true, messages: messages));

    await _sendToRepository(content);
  }

  Future<void> _sendToRepository(String content) async {
    try {
      final response = await chatRepository.sendMessage(
        conversationId: state.conversationId,
        message: content,
        mangaId: mangaId,
        chapterId: chapterId,
      );

      final messages = state.messages.where((item) => !item.isPending).toList();

      emit(
        state.copyWith(
          sending: false,
          conversationId: response.conversationId,
          pendingMessage: null,
          messages: [
            ...messages,
            LocalChatMessage(message: response.message),
          ],
        ),
      );
    } catch (error) {
      final messages = [...state.messages];
      final pendingIndex = messages.lastIndexWhere((item) => item.isPending);

      final errorMessage = LocalChatMessage(
        message: ChatMessage(
          id: 'error-${DateTime.now().microsecondsSinceEpoch}',
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          createdAt: DateTime.now(),
        ),
        isError: true,
      );

      if (pendingIndex >= 0) {
        messages[pendingIndex] = errorMessage;
      } else {
        messages.add(errorMessage);
      }

      emit(state.copyWith(sending: false, messages: messages));
    }
  }
}
