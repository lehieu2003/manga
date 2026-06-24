enum ForgotPasswordStatus { initial, loading, success, failure }

class ForgotPasswordState {
  const ForgotPasswordState({
    this.status = ForgotPasswordStatus.initial,
    this.error,
  });

  final ForgotPasswordStatus status;
  final String? error;

  bool get isLoading => status == ForgotPasswordStatus.loading;
  bool get isSuccess => status == ForgotPasswordStatus.success;

  static const _keep = Object();

  ForgotPasswordState copyWith({
    ForgotPasswordStatus? status,
    Object? error = _keep,
  }) {
    return ForgotPasswordState(
      status: status ?? this.status,
      error: error == _keep ? this.error : error as String?,
    );
  }
}
