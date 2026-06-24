enum ResetPasswordStatus { initial, loading, success, failure }

class ResetPasswordState {
  const ResetPasswordState({
    this.status = ResetPasswordStatus.initial,
    this.error,
  });

  final ResetPasswordStatus status;
  final String? error;

  bool get isLoading => status == ResetPasswordStatus.loading;
  bool get isSuccess => status == ResetPasswordStatus.success;

  static const _keep = Object();

  ResetPasswordState copyWith({
    ResetPasswordStatus? status,
    Object? error = _keep,
  }) {
    return ResetPasswordState(
      status: status ?? this.status,
      error: error == _keep ? this.error : error as String?,
    );
  }
}
