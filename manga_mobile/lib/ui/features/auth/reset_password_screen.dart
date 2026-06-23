import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app_state.dart';
import 'auth_layout.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key, this.token});

  final String? token;

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_password.text != _confirm.text) {
      setState(() => _error = 'Passwords do not match');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await AppScope.of(context).authRepository.resetPassword(
        token: widget.token ?? '',
        newPassword: _password.text,
      );
      if (mounted) context.go('/login');
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Reset password',
      subtitle: 'Choose a new secure password for your account.',
      child: Form(
        key: _formKey,
        child: Column(
          children: [
            TextFormField(
              controller: _password,
              decoration: const InputDecoration(labelText: 'New password'),
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
              validator: (value) =>
                  (value ?? '').isNotEmpty ? null : 'Confirm your password',
            ),
            if (_error != null) ErrorText(_error!),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: _saving ? null : _submit,
              icon: const Icon(Icons.lock_reset),
              label: Text(_saving ? 'Saving...' : 'Reset password'),
            ),
            TextButton(
              onPressed: () => context.go('/login'),
              child: const Text('Back to login'),
            ),
          ],
        ),
      ),
    );
  }
}
