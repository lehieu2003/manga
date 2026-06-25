import 'package:manga_mobile/ui/features/chat/local_chat_message.dart.dart';

class ChatAssistantState {
  const ChatAssistantState({
    required this.messages,
    required this.sending,
    this.conversationId,
    this.pendingMessage,
  });

  factory ChatAssistantState.initial() {
    return const ChatAssistantState(messages: [], sending: false);
  }

  final List<LocalChatMessage> messages;
  final bool sending;
  final String? conversationId;
  final String? pendingMessage;

  bool get isEmpty => messages.isEmpty;

  static const _unset = Object();

  ChatAssistantState copyWith({
    List<LocalChatMessage>? messages,
    bool? sending,
    Object? conversationId = _unset,
    Object? pendingMessage = _unset,
  }) {
    return ChatAssistantState(
      messages: messages ?? this.messages,
      sending: sending ?? this.sending,
      conversationId: conversationId == _unset
          ? this.conversationId
          : conversationId as String?,
      pendingMessage: pendingMessage == _unset
          ? this.pendingMessage
          : pendingMessage as String?,
    );
  }
}
