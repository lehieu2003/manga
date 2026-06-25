import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:manga_mobile/domain/models/models.dart';

import '../../app_state.dart';
import 'cubit/notification_cubit.dart';
import 'cubit/notification_state.dart';
import 'utils/notification_formatters.dart';
import 'widgets/notification_list_tile.dart';
import 'widgets/notification_message.dart';

class NotificationSheet extends StatelessWidget {
  const NotificationSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => NotificationCubit(
        notificationRepository: AppScope.read(context).notificationRepository,
      )..load(),
      child: const _NotificationSheetView(),
    );
  }
}

class NotificationSheetWithCubit extends StatelessWidget {
  const NotificationSheetWithCubit({super.key});

  @override
  Widget build(BuildContext context) {
    return const _NotificationSheetView();
  }
}

class _NotificationSheetView extends StatelessWidget {
  const _NotificationSheetView();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.75,
          child: BlocBuilder<NotificationCubit, NotificationState>(
            builder: (context, state) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(context, state),
                  const SizedBox(height: 8),
                  Expanded(child: _buildBody(context, state)),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, NotificationState state) {
    return Row(
      children: [
        Expanded(
          child: Text(
            'Notifications',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
          ),
        ),
        TextButton.icon(
          onPressed: state.unreadCount == 0
              ? null
              : () => context.read<NotificationCubit>().markAllRead(),
          icon: const Icon(Icons.done_all),
          label: const Text('Read all'),
        ),
      ],
    );
  }

  Widget _buildBody(BuildContext context, NotificationState state) {
    if (state.loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null) {
      return NotificationMessage(
        message: state.error!,
        onRetry: () => context.read<NotificationCubit>().load(),
      );
    }

    if (state.isEmpty) {
      return const NotificationMessage(message: 'No notifications yet.');
    }

    return RefreshIndicator(
      onRefresh: () => context.read<NotificationCubit>().refresh(),
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: state.notifications.length,
        separatorBuilder: (_, _) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final item = state.notifications[index];

          return NotificationListTile(
            item: item,
            onTap: (item) => _openNotificationTarget(context, item),
          );
        },
      ),
    );
  }

  Future<void> _openNotificationTarget(
    BuildContext context,
    UserNotification item,
  ) async {
    final router = GoRouter.of(context);
    final path = notificationTargetPath(item);

    await context.read<NotificationCubit>().markRead(item);

    if (!context.mounted) return;

    Navigator.pop(context);
    router.push(path);
  }
}
