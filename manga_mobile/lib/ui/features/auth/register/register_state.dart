enum RegisterStatus { initial, loading, success, failure }

class RegisterState {
  const RegisterState({this.status = RegisterStatus.initial, this.error});

  final RegisterStatus status;
  final String? error;

  bool get isLoading => status == RegisterStatus.loading;
  bool get isSuccess => status == RegisterStatus.success;

  static const _keep = Object();

  RegisterState copyWith({RegisterStatus? status, Object? error = _keep}) {
    return RegisterState(
      status: status ?? this.status,
      error: error == _keep ? this.error : error as String?,
    );
  }
}
