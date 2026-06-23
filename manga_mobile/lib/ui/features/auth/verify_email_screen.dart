import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app_state.dart';
import 'auth_layout.dart';

class VerifyEmailScreen extends StatefulWidget {
  const VerifyEmailScreen({super.key, this.email});

  final String? email;

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  final _formKey = GlobalKey<FormState>();
  final _code = TextEditingController();
  bool _verifying = false;
  bool _resending = false;
  String? _error;
  String? _info;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _verifying = true;
      _error = null;
      _info = null;
    });
    final email = widget.email ?? '';
    try {
      final router = GoRouter.of(context);
      await AppScope.of(
        context,
      ).authRepository.verifyEmail(email: email, code: _code.text.trim());
      setState(() => _info = 'Email verified — you can now sign in.');
      if (mounted) {
        await Future.delayed(const Duration(milliseconds: 800));
        router.go('/login');
      }
    } catch (err) {
      setState(() => _error = err.toString());
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  Future<void> _resend() async {
    setState(() {
      _resending = true;
      _error = null;
      _info = null;
    });
    final email = widget.email ?? '';
    try {
      await AppScope.of(
        context,
      ).authRepository.resendVerificationEmail(email: email);
      setState(() => _info = 'Verification email resent. Check your inbox.');
    } catch (err) {
      setState(() => _error = err.toString());
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final emailFromQuery =
        widget.email ??
        GoRouterState.of(context).uri.queryParameters['email'] ??
        '';
    return AuthScaffold(
      title: 'Verify email',
      subtitle: 'Enter the verification code we sent to $emailFromQuery',
      child: Form(
        key: _formKey,
        child: Column(
          children: [
            TextFormField(
              controller: _code,
              decoration: const InputDecoration(labelText: 'Verification code'),
              keyboardType: TextInputType.number,
              validator: (value) =>
                  (value ?? '').trim().isNotEmpty ? null : 'Enter the code',
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
              onPressed: _verifying ? null : _verify,
              icon: const Icon(Icons.check_circle),
              label: Text(_verifying ? 'Verifying...' : 'Verify'),
            ),
            TextButton(
              onPressed: _resending ? null : _resend,
              child: Text(_resending ? 'Resending...' : 'Resend email'),
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
