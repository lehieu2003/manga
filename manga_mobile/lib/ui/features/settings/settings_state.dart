enum SettingsStatus {
  initial,
  savingProfile,
  changingPassword,
  loggingOut,
  success,
  failure,
}

enum SettingsAction { none, profile, password, logout }

class SettingsState {
  const SettingsState({
    this.status = SettingsStatus.initial,
    this.action = SettingsAction.none,
    this.message,
    this.error,
  });

  final SettingsStatus status;
  final SettingsAction action;
  final String? message;
  final String? error;

  bool get isSavingProfile => status == SettingsStatus.savingProfile;
  bool get isChangingPassword => status == SettingsStatus.changingPassword;
  bool get isLoggingOut => status == SettingsStatus.loggingOut;

  bool get isLoading => isSavingProfile || isChangingPassword || isLoggingOut;

  bool get isSuccess => status == SettingsStatus.success;
  bool get isFailure => status == SettingsStatus.failure;

  static const _keep = Object();

  SettingsState copyWith({
    SettingsStatus? status,
    SettingsAction? action,
    Object? message = _keep,
    Object? error = _keep,
  }) {
    return SettingsState(
      status: status ?? this.status,
      action: action ?? this.action,
      message: message == _keep ? this.message : message as String?,
      error: error == _keep ? this.error : error as String?,
    );
  }
}
