import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../domain/models/models.dart';
import '../../../app_state.dart';

class MessageBubble extends StatelessWidget {
  const MessageBubble({super.key, required this.message, required this.own});

  final SocialMessage message;
  final bool own;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final deleted = message.deletedAt != null;
    final content = deleted ? 'Deleted message' : message.content ?? '';
    final share = deleted ? null : message.mangaShare;

    return Row(
      mainAxisAlignment: own ? MainAxisAlignment.end : MainAxisAlignment.start,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (!own) ...[
          CircleAvatar(
            radius: 12,
            child: Text(message.sender?.displayName.characters.first ?? '?'),
          ),
          const SizedBox(width: 6),
        ],
        Flexible(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 340),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: own ? scheme.primary : scheme.surfaceContainerHighest,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(20),
                  topRight: const Radius.circular(20),
                  bottomLeft: Radius.circular(own ? 20 : 6),
                  bottomRight: Radius.circular(own ? 6 : 20),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 9,
                ),
                child: Column(
                  crossAxisAlignment: own
                      ? CrossAxisAlignment.end
                      : CrossAxisAlignment.start,
                  children: [
                    if (share == null)
                      Text(
                        content,
                        style: TextStyle(
                          color: own ? scheme.onPrimary : scheme.onSurface,
                        ),
                      )
                    else
                      _MangaShareCard(share: share, own: own),
                    const SizedBox(height: 3),
                    Text(
                      _timeLabel(message.createdAt),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: own
                            ? scheme.onPrimary.withValues(alpha: 0.76)
                            : scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _MangaShareCard extends StatelessWidget {
  const _MangaShareCard({required this.share, required this.own});

  final MangaShareAttachment share;
  final bool own;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final coverUrl = share.manga.coverUrl;
    final resolvedCover = coverUrl == null
        ? null
        : AppScope.read(context).catalogRepository.assetUrl(coverUrl);
    final textColor = own ? scheme.onPrimary : scheme.onSurface;
    final mutedColor = own
        ? scheme.onPrimary.withValues(alpha: 0.76)
        : scheme.onSurfaceVariant;

    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => context.push('/manga/${share.manga.id}'),
      child: SizedBox(
        width: 240,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 54,
                height: 72,
                child: resolvedCover == null || resolvedCover.isEmpty
                    ? ColoredBox(
                        color: scheme.surface,
                        child: Icon(Icons.menu_book_outlined, color: textColor),
                      )
                    : Image.network(resolvedCover, fit: BoxFit.cover),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Manga share',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: mutedColor,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    share.manga.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: textColor,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _shareSubtitle(share),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(
                      context,
                    ).textTheme.labelSmall?.copyWith(color: mutedColor),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _shareSubtitle(MangaShareAttachment share) {
  final chapter = share.chapter;
  if (chapter != null) {
    return [
      if (chapter.chapter != null) 'Ch. ${chapter.chapter}',
      if (chapter.translatedLanguage != null)
        chapter.translatedLanguage!.toUpperCase(),
    ].join(' · ');
  }
  return [
    if (share.manga.status != null) share.manga.status,
    if (share.manga.year != null) '${share.manga.year}',
  ].join(' · ');
}

String _timeLabel(DateTime date) {
  final local = date.toLocal();
  final hour12 = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final hour = hour12.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  final period = local.hour < 12 ? 'AM' : 'PM';
  return '$hour:$minute $period';
}
