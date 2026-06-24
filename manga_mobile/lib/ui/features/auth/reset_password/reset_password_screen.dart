import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:manga_mobile/ui/app_state.dart';
import 'package:manga_mobile/ui/features/auth/auth_layout.dart';
import 'package:manga_mobile/ui/features/auth/reset_password/reset_password_cubit.dart';
import 'package:manga_mobile/ui/features/auth/reset_password/reset_password_state.dart';

class ResetPasswordScreen extends StatelessWidget {
  const ResetPasswordScreen({super.key, this.token});

  final String? token;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => ResetPasswordCubit(
        authRepository: AppScope.of(context).authRepository,
      ),
      child: _ResetPasswordView(token: token),
    );
  }
}

class _ResetPasswordView extends StatefulWidget {
  const _ResetPasswordView({this.token});

  final String? token;

  @override
  State<_ResetPasswordView> createState() => _ResetPasswordViewState();
}

class _ResetPasswordViewState extends State<_ResetPasswordView> {
  final _formKey = GlobalKey<FormState>();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  @override
  void dispose() {
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  void _submit(BuildContext context) {
    if (!_formKey.currentState!.validate()) return;
    context.read<ResetPasswordCubit>().resetPassword(
      token: widget.token ?? '',
      newPassword: _password.text,
      confirmPassword: _confirm.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<ResetPasswordCubit, ResetPasswordState>(
      listenWhen: (prev, curr) => curr.isSuccess,
      listener: (context, state) => context.go('/login'),
      child: BlocBuilder<ResetPasswordCubit, ResetPasswordState>(
        builder: (context, state) {
          return AuthScaffold(
            title: 'Reset password',
            subtitle: 'Choose a new secure password for your account.',
            child: Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _password,
                    decoration: const InputDecoration(
                      labelText: 'New password',
                    ),
                    obscureText: true,
                    validator: (value) => (value ?? '').length >= 8
                        ? null
                        : 'Use at least 8 characters',
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _confirm,
                    decoration: const InputDecoration(
                      labelText: 'Confirm new password',
                    ),
                    obscureText: true,
                    validator: (value) => (value ?? '').isNotEmpty
                        ? null
                        : 'Confirm your password',
                  ),
                  if (state.error != null) ErrorText(state.error!),
                  const SizedBox(height: 18),
                  FilledButton.icon(
                    onPressed: state.isLoading ? null : () => _submit(context),
                    icon: const Icon(Icons.lock_reset),
                    label: Text(
                      state.isLoading ? 'Saving...' : 'Reset password',
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
      ),
    );
  }
}
