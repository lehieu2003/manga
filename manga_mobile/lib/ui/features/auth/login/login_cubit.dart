import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../app_state.dart';
import 'login_state.dart';

class LoginCubit extends Cubit<LoginState> {
  LoginCubit({required this.appState}) : super(const LoginState());

  final AppState appState;

  Future<void> login({required String email, required String password}) async {
    emit(state.copyWith(status: LoginStatus.loading, error: null));

    try {
      await appState.login(email, password);

      if (isClosed) return;
      emit(state.copyWith(status: LoginStatus.success));
    } catch (error) {
      if (isClosed) return;
      emit(
        state.copyWith(status: LoginStatus.failure, error: error.toString()),
      );
    }
  }

  Future<void> loginWithGoogle() async {
    emit(state.copyWith(status: LoginStatus.loading, error: null));

    try {
      await appState.loginWithGoogle();

      if (isClosed) return;
      emit(state.copyWith(status: LoginStatus.success));
    } catch (error) {
      if (isClosed) return;
      emit(
        state.copyWith(status: LoginStatus.failure, error: error.toString()),
      );
    }
  }
}
