import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../domain/models/models.dart';
import '../../app_state.dart';
import '../../core/theme.dart';

class NotificationCenterButton extends StatefulWidget {
  const NotificationCenterButton({super.key});

  @override
  State<NotificationCenterButton> createState() =>
      _NotificationCenterButtonState();
}

class _NotificationCenterButtonState extends State<NotificationCenterButton> {
  int _unread = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (AppScope.of(context).isSignedIn && _unread == 0) {
      _loadUnread();
    }
  }

  Future<void> _loadUnread() async {
    final data = await AppScope.of(
      context,
    ).notificationRepository.listNotifications();
    if (mounted) setState(() => _unread = data.unreadCount);
  }

  Future<void> _open() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => NotificationSheet(
        onUnreadChanged: (value) {
          if (mounted) setState(() => _unread = value);
        },
      ),
    );
    await _loadUnread();
  }

  @override
  Widget build(BuildContext context) {
    if (!AppScope.of(context).isSignedIn) return const SizedBox.shrink();
    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          tooltip: 'Notifications',
          onPressed: _open,
          icon: const Icon(Icons.notifications_outlined),
        ),
        if (_unread > 0)
          Positioned(
            right: 5,
            top: 5,
            child: DecoratedBox(
              decoration: const BoxDecoration(
                color: MangaTheme.sakura,
                shape: BoxShape.circle,
              ),
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Text(
                  _unread > 9 ? '9+' : '$_unread',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class NotificationSheet extends StatefulWidget {
  const NotificationSheet({super.key, required this.onUnreadChanged});

  final ValueChanged<int> onUnreadChanged;

  @override
  State<NotificationSheet> createState() => _NotificationSheetState();
}

class _NotificationSheetState extends State<NotificationSheet> {
  Future<NotificationListResponse>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<NotificationListResponse> _load() async {
    final data = await AppScope.of(
      context,
    ).notificationRepository.listNotifications();
    widget.onUnreadChanged(data.unreadCount);
    return data;
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _future = next;
    });
    await next;
  }

  @override
  Widget build(BuildContext context) {
    final repo = AppScope.of(context).notificationRepository;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.75,
          child: FutureBuilder<NotificationListResponse>(
            future: _future,
            builder: (context, snapshot) {
              final data = snapshot.data;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Notifications',
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w900),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: data == null || data.unreadCount == 0
                            ? null
                            : () async {
                                await repo.markAllRead();
                                await _refresh();
                              },
                        icon: const Icon(Icons.done_all),
                        label: const Text('Read all'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: switch (snapshot.connectionState) {
                      ConnectionState.waiting => const Center(
                        child: CircularProgressIndicator(),
                      ),
                      _ when snapshot.hasError => _NotificationMessage(
                        message: snapshot.error.toString(),
                        onRetry: _refresh,
                      ),
                      _ when data == null || data.data.isEmpty =>
                        const _NotificationMessage(
                          message: 'No notifications yet.',
                        ),
                      _ => RefreshIndicator(
                        onRefresh: _refresh,
                        child: ListView.separated(
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount: data.data.length,
                          separatorBuilder: (_, _) => const Divider(height: 1),
                          itemBuilder: (context, index) {
                            final item = data.data[index];
                            return ListTile(
                              leading: Icon(
                                item.readAt == null
                                    ? Icons.mark_unread_chat_alt
                                    : Icons.chat_bubble_outline,
                                color: item.readAt == null
                                    ? MangaTheme.amber
                                    : MangaTheme.muted,
                              ),
                              title: Text(_notificationTitle(item)),
                              subtitle: Text(_formatDateTime(item.createdAt)),
                              onTap: () async {
                                final router = GoRouter.of(context);
                                final path = item.targetType == 'MANGA'
                                    ? '/manga/${item.targetId}'
                                    : '/read/${item.targetId}';
                                if (item.readAt == null) {
                                  await repo.markRead(item.id);
                                  await _refresh();
                                }
                                if (!context.mounted) return;
                                Navigator.pop(context);
                                router.push(path);
                              },
                            );
                          },
                        ),
                      ),
                    },
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _NotificationMessage extends StatelessWidget {
  const _NotificationMessage({required this.message, this.onRetry});

  final String message;
  final Future<void> Function()? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(message, textAlign: TextAlign.center),
              if (onRetry != null) ...[
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

String _notificationTitle(UserNotification item) {
  final action = item.type == 'COMMENT_REPLY'
      ? 'replied to your comment'
      : 'reacted to your comment';
  return '${item.actor.displayName} $action';
}

String _formatDateTime(DateTime date) =>
    '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
