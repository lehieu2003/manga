import '../../../domain/models/models.dart';

class LocalChatMessage {
  const LocalChatMessage({
    required this.message,
    this.isPending = false,
    this.isError = false,
  });

  final ChatMessage message;
  final bool isPending;
  final bool isError;
}
