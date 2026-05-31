import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app_state.dart';
import '../../core/theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _displayName = TextEditingController();
  final _avatarUrl = TextEditingController();
  final _currentPassword = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();
  String? _message;
  String? _error;
  bool _saving = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final user = AppScope.of(context).user;
    _displayName.text = user?.displayName ?? '';
    _avatarUrl.text = user?.avatarUrl ?? '';
  }

  @override
  void dispose() {
    _displayName.dispose();
    _avatarUrl.dispose();
    _currentPassword.dispose();
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    setState(() {
      _saving = true;
      _message = null;
      _error = null;
    });
    try {
      await AppScope.of(context).updateProfile(
        displayName: _displayName.text.trim(),
        avatarUrl: _avatarUrl.text.trim().isEmpty
            ? null
            : _avatarUrl.text.trim(),
      );
      setState(() => _message = 'Profile saved.');
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _changePassword() async {
    if (_newPassword.text != _confirmPassword.text) {
      setState(() => _error = 'New password confirmation does not match.');
      return;
    }
    setState(() {
      _saving = true;
      _message = null;
      _error = null;
    });
    try {
      await AppScope.of(
        context,
      ).changePassword(_currentPassword.text, _newPassword.text);
      _currentPassword.clear();
      _newPassword.clear();
      _confirmPassword.clear();
      setState(() => _message = 'Password changed.');
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final user = app.user;
    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        Text(
          'Settings',
          style: Theme.of(
            context,
          ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 10),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Profile',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: MangaTheme.amber,
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  decoration: const InputDecoration(labelText: 'Email'),
                  initialValue: user?.email ?? '',
                  readOnly: true,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _displayName,
                  decoration: const InputDecoration(labelText: 'Display name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _avatarUrl,
                  decoration: const InputDecoration(labelText: 'Avatar URL'),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _saving ? null : _saveProfile,
                  icon: const Icon(Icons.save),
                  label: const Text('Save profile'),
                ),
              ],
            ),
          ),
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Security',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: MangaTheme.amber,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _currentPassword,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Current password',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _newPassword,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'New password'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _confirmPassword,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Confirm new password',
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _saving ? null : _changePassword,
                  icon: const Icon(Icons.key),
                  label: const Text('Change password'),
                ),
              ],
            ),
          ),
        ),
        if (_message != null)
          Text(_message!, style: const TextStyle(color: MangaTheme.amber)),
        if (_error != null)
          Text(_error!, style: const TextStyle(color: MangaTheme.sakura)),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: () async {
            await app.logout();
            if (context.mounted) context.go('/login');
          },
          icon: const Icon(Icons.logout),
          label: const Text('Logout'),
        ),
      ],
    );
  }
}
