import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../domain/models/models.dart';
import '../../app_state.dart';

class SourceTile extends StatelessWidget {
  const SourceTile({super.key, required this.source});

  final ChatSource source;

  @override
  Widget build(BuildContext context) {
    final coverUrl = AppScope.of(
      context,
    ).catalogRepository.assetUrl(source.coverUrl);

    return Card(
      child: ListTile(
        leading: SizedBox(
          width: 42,
          height: 56,
          child: coverUrl.isEmpty
              ? const Icon(Icons.menu_book_outlined)
              : CachedNetworkImage(imageUrl: coverUrl, fit: BoxFit.cover),
        ),
        title: Text(source.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text(
          source.type == 'chapter' ? 'Chapter source' : 'Manga source',
        ),
        trailing: const Icon(Icons.open_in_new),
        onTap: () {
          final router = GoRouter.of(context);

          Navigator.pop(context);

          router.push(
            source.type == 'chapter'
                ? '/read/${source.id}'
                : '/manga/${source.id}',
          );
        },
      ),
    );
  }
}
