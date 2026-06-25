import 'package:flutter/material.dart';

import '../../../../domain/models/models.dart';
import '../../../core/theme.dart';
import '../cubit/settings_state.dart';
import 'avatar_picker.dart';

class ProfileSettingsCard extends StatelessWidget {
  const ProfileSettingsCard({
    super.key,
    required this.user,
    required this.displayNameController,
    required this.avatarPath,
    required this.state,
    required this.onPickAvatar,
    required this.onSave,
  });

  final User? user;
  final TextEditingController displayNameController;
  final String? avatarPath;
  final SettingsState state;
  final VoidCallback onPickAvatar;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    return Card(
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
              onTapOutside: (_) => FocusScope.of(context).unfocus(),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: displayNameController,
              decoration: const InputDecoration(labelText: 'Display name'),
              onTapOutside: (_) => FocusScope.of(context).unfocus(),
            ),
            const SizedBox(height: 12),
            AvatarPicker(
              imagePath: avatarPath,
              avatarUrl: user?.avatarUrl,
              onPick: state.isLoading ? null : onPickAvatar,
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: state.isLoading ? null : onSave,
              icon: const Icon(Icons.save),
              label: Text(state.isSavingProfile ? 'Saving...' : 'Save profile'),
            ),
          ],
        ),
      ),
    );
  }
}
