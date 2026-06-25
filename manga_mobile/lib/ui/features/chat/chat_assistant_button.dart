import 'package:flutter/material.dart';

import '../../app_state.dart';
import 'chat_assistant_sheet.dart';

class ChatAssistantButton extends StatelessWidget {
  const ChatAssistantButton({super.key, this.mangaId, this.chapterId});

  final String? mangaId;
  final String? chapterId;

  @override
  Widget build(BuildContext context) {
    if (!AppScope.of(context).isSignedIn) return const SizedBox.shrink();

    final color = Theme.of(context).colorScheme.primary;

    return Tooltip(
      message: 'Open manga assistant',
      child: GestureDetector(
        onTap: () => showModalBottomSheet<void>(
          context: context,
          isScrollControlled: true,
          builder: (_) =>
              ChatAssistantSheet(mangaId: mangaId, chapterId: chapterId),
        ),
        child: Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.35),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: const Icon(
            Icons.chat_bubble_outline,
            color: Colors.white,
            size: 26,
          ),
        ),
      ),
    );
  }
}
