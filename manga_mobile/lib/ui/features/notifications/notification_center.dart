import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../app_state.dart';
import '../../core/theme.dart';
import 'cubit/notification_cubit.dart';
import 'cubit/notification_state.dart';
import 'notification_sheet.dart';

class NotificationCenterButton extends StatelessWidget {
  const NotificationCenterButton({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);

    if (!app.isSignedIn) return const SizedBox.shrink();

    return BlocProvider(
      create: (_) => NotificationCubit(
        notificationRepository: AppScope.read(context).notificationRepository,
      )..load(),
      child: const _NotificationCenterButtonView(),
    );
  }
}

class _NotificationCenterButtonView extends StatelessWidget {
  const _NotificationCenterButtonView();

  Future<void> _open(BuildContext context) async {
    final cubit = context.read<NotificationCubit>();

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) {
        return BlocProvider.value(
          value: cubit,
          child: const NotificationSheetWithCubit(),
        );
      },
    );

    await cubit.refresh();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<NotificationCubit, NotificationState>(
      builder: (context, state) {
        return Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              tooltip: 'Notifications',
              onPressed: () => _open(context),
              icon: const Icon(Icons.notifications_outlined),
            ),
            if (state.unreadCount > 0)
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
                      state.unreadCount > 9 ? '9+' : '${state.unreadCount}',
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
      },
    );
  }
}
