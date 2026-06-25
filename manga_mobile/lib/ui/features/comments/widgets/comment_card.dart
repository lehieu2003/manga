import 'package:flutter/material.dart';

import '../../../../domain/models/models.dart';
import '../../../app_state.dart';
import '../../../core/theme.dart';
import '../utils/comment_formatters.dart';
import 'comment_body.dart';
import 'comment_composer.dart';
import 'reaction_chip_list.dart';

class CommentCard extends StatefulWidget {
  const CommentCard({
    super.key,
    required this.comment,
    required this.targetType,
    required this.targetId,
    required this.user,
    required this.onChanged,
    this.depth = 0,
  });

  final CommentItem comment;
  final String targetType;
  final String targetId;
  final User? user;
  final Future<void> Function() onChanged;
  final int depth;

  @override
  State<CommentCard> createState() => _CommentCardState();
}

class _CommentCardState extends State<CommentCard> {
  bool _revealed = false;
  bool _replying = false;
  bool _editing = false;
  bool _showReplies = false;

  Future<CommentListResponse>? _repliesFuture;

  Future<void> _delete() async {
    try {
      await AppScope.read(
        context,
      ).commentRepository.deleteComment(widget.comment.id);

      await widget.onChanged();
    } catch (error) {
      if (!mounted) return;

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  Future<void> _toggleReaction(String type) async {
    try {
      final repo = AppScope.read(context).commentRepository;

      if (widget.comment.currentUserReaction == type) {
        await repo.removeReaction(widget.comment.id);
      } else {
        await repo.setReaction(widget.comment.id, type);
      }

      await widget.onChanged();
    } catch (error) {
      if (!mounted) return;

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  void _toggleReplies() {
    setState(() {
      _showReplies = !_showReplies;
      _repliesFuture ??= AppScope.read(context).commentRepository.listComments(
        targetType: widget.targetType,
        targetId: widget.targetId,
        parentId: widget.comment.id,
        limit: 10,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final comment = widget.comment;
    final user = widget.user;
    final visible = comment.isVisible;

    final canEdit = visible && user?.id == comment.author?.id;
    final canDelete =
        visible && (user?.id == comment.author?.id || user?.role == 'ADMIN');

    final margin = EdgeInsets.only(
      left: (widget.depth > 5 ? 5 : widget.depth) * 14,
      bottom: 10,
    );

    return Container(
      margin: margin,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(context, comment, canDelete),
              if (_editing)
                CommentComposer(
                  targetType: widget.targetType,
                  targetId: widget.targetId,
                  editingComment: comment,
                  onChanged: () async {
                    setState(() => _editing = false);
                    await widget.onChanged();
                  },
                )
              else
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: CommentBody(
                    comment: comment,
                    revealed: _revealed,
                    onReveal: () => setState(() => _revealed = true),
                  ),
                ),
              const SizedBox(height: 8),
              _buildActions(user: user, visible: visible, canEdit: canEdit),
              if (_replying)
                CommentComposer(
                  targetType: widget.targetType,
                  targetId: widget.targetId,
                  parentId: comment.id,
                  onChanged: () async {
                    setState(() {
                      _replying = false;
                      _repliesFuture = null;
                    });

                    await widget.onChanged();
                  },
                ),
              if (_showReplies && _repliesFuture != null) _buildReplies(user),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(
    BuildContext context,
    CommentItem comment,
    bool canDelete,
  ) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                comment.author?.displayName ?? 'Unknown reader',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              Text(
                formatCommentDate(comment.createdAt),
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: MangaTheme.muted),
              ),
            ],
          ),
        ),
        if (canDelete)
          IconButton(
            tooltip: 'Delete comment',
            onPressed: _delete,
            icon: const Icon(Icons.delete_outline),
          ),
      ],
    );
  }

  Widget _buildActions({
    required User? user,
    required bool visible,
    required bool canEdit,
  }) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        ReactionChipList(
          comment: widget.comment,
          user: user,
          visible: visible,
          onToggleReaction: _toggleReaction,
        ),
        ActionChip(
          avatar: const Icon(Icons.reply, size: 16),
          label: const Text('Reply'),
          onPressed: user == null || !visible
              ? null
              : () => setState(() => _replying = !_replying),
        ),
        if (canEdit)
          ActionChip(
            avatar: Icon(_editing ? Icons.undo : Icons.edit_outlined, size: 16),
            label: Text(_editing ? 'Cancel' : 'Edit'),
            onPressed: () => setState(() => _editing = !_editing),
          ),
        if (widget.comment.replyCount > 0)
          ActionChip(
            label: Text(
              _showReplies
                  ? 'Hide replies'
                  : '${widget.comment.replyCount} replies',
            ),
            onPressed: _toggleReplies,
          ),
      ],
    );
  }

  Widget _buildReplies(User? user) {
    return FutureBuilder<CommentListResponse>(
      future: _repliesFuture,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Padding(
            padding: EdgeInsets.all(8),
            child: Text('Loading replies...'),
          );
        }

        return Column(
          children: snapshot.data!.data
              .map(
                (reply) => CommentCard(
                  comment: reply,
                  targetType: widget.targetType,
                  targetId: widget.targetId,
                  user: user,
                  onChanged: widget.onChanged,
                  depth: widget.depth + 1,
                ),
              )
              .toList(),
        );
      },
    );
  }
}
