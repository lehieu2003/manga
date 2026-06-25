import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../app_state.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import 'cubit/comment_section_cubit.dart';
import 'cubit/comment_section_state.dart';
import 'widgets/comment_card.dart';
import 'widgets/comment_composer.dart';

class CommentSection extends StatelessWidget {
  const CommentSection({
    super.key,
    required this.targetType,
    required this.targetId,
    this.compact = false,
  });

  final String targetType;
  final String targetId;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);

    return BlocProvider(
      create: (_) => CommentSectionCubit(
        commentRepository: app.commentRepository,
        targetType: targetType,
        targetId: targetId,
      )..load(reset: true),
      child: _CommentSectionView(
        targetType: targetType,
        targetId: targetId,
        compact: compact,
      ),
    );
  }
}

class _CommentSectionView extends StatelessWidget {
  const _CommentSectionView({
    required this.targetType,
    required this.targetId,
    required this.compact,
  });

  final String targetType;
  final String targetId;
  final bool compact;

  void _showSnack(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);

    return BlocConsumer<CommentSectionCubit, CommentSectionState>(
      listenWhen: (previous, current) {
        return previous.notice != current.notice;
      },
      listener: (context, state) {
        if (state.notice != null) {
          _showSnack(context, state.notice!);
          context.read<CommentSectionCubit>().clearNotice();
        }
      },
      builder: (context, state) {
        final cubit = context.read<CommentSectionCubit>();

        return Card(
          child: Padding(
            padding: EdgeInsets.all(compact ? 12 : 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(context),
                const SizedBox(height: 12),
                CommentComposer(
                  targetType: targetType,
                  targetId: targetId,
                  onChanged: cubit.reload,
                ),
                const SizedBox(height: 12),
                _buildBody(context, state, app.user),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                targetType == 'MANGA' ? 'Manga comments' : 'Chapter comments',
                style: const TextStyle(
                  color: MangaTheme.amber,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Reader discussion',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
              ),
            ],
          ),
        ),
        const Chip(label: Text('Newest first')),
      ],
    );
  }

  Widget _buildBody(BuildContext context, CommentSectionState state, user) {
    final cubit = context.read<CommentSectionCubit>();

    if (state.loading && state.comments.isEmpty) {
      return const AsyncPane(message: 'Loading comments...');
    }

    if (state.error != null && state.comments.isEmpty) {
      return AsyncPane(
        message: 'Could not load comments.',
        onRetry: cubit.reload,
      );
    }

    if (state.comments.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Text('No comments yet. Start the discussion.'),
      );
    }

    return Column(
      children: [
        for (final comment in state.comments)
          CommentCard(
            comment: comment,
            targetType: targetType,
            targetId: targetId,
            user: user,
            onChanged: cubit.reload,
          ),
        if (state.hasMore)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: OutlinedButton(
              onPressed: state.loadingMore ? null : cubit.loadMore,
              child: Text(state.loadingMore ? 'Loading...' : 'More comments'),
            ),
          ),
      ],
    );
  }
}
