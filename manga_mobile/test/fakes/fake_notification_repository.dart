import 'package:manga_mobile/data/repositories/repositories.dart';
import 'package:manga_mobile/domain/models/models.dart';

import '../helpers/test_app.dart';

class FakeNotificationRepository extends NotificationRepository {
  FakeNotificationRepository(super.api);

  final List<String> readIds = [];

  @override
  Future<NotificationListResponse> listNotifications({int limit = 30}) async {
    return NotificationListResponse(
      unreadCount: readIds.contains('notification-1') ? 0 : 1,
      data: [
        UserNotification(
          id: 'notification-1',
          actor: const CommentAuthor(
            id: 'user-1',
            displayName: 'Reader',
            role: 'USER',
          ),
          type: 'COMMENT_REPLY',
          subjectType: 'COMMENT',
          subjectId: 'comment-1',
          commentId: 'comment-1',
          targetType: 'MANGA',
          targetId: 'manga-1',
          readAt: readIds.contains('notification-1') ? testNow : null,
          createdAt: testNow,
        ),
      ],
    );
  }

  @override
  Future<void> markRead(String id) async {
    readIds.add(id);
  }

  @override
  Future<void> markAllRead() async {
    readIds.add('notification-1');
  }
}
