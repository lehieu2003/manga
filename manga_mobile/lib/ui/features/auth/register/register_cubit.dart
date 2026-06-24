import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:manga_mobile/data/repositories/repositories.dart';
import 'register_state.dart';

class RegisterCubit extends Cubit<RegisterState> {
  RegisterCubit({required this.authRepository}) : super(const RegisterState());

  final AuthRepository authRepository;

  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    emit(state.copyWith(status: RegisterStatus.loading, error: null));

    try {
      await authRepository.register(
        email: email,
        password: password,
        displayName: name,
      );

      if (isClosed) return;
      emit(state.copyWith(status: RegisterStatus.success));
    } catch (error) {
      if (isClosed) return;
      emit(
        state.copyWith(status: RegisterStatus.failure, error: error.toString()),
      );
    }
  }
}
