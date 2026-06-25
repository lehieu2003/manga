import 'package:flutter/material.dart';

import '../../../core/theme.dart';
import '../cubit/settings_state.dart';

class SecuritySettingsCard extends StatelessWidget {
  const SecuritySettingsCard({
    super.key,
    required this.currentPasswordController,
    required this.newPasswordController,
    required this.confirmPasswordController,
    required this.state,
    required this.onChangePassword,
  });

  final TextEditingController currentPasswordController;
  final TextEditingController newPasswordController;
  final TextEditingController confirmPasswordController;
  final SettingsState state;
  final VoidCallback onChangePassword;

  @override
  Widget build(BuildContext context) {
    return Card(
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
            TextFormField(
              controller: currentPasswordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Current password'),
              onTapOutside: (_) => FocusScope.of(context).unfocus(),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: newPasswordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New password'),
              onTapOutside: (_) => FocusScope.of(context).unfocus(),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: confirmPasswordController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Confirm new password',
              ),
              onTapOutside: (_) => FocusScope.of(context).unfocus(),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: state.isLoading ? null : onChangePassword,
              icon: const Icon(Icons.key),
              label: Text(
                state.isChangingPassword ? 'Changing...' : 'Change password',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
