import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../data/repositories/repositories.dart';
import '../../../../domain/models/models.dart';
import 'notification_state.dart';

class NotificationCubit extends Cubit<NotificationState> {
  NotificationCubit({required this.notificationRepository})
    : super(NotificationState.initial());

  final NotificationRepository notificationRepository;

  Future<void> load({bool showLoading = true}) async {
    if (showLoading) {
      emit(state.copyWith(loading: true, error: null));
    }

    try {
      final data = await notificationRepository.listNotifications();

      emit(state.copyWith(loading: false, data: data, error: null));
    } catch (error) {
      emit(state.copyWith(loading: false, error: error.toString()));
    }
  }

  Future<void> refresh() async {
    await load(showLoading: false);
  }

  Future<void> markAllRead() async {
    try {
      await notificationRepository.markAllRead();
      await refresh();
    } catch (error) {
      emit(state.copyWith(error: error.toString()));
    }
  }

  Future<void> markRead(UserNotification item) async {
    if (item.readAt != null) return;

    try {
      await notificationRepository.markRead(item.id);
      await refresh();
    } catch (error) {
      emit(state.copyWith(error: error.toString()));
    }
  }
}
