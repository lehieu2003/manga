import 'package:flutter_test/flutter_test.dart';
import 'package:manga_mobile/data/services/push_notification_service.dart';

void main() {
  group('PushNotificationService.routeFromData', () {
    test('routes manga comment notifications to manga detail', () {
      expect(
        PushNotificationService.routeFromData({
          'type': 'COMMENT_REPLY',
          'targetType': 'MANGA',
          'targetId': 'manga-1',
        }),
        '/manga/manga-1',
      );
    });

    test('routes chapter comment notifications to reader', () {
      expect(
        PushNotificationService.routeFromData({
          'type': 'COMMENT_REACTION',
          'targetType': 'CHAPTER',
          'targetId': 'chapter-1',
        }),
        '/read/chapter-1',
      );
    });

    test('routes social notifications to messages', () {
      expect(
        PushNotificationService.routeFromData({'type': 'GROUP_INVITE'}),
        '/messages',
      );
      expect(
        PushNotificationService.routeFromData({'subjectType': 'CALL'}),
        '/messages',
      );
    });
  });
}
