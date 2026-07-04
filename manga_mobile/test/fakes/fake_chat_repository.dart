import 'package:manga_mobile/data/repositories/repositories.dart';
import 'package:manga_mobile/domain/models/models.dart';

import '../helpers/test_app.dart';

class FakeChatRepository extends ChatRepository {
  FakeChatRepository(super.api);

  @override
  Future<SendChatMessageResponse> sendMessage({
    String? conversationId,
    required String message,
    String? mangaId,
    String? chapterId,
  }) async {
    return SendChatMessageResponse(
      conversationId: conversationId ?? 'conversation-1',
      message: ChatMessage(
        id: 'assistant-1',
        role: 'assistant',
        content: 'Try Alpha Manga.',
        createdAt: testNow,
        sources: const [
          ChatSource(
            type: 'manga',
            id: 'manga-1',
            title: 'Alpha Manga',
            reason: 'Matches your prompt.',
          ),
        ],
      ),
    );
  }
}
