import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../app_state.dart';
import 'register_state.dart';

class RegisterCubit extends Cubit<RegisterState> {
  RegisterCubit({required this.appState}) : super(const RegisterState());

  final AppState appState;

  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    emit(
      state.copyWith(
        status: RegisterStatus.loading,
        error: null,
        signedIn: false,
      ),
    );

    try {
      await appState.authRepository.register(
        email: email,
        password: password,
        displayName: name,
      );

      if (isClosed) return;
      emit(state.copyWith(status: RegisterStatus.success, signedIn: false));
    } catch (error) {
      if (isClosed) return;
      emit(
        state.copyWith(status: RegisterStatus.failure, error: error.toString()),
      );
    }
  }

  Future<void> loginWithGoogle() async {
    emit(
      state.copyWith(
        status: RegisterStatus.loading,
        error: null,
        signedIn: false,
      ),
    );

    try {
      await appState.loginWithGoogle();

      if (isClosed) return;
      emit(state.copyWith(status: RegisterStatus.success, signedIn: true));
    } catch (error) {
      if (isClosed) return;
      emit(
        state.copyWith(status: RegisterStatus.failure, error: error.toString()),
      );
    }
  }
}
