import '../../../../domain/models/models.dart';

String notificationTitle(UserNotification item) {
  final action = item.type == 'COMMENT_REPLY'
      ? 'replied to your comment'
      : 'reacted to your comment';

  return '${item.actor.displayName} $action';
}

String formatNotificationDateTime(DateTime date) {
  final month = date.month.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');
  final hour = date.hour.toString().padLeft(2, '0');
  final minute = date.minute.toString().padLeft(2, '0');

  return '${date.year}-$month-$day $hour:$minute';
}

String notificationTargetPath(UserNotification item) {
  return item.targetType == 'MANGA'
      ? '/manga/${item.targetId}'
      : '/read/${item.targetId}';
}
