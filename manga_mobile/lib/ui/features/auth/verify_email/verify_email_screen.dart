import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:manga_mobile/ui/app_state.dart';
import 'package:manga_mobile/ui/features/auth/auth_layout.dart';
import 'package:manga_mobile/ui/features/auth/verify_email/verify_email_cubit.dart';
import 'package:manga_mobile/ui/features/auth/verify_email/verify_email_state.dart';

class VerifyEmailScreen extends StatelessWidget {
  const VerifyEmailScreen({super.key, this.email});

  final String? email;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) =>
          VerifyEmailCubit(authRepository: AppScope.of(context).authRepository),
      child: _VerifyEmailView(email: email),
    );
  }
}

class _VerifyEmailView extends StatefulWidget {
  const _VerifyEmailView({this.email});

  final String? email;

  @override
  State<_VerifyEmailView> createState() => _VerifyEmailViewState();
}

class _VerifyEmailViewState extends State<_VerifyEmailView> {
  final _formKey = GlobalKey<FormState>();
  final _code = TextEditingController();

  String get _email =>
      widget.email ??
      GoRouterState.of(context).uri.queryParameters['email'] ??
      '';

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  void _verify(BuildContext context) {
    if (!_formKey.currentState!.validate()) return;
    context.read<VerifyEmailCubit>().verify(
      email: _email,
      code: _code.text.trim(),
    );
  }

  void _resend(BuildContext context) {
    context.read<VerifyEmailCubit>().resend(email: _email);
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<VerifyEmailCubit, VerifyEmailState>(
      listenWhen: (prev, curr) => curr.isSuccess,
      listener: (context, state) async {
        // Giữ nguyên delay nhỏ để user đọc được message trước khi navigate
        await Future.delayed(const Duration(milliseconds: 800));
        if (context.mounted) context.go('/login');
      },
      child: BlocBuilder<VerifyEmailCubit, VerifyEmailState>(
        builder: (context, state) {
          return AuthScaffold(
            title: 'Verify email',
            subtitle: 'Enter the verification code we sent to $_email',
            child: Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _code,
                    decoration: const InputDecoration(
                      labelText: 'Verification code',
                    ),
                    keyboardType: TextInputType.number,
                    validator: (value) => (value ?? '').trim().isNotEmpty
                        ? null
                        : 'Enter the code',
                  ),
                  if (state.error != null) ErrorText(state.error!),
                  if (state.info != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        state.info!,
                        style: const TextStyle(color: Colors.green),
                      ),
                    ),
                  const SizedBox(height: 18),
                  FilledButton.icon(
                    onPressed: state.isVerifying
                        ? null
                        : () => _verify(context),
                    icon: const Icon(Icons.check_circle),
                    label: Text(state.isVerifying ? 'Verifying...' : 'Verify'),
                  ),
                  TextButton(
                    onPressed: state.isResending
                        ? null
                        : () => _resend(context),
                    child: Text(
                      state.isResending ? 'Resending...' : 'Resend email',
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
