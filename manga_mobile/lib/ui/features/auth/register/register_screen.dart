import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../app_state.dart';
import '../auth_layout.dart';
import 'register_cubit.dart';
import 'register_state.dart';

class RegisterScreen extends StatelessWidget {
  const RegisterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);

    return BlocProvider(
      create: (_) => RegisterCubit(authRepository: app.authRepository),
      child: const _RegisterView(),
    );
  }
}

class _RegisterView extends StatefulWidget {
  const _RegisterView();

  @override
  State<_RegisterView> createState() => _RegisterViewState();
}

class _RegisterViewState extends State<_RegisterView> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit(BuildContext context) {
    if (!_formKey.currentState!.validate()) return;
    context.read<RegisterCubit>().register(
      name: _name.text.trim(),
      email: _email.text.trim(),
      password: _password.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<RegisterCubit, RegisterState>(
      listenWhen: (prev, curr) => curr.isSuccess,
      listener: (context, state) => context.go(
        '/verify?email=${Uri.encodeComponent(_email.text.trim())}',
      ),
      child: BlocBuilder<RegisterCubit, RegisterState>(
        builder: (context, state) {
          return AuthScaffold(
            title: 'Create account',
            subtitle: 'Track reading progress across your shelf.',
            child: Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _name,
                    decoration: const InputDecoration(
                      labelText: 'Display name',
                    ),
                    validator: (value) => (value ?? '').trim().length >= 2
                        ? null
                        : 'Use at least 2 characters',
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _email,
                    decoration: const InputDecoration(labelText: 'Email'),
                    keyboardType: TextInputType.emailAddress,
                    validator: (value) => value != null && value.contains('@')
                        ? null
                        : 'Enter a valid email',
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _password,
                    decoration: const InputDecoration(labelText: 'Password'),
                    obscureText: true,
                    validator: (value) => (value ?? '').length >= 8
                        ? null
                        : 'Use at least 8 characters',
                  ),
                  if (state.error != null) ErrorText(state.error!),
                  const SizedBox(height: 18),
                  FilledButton.icon(
                    onPressed: state.isLoading ? null : () => _submit(context),
                    icon: const Icon(Icons.person_add),
                    label: Text(
                      state.isLoading ? 'Creating...' : 'Create account',
                    ),
                  ),
                  TextButton(
                    onPressed: () => context.go('/login'),
                    child: const Text('Already have an account'),
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
