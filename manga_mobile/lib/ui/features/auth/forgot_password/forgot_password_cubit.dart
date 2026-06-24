import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:manga_mobile/data/repositories/repositories.dart';
import 'forgot_password_state.dart';

class ForgotPasswordCubit extends Cubit<ForgotPasswordState> {
  ForgotPasswordCubit({required this.authRepository})
    : super(const ForgotPasswordState());

  final AuthRepository authRepository;

  Future<void> sendResetEmail({required String email}) async {
    emit(state.copyWith(status: ForgotPasswordStatus.loading, error: null));

    try {
      await authRepository.forgotPassword(email: email);

      if (isClosed) return;
      emit(state.copyWith(status: ForgotPasswordStatus.success));
    } catch (error) {
      if (isClosed) return;
      emit(
        state.copyWith(
          status: ForgotPasswordStatus.failure,
          error: error.toString(),
        ),
      );
    }
  }
}
