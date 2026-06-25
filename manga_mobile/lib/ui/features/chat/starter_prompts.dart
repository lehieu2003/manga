import 'package:flutter/material.dart';

import 'chat_starter_prompts.dart';

class StarterPrompts extends StatelessWidget {
  const StarterPrompts({super.key, required this.onSend});

  final Future<void> Function(String message) onSend;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        for (final prompt in chatStarterPrompts)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: OutlinedButton(
              onPressed: () => onSend(prompt),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(prompt),
              ),
            ),
          ),
      ],
    );
  }
}
