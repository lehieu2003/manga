import 'package:flutter/material.dart';

import '../../../../domain/models/models.dart';
import '../../../core/theme.dart';
import '../utils/notification_formatters.dart';

class NotificationListTile extends StatelessWidget {
  const NotificationListTile({
    super.key,
    required this.item,
    required this.onTap,
  });

  final UserNotification item;
  final Future<void> Function(UserNotification item) onTap;

  @override
  Widget build(BuildContext context) {
    final isUnread = item.readAt == null;

    return ListTile(
      leading: Icon(
        isUnread ? Icons.mark_unread_chat_alt : Icons.chat_bubble_outline,
        color: isUnread ? MangaTheme.amber : MangaTheme.muted,
      ),
      title: Text(notificationTitle(item)),
      subtitle: Text(formatNotificationDateTime(item.createdAt)),
      onTap: () => onTap(item),
    );
  }
}
