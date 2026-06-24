enum VerifyEmailStatus { initial, verifying, resending, success, failure }

class VerifyEmailState {
  const VerifyEmailState({
    this.status = VerifyEmailStatus.initial,
    this.error,
    this.info,
  });

  final VerifyEmailStatus status;
  final String? error;
  final String? info; // thông báo thành công không navigate ngay (resend)

  bool get isVerifying => status == VerifyEmailStatus.verifying;
  bool get isResending => status == VerifyEmailStatus.resending;
  bool get isSuccess => status == VerifyEmailStatus.success;

  static const _keep = Object();

  VerifyEmailState copyWith({
    VerifyEmailStatus? status,
    Object? error = _keep,
    Object? info = _keep,
  }) {
    return VerifyEmailState(
      status: status ?? this.status,
      error: error == _keep ? this.error : error as String?,
      info: info == _keep ? this.info : info as String?,
    );
  }
}
