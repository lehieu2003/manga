import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:manga_mobile/data/repositories/auth_repository.dart';
import 'verify_email_state.dart';

class VerifyEmailCubit extends Cubit<VerifyEmailState> {
  VerifyEmailCubit({required this.authRepository})
    : super(const VerifyEmailState());

  final AuthRepository authRepository;

  Future<void> verify({required String email, required String code}) async {
    emit(
      state.copyWith(
        status: VerifyEmailStatus.verifying,
        error: null,
        info: null,
      ),
    );

    try {
      await authRepository.verifyEmail(email: email, code: code);

      if (isClosed) return;
      // success — BlocListener sẽ navigate sau delay
      emit(
        state.copyWith(
          status: VerifyEmailStatus.success,
          info: 'Email verified — you can now sign in.',
        ),
      );
    } catch (error) {
      if (isClosed) return;
      emit(
        state.copyWith(
          status: VerifyEmailStatus.failure,
          error: error.toString(),
        ),
      );
    }
  }

  Future<void> resend({required String email}) async {
    emit(
      state.copyWith(
        status: VerifyEmailStatus.resending,
        error: null,
        info: null,
      ),
    );

    try {
      await authRepository.resendVerificationEmail(email: email);

      if (isClosed) return;
      emit(
        state.copyWith(
          status: VerifyEmailStatus.initial,
          info: 'Verification email resent. Check your inbox.',
        ),
      );
    } catch (error) {
      if (isClosed) return;
      emit(
        state.copyWith(
          status: VerifyEmailStatus.failure,
          error: error.toString(),
        ),
      );
    }
  }
}
