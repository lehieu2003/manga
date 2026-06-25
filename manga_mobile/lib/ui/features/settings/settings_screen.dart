import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../app_state.dart';
import '../../core/theme.dart';
import 'settings_cubit.dart';
import 'settings_state.dart';

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
  final _avatarUrl = TextEditingController();
  final _currentPassword = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();

  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (_initialized) return;
    _initialized = true;

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

  void _saveProfile(BuildContext context) {
    context.read<SettingsCubit>().saveProfile(
      displayName: _displayName.text,
      avatarUrl: _avatarUrl.text,
    );
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
                        onTapOutside: (_) {
                          FocusScope.of(context).unfocus();
                        },
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: _displayName,
                        decoration: const InputDecoration(
                          labelText: 'Display name',
                        ),
                        onTapOutside: (_) {
                          FocusScope.of(context).unfocus();
                        },
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: _avatarUrl,
                        decoration: const InputDecoration(
                          labelText: 'Avatar URL',
                        ),
                        onTapOutside: (_) {
                          FocusScope.of(context).unfocus();
                        },
                      ),
                      const SizedBox(height: 12),

                      FilledButton.icon(
                        onPressed: state.isLoading
                            ? null
                            : () => _saveProfile(context),
                        icon: const Icon(Icons.save),
                        label: Text(
                          state.isSavingProfile ? 'Saving...' : 'Save profile',
                        ),
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

                      TextFormField(
                        controller: _currentPassword,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Current password',
                        ),
                        onTapOutside: (_) {
                          FocusScope.of(context).unfocus();
                        },
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: _newPassword,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'New password',
                        ),
                        onTapOutside: (_) {
                          FocusScope.of(context).unfocus();
                        },
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: _confirmPassword,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Confirm new password',
                        ),
                        onTapOutside: (_) {
                          FocusScope.of(context).unfocus();
                        },
                      ),
                      const SizedBox(height: 12),

                      FilledButton.icon(
                        onPressed: state.isLoading
                            ? null
                            : () => _changePassword(context),
                        icon: const Icon(Icons.key),
                        label: Text(
                          state.isChangingPassword
                              ? 'Changing...'
                              : 'Change password',
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              if (state.message != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    state.message!,
                    style: const TextStyle(color: MangaTheme.amber),
                  ),
                ),

              if (state.error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    state.error!,
                    style: const TextStyle(color: MangaTheme.sakura),
                  ),
                ),

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
