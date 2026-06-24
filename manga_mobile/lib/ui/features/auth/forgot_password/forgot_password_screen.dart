import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:manga_mobile/ui/app_state.dart';
import 'package:manga_mobile/ui/features/auth/auth_layout.dart';
import 'package:manga_mobile/ui/features/auth/forgot_password/forgot_password_cubit.dart';
import 'package:manga_mobile/ui/features/auth/forgot_password/forgot_password_state.dart';

class ForgotPasswordScreen extends StatelessWidget {
  const ForgotPasswordScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => ForgotPasswordCubit(
        authRepository: AppScope.of(context).authRepository,
      ),
      child: const _ForgotPasswordView(),
    );
  }
}

class _ForgotPasswordView extends StatefulWidget {
  const _ForgotPasswordView();

  @override
  State<_ForgotPasswordView> createState() => _ForgotPasswordViewState();
}

class _ForgotPasswordViewState extends State<_ForgotPasswordView> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  void _submit(BuildContext context) {
    if (!_formKey.currentState!.validate()) return;
    context.read<ForgotPasswordCubit>().sendResetEmail(
      email: _email.text.trim(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ForgotPasswordCubit, ForgotPasswordState>(
      builder: (context, state) {
        return AuthScaffold(
          title: 'Forgot password',
          subtitle: 'Enter your account email to receive reset instructions.',
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                TextFormField(
                  controller: _email,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) => value != null && value.contains('@')
                      ? null
                      : 'Enter a valid email',
                ),
                if (state.error != null) ErrorText(state.error!),
                if (state.isSuccess)
                  const Padding(
                    padding: EdgeInsets.only(top: 12),
                    child: Text(
                      'If an account exists, a reset email was sent.',
                      style: TextStyle(color: Colors.green),
                    ),
                  ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  // Sau khi gửi thành công, disable nút để tránh gửi lại
                  onPressed: state.isLoading || state.isSuccess
                      ? null
                      : () => _submit(context),
                  icon: const Icon(Icons.email),
                  label: Text(
                    state.isLoading ? 'Sending...' : 'Send reset email',
                  ),
                ),
                TextButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('Back to login'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
