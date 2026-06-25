import '../../../../domain/models/models.dart';

class NotificationState {
  const NotificationState({required this.loading, this.data, this.error});

  factory NotificationState.initial() {
    return const NotificationState(loading: true);
  }

  final bool loading;
  final NotificationListResponse? data;
  final String? error;

  int get unreadCount => data?.unreadCount ?? 0;

  List<UserNotification> get notifications => data?.data ?? const [];

  bool get isEmpty => notifications.isEmpty;

  static const _unset = Object();

  NotificationState copyWith({
    bool? loading,
    Object? data = _unset,
    Object? error = _unset,
  }) {
    return NotificationState(
      loading: loading ?? this.loading,
      data: data == _unset ? this.data : data as NotificationListResponse?,
      error: error == _unset ? this.error : error as String?,
    );
  }
}
