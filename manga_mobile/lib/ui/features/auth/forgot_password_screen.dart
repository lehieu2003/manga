import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app_state.dart';
import 'auth_layout.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  bool _sending = false;
  String? _error;
  String? _info;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _sending = true;
      _error = null;
      _info = null;
    });
    try {
      await AppScope.of(
        context,
      ).authRepository.forgotPassword(email: _email.text.trim());
      setState(() => _info = 'If an account exists, a reset email was sent.');
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
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
            if (_error != null) ErrorText(_error!),
            if (_info != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  _info!,
                  style: const TextStyle(color: Colors.green),
                ),
              ),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: _sending ? null : _submit,
              icon: const Icon(Icons.email),
              label: Text(_sending ? 'Sending...' : 'Send reset email'),
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
