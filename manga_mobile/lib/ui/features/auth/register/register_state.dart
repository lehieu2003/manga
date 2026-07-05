enum RegisterStatus { initial, loading, success, failure }

class RegisterState {
  const RegisterState({
    this.status = RegisterStatus.initial,
    this.error,
    this.signedIn = false,
  });

  final RegisterStatus status;
  final String? error;
  final bool signedIn;

  bool get isLoading => status == RegisterStatus.loading;
  bool get isSuccess => status == RegisterStatus.success;

  static const _keep = Object();

  RegisterState copyWith({
    RegisterStatus? status,
    Object? error = _keep,
    bool? signedIn,
  }) {
    return RegisterState(
      status: status ?? this.status,
      error: error == _keep ? this.error : error as String?,
      signedIn: signedIn ?? this.signedIn,
    );
  }
}
