import 'package:flutter_bloc/flutter_bloc.dart';

import '../../app_state.dart';
import 'settings_state.dart';

class SettingsCubit extends Cubit<SettingsState> {
  SettingsCubit({required this.appState}) : super(const SettingsState());

  final AppState appState;

  Future<void> saveProfile({
    required String displayName,
    required String avatarUrl,
  }) async {
    emit(
      state.copyWith(
        status: SettingsStatus.savingProfile,
        action: SettingsAction.profile,
        message: null,
        error: null,
      ),
    );

    try {
      final cleanDisplayName = displayName.trim();
      final cleanAvatarUrl = avatarUrl.trim();

      await appState.updateProfile(
        displayName: cleanDisplayName,
        avatarUrl: cleanAvatarUrl.isEmpty ? null : cleanAvatarUrl,
      );

      if (isClosed) return;

      emit(
        state.copyWith(
          status: SettingsStatus.success,
          action: SettingsAction.profile,
          message: 'Profile saved.',
          error: null,
        ),
      );
    } catch (error) {
      if (isClosed) return;

      emit(
        state.copyWith(
          status: SettingsStatus.failure,
          action: SettingsAction.profile,
          message: null,
          error: error.toString(),
        ),
      );
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
    required String confirmPassword,
  }) async {
    if (newPassword != confirmPassword) {
      emit(
        state.copyWith(
          status: SettingsStatus.failure,
          action: SettingsAction.password,
          message: null,
          error: 'New password confirmation does not match.',
        ),
      );
      return;
    }

    emit(
      state.copyWith(
        status: SettingsStatus.changingPassword,
        action: SettingsAction.password,
        message: null,
        error: null,
      ),
    );

    try {
      await appState.changePassword(currentPassword, newPassword);

      if (isClosed) return;

      emit(
        state.copyWith(
          status: SettingsStatus.success,
          action: SettingsAction.password,
          message: 'Password changed.',
          error: null,
        ),
      );
    } catch (error) {
      if (isClosed) return;

      emit(
        state.copyWith(
          status: SettingsStatus.failure,
          action: SettingsAction.password,
          message: null,
          error: error.toString(),
        ),
      );
    }
  }

  Future<void> logout() async {
    emit(
      state.copyWith(
        status: SettingsStatus.loggingOut,
        action: SettingsAction.logout,
        message: null,
        error: null,
      ),
    );

    try {
      await appState.logout();

      if (isClosed) return;

      emit(
        state.copyWith(
          status: SettingsStatus.success,
          action: SettingsAction.logout,
          message: 'Logged out.',
          error: null,
        ),
      );
    } catch (error) {
      if (isClosed) return;

      emit(
        state.copyWith(
          status: SettingsStatus.failure,
          action: SettingsAction.logout,
          message: null,
          error: error.toString(),
        ),
      );
    }
  }
}
