import 'package:flutter/material.dart';

import '../../../core/theme.dart';
import '../cubit/settings_state.dart';

class SettingsFeedbackMessages extends StatelessWidget {
  const SettingsFeedbackMessages({super.key, required this.state});

  final SettingsState state;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
      ],
    );
  }
}
