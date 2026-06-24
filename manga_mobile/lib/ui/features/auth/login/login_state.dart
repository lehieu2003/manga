enum LoginStatus { initial, loading, success, failure }

class LoginState {
  const LoginState({this.status = LoginStatus.initial, this.error});

  final LoginStatus status;
  final String? error;

  bool get isLoading => status == LoginStatus.loading;
  bool get isSuccess => status == LoginStatus.success;

  static const _keep = Object();

  LoginState copyWith({LoginStatus? status, Object? error = _keep}) {
    return LoginState(
      status: status ?? this.status,
      error: error == _keep ? this.error : error as String?,
    );
  }
}
