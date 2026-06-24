import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:manga_mobile/data/repositories/repositories.dart';
import 'reset_password_state.dart';

class ResetPasswordCubit extends Cubit<ResetPasswordState> {
  ResetPasswordCubit({required this.authRepository})
    : super(const ResetPasswordState());

  final AuthRepository authRepository;

  Future<void> resetPassword({
    required String token,
    required String newPassword,
    required String confirmPassword,
  }) async {
    // Validate confirm trước khi gọi API
    if (newPassword != confirmPassword) {
      emit(
        state.copyWith(
          status: ResetPasswordStatus.failure,
          error: 'Passwords do not match',
        ),
      );
      return;
    }

    emit(state.copyWith(status: ResetPasswordStatus.loading, error: null));

    try {
      await authRepository.resetPassword(
        token: token,
        newPassword: newPassword,
      );

      if (isClosed) return;
      emit(state.copyWith(status: ResetPasswordStatus.success));
    } catch (error) {
      if (isClosed) return;
      emit(
        state.copyWith(
          status: ResetPasswordStatus.failure,
          error: error.toString(),
        ),
      );
    }
  }
}
