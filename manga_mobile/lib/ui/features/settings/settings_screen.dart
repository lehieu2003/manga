import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../app_state.dart';
import 'cubit/settings_cubit.dart';
import 'cubit/settings_state.dart';
import 'widgets/profile_settings_card.dart';
import 'widgets/security_settings_card.dart';
import 'widgets/settings_feedback_messages.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);

    return BlocProvider(
      create: (_) => SettingsCubit(appState: app),
      child: const _SettingsView(),
    );
  }
}

class _SettingsView extends StatefulWidget {
  const _SettingsView();

  @override
  State<_SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends State<_SettingsView> {
  final _displayName = TextEditingController();
  final _currentPassword = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _imagePicker = ImagePicker();

  bool _initialized = false;
  XFile? _avatarFile;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (_initialized) return;
    _initialized = true;

    final user = AppScope.of(context).user;
    _displayName.text = user?.displayName ?? '';
  }

  @override
  void dispose() {
    _displayName.dispose();
    _currentPassword.dispose();
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  void _saveProfile(BuildContext context) {
    context.read<SettingsCubit>().saveProfile(
      displayName: _displayName.text,
      avatarPath: _avatarFile?.path,
    );
  }

  Future<void> _pickAvatar() async {
    final image = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      imageQuality: 88,
    );
    if (image == null || !mounted) return;
    setState(() => _avatarFile = image);
  }

  void _changePassword(BuildContext context) {
    context.read<SettingsCubit>().changePassword(
      currentPassword: _currentPassword.text,
      newPassword: _newPassword.text,
      confirmPassword: _confirmPassword.text,
    );
  }

  void _logout(BuildContext context) {
    context.read<SettingsCubit>().logout();
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final user = app.user;

    return BlocListener<SettingsCubit, SettingsState>(
      listenWhen: (prev, curr) {
        final statusChanged = prev.status != curr.status;
        final messageChanged = prev.message != curr.message;
        final errorChanged = prev.error != curr.error;

        return (statusChanged || messageChanged || errorChanged) &&
            (curr.isSuccess || curr.isFailure);
      },
      listener: (context, state) {
        if (state.isSuccess && state.message != null) {
          _showSnack(state.message!);
        }

        if (state.isFailure && state.error != null) {
          _showSnack(state.error!);
        }

        if (state.isSuccess && state.action == SettingsAction.password) {
          _currentPassword.clear();
          _newPassword.clear();
          _confirmPassword.clear();
        }

        if (state.isSuccess && state.action == SettingsAction.profile) {
          setState(() => _avatarFile = null);
        }

        if (state.isSuccess && state.action == SettingsAction.logout) {
          context.go('/login');
        }
      },
      child: BlocBuilder<SettingsCubit, SettingsState>(
        builder: (context, state) {
          return ListView(
            padding: const EdgeInsets.all(14),
            children: [
              Text(
                'Settings',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 10),

              ProfileSettingsCard(
                user: user,
                displayNameController: _displayName,
                avatarPath: _avatarFile?.path,
                state: state,
                onPickAvatar: _pickAvatar,
                onSave: () => _saveProfile(context),
              ),
              SecuritySettingsCard(
                currentPasswordController: _currentPassword,
                newPasswordController: _newPassword,
                confirmPasswordController: _confirmPassword,
                state: state,
                onChangePassword: () => _changePassword(context),
              ),

              SettingsFeedbackMessages(state: state),
              const SizedBox(height: 10),

              OutlinedButton.icon(
                onPressed: state.isLoading ? null : () => _logout(context),
                icon: const Icon(Icons.logout),
                label: Text(state.isLoggingOut ? 'Logging out...' : 'Logout'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }
}
