import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../app_state.dart';
import '../auth_layout.dart';
import 'login_cubit.dart';
import 'login_state.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key, this.from});

  final String? from;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);

    return BlocProvider(
      create: (_) => LoginCubit(appState: app),
      child: _LoginView(from: from),
    );
  }
}

class _LoginView extends StatefulWidget {
  const _LoginView({this.from});

  final String? from;

  @override
  State<_LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<_LoginView> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit(BuildContext context) {
    if (!_formKey.currentState!.validate()) return;
    context.read<LoginCubit>().login(
      email: _email.text.trim(),
      password: _password.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<LoginCubit, LoginState>(
      listenWhen: (prev, curr) => curr.isSuccess,
      listener: (context, state) => context.go(widget.from ?? '/'),
      child: BlocBuilder<LoginCubit, LoginState>(
        builder: (context, state) {
          return AuthScaffold(
            title: 'Welcome back',
            subtitle: 'Continue your manga shelf.',
            child: Column(
              children: [
                GoogleSignInButton(
                  isLoading: state.isLoading,
                  onPressed: () => context.read<LoginCubit>().loginWithGoogle(),
                ),
                const AuthDivider(),
                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _email,
                        decoration: const InputDecoration(labelText: 'Email'),
                        keyboardType: TextInputType.emailAddress,
                        validator: (value) =>
                            value != null && value.contains('@')
                            ? null
                            : 'Enter a valid email',
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _password,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                        ),
                        obscureText: true,
                        validator: (value) =>
                            value != null && value.isNotEmpty
                            ? null
                            : 'Enter password',
                      ),
                      if (state.error != null) ErrorText(state.error!),
                      const SizedBox(height: 18),
                      FilledButton.icon(
                        onPressed: state.isLoading
                            ? null
                            : () => _submit(context),
                        icon: const Icon(Icons.login),
                        label: Text(
                          state.isLoading ? 'Signing in...' : 'Sign in',
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.go('/forgot'),
                        child: const Text('Forgot password?'),
                      ),
                      TextButton(
                        onPressed: () => context.go('/register'),
                        child: const Text('Create account'),
                      ),
                    ],
                  ),
                ),
              ],
              ),
          );
        },
      ),
    );
  }
}
