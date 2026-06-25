import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ReaderErrorPane extends StatelessWidget {
  const ReaderErrorPane({
    super.key,
    required this.message,
    required this.mangaId,
    required this.onRetry,
  });

  final String message;
  final String? mangaId;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              alignment: WrapAlignment.center,
              children: [
                FilledButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                ),
                if (mangaId != null)
                  OutlinedButton.icon(
                    onPressed: () => context.go('/manga/$mangaId'),
                    icon: const Icon(Icons.menu_book_outlined),
                    label: const Text('Back to chapters'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
