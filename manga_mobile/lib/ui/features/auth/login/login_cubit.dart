import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:manga_mobile/data/repositories/auth_repository.dart';
import 'login_state.dart';

class LoginCubit extends Cubit<LoginState> {
  LoginCubit({required this.authRepository}) : super(const LoginState());

  final AuthRepository authRepository;

  Future<void> login({required String email, required String password}) async {
    emit(state.copyWith(status: LoginStatus.loading, error: null));

    try {
      await authRepository.login(email: email, password: password);

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
