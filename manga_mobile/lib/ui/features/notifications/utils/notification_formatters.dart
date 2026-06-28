import '../../../../domain/models/models.dart';

String notificationTitle(UserNotification item) {
  final action = switch (item.type) {
    'COMMENT_REPLY' => 'replied to your comment',
    'COMMENT_REACTION' => 'reacted to your comment',
    'FRIEND_REQUEST' => 'sent you a friend request',
    'FRIEND_ACCEPTED' => 'accepted your friend request',
    'CHAT_MESSAGE' => 'sent you a message',
    'GROUP_INVITE' => 'invited you to a group',
    _ => 'sent you a notification',
  };

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
  if (item.subjectType == 'FRIENDSHIP' ||
      item.subjectType == 'CONVERSATION' ||
      item.subjectType == 'MESSAGE') {
    return '/messages';
  }
  if (item.targetType == 'MANGA' && item.targetId != null) {
    return '/manga/${item.targetId}';
  }
  if (item.targetType == 'CHAPTER' && item.targetId != null) {
    return '/read/${item.targetId}';
  }
  return '/';
}
