import 'package:flutter/material.dart';

import '../../../domain/models/models.dart';
import '../../app_state.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';

const _reactionTypes = ['LIKE', 'HEART', 'SAD', 'LAUGH', 'ANGRY'];

class CommentSection extends StatefulWidget {
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
  State<CommentSection> createState() => _CommentSectionState();
}

class _CommentSectionState extends State<CommentSection> {
  late Future<CommentListResponse> _future;
  final List<CommentItem> _comments = [];
  String? _nextCursor;
  bool _loadingMore = false;

  @override
  void initState() {
    super.initState();
    _future = _load(reset: true);
  }

  Future<CommentListResponse> _load({required bool reset}) async {
    final page = await AppScope.of(context).commentRepository.listComments(
      targetType: widget.targetType,
      targetId: widget.targetId,
      cursor: reset ? null : _nextCursor,
      limit: 20,
    );
    if (mounted) {
      setState(() {
        if (reset) _comments.clear();
        _comments.addAll(page.data);
        _nextCursor = page.nextCursor;
      });
    }
    return page;
  }

  Future<void> _reload() async {
    setState(() => _future = _load(reset: true));
    await _future;
  }

  Future<void> _loadMore() async {
    if (_nextCursor == null || _loadingMore) return;
    setState(() => _loadingMore = true);
    try {
      await _load(reset: false);
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    return Card(
      child: Padding(
        padding: EdgeInsets.all(widget.compact ? 12 : 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.targetType == 'MANGA'
                            ? 'Manga comments'
                            : 'Chapter comments',
                        style: const TextStyle(
                          color: MangaTheme.amber,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Reader discussion',
                        style: Theme.of(context).textTheme.titleLarge
                            ?.copyWith(fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                ),
                const Chip(label: Text('Newest first')),
              ],
            ),
            const SizedBox(height: 12),
            CommentComposer(
              targetType: widget.targetType,
              targetId: widget.targetId,
              onChanged: _reload,
            ),
            const SizedBox(height: 12),
            FutureBuilder<CommentListResponse>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting &&
                    _comments.isEmpty) {
                  return const AsyncPane(message: 'Loading comments...');
                }
                if (snapshot.hasError && _comments.isEmpty) {
                  return AsyncPane(
                    message: 'Could not load comments.',
                    onRetry: _reload,
                  );
                }
                if (_comments.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Text('No comments yet. Start the discussion.'),
                  );
                }
                return Column(
                  children: [
                    for (final comment in _comments)
                      CommentCard(
                        comment: comment,
                        targetType: widget.targetType,
                        targetId: widget.targetId,
                        user: app.user,
                        onChanged: _reload,
                      ),
                    if (_nextCursor != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: OutlinedButton(
                          onPressed: _loadingMore ? null : _loadMore,
                          child: Text(
                            _loadingMore ? 'Loading...' : 'More comments',
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

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
    await AppScope.of(context).commentRepository.deleteComment(
      widget.comment.id,
    );
    await widget.onChanged();
  }

  Future<void> _toggleReaction(String type) async {
    final repo = AppScope.of(context).commentRepository;
    if (widget.comment.currentUserReaction == type) {
      await repo.removeReaction(widget.comment.id);
    } else {
      await repo.setReaction(widget.comment.id, type);
    }
    await widget.onChanged();
  }

  void _toggleReplies() {
    setState(() {
      _showReplies = !_showReplies;
      _repliesFuture ??= AppScope.of(context).commentRepository.listComments(
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
        visible &&
        (user?.id == comment.author?.id || user?.role == 'ADMIN');
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
              Row(
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
                          _formatDate(comment.createdAt),
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: MangaTheme.muted),
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
              ),
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
                  child: _CommentBody(
                    comment: comment,
                    revealed: _revealed,
                    onReveal: () => setState(() => _revealed = true),
                  ),
                ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final type in _reactionTypes)
                    FilterChip(
                      label: Text(
                        '${_reactionLabel(type)} ${comment.reactionCounts[type] ?? 0}',
                      ),
                      selected: comment.currentUserReaction == type,
                      onSelected: user == null || !visible
                          ? null
                          : (_) => _toggleReaction(type),
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
                      avatar: Icon(
                        _editing ? Icons.undo : Icons.edit_outlined,
                        size: 16,
                      ),
                      label: Text(_editing ? 'Cancel' : 'Edit'),
                      onPressed: () => setState(() => _editing = !_editing),
                    ),
                  if (comment.replyCount > 0)
                    ActionChip(
                      label: Text(
                        _showReplies
                            ? 'Hide replies'
                            : '${comment.replyCount} replies',
                      ),
                      onPressed: _toggleReplies,
                    ),
                ],
              ),
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
              if (_showReplies && _repliesFuture != null)
                FutureBuilder<CommentListResponse>(
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
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CommentBody extends StatelessWidget {
  const _CommentBody({
    required this.comment,
    required this.revealed,
    required this.onReveal,
  });

  final CommentItem comment;
  final bool revealed;
  final VoidCallback onReveal;

  @override
  Widget build(BuildContext context) {
    if (!comment.isVisible) {
      return Text(
        comment.status == 'DELETED'
            ? 'Comment deleted'
            : 'Comment hidden by moderation',
        style: const TextStyle(color: MangaTheme.muted),
      );
    }
    if (comment.isSpoiler && !revealed) {
      return OutlinedButton.icon(
        onPressed: onReveal,
        icon: const Icon(Icons.visibility),
        label: const Text('Spoiler hidden. Tap to reveal.'),
      );
    }
    return Text(comment.content);
  }
}

class CommentComposer extends StatefulWidget {
  const CommentComposer({
    super.key,
    required this.targetType,
    required this.targetId,
    required this.onChanged,
    this.parentId,
    this.editingComment,
  });

  final String targetType;
  final String targetId;
  final String? parentId;
  final CommentItem? editingComment;
  final Future<void> Function() onChanged;

  @override
  State<CommentComposer> createState() => _CommentComposerState();
}

class _CommentComposerState extends State<CommentComposer> {
  late final TextEditingController _content;
  late bool _spoiler;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _content = TextEditingController(text: widget.editingComment?.content);
    _spoiler = widget.editingComment?.isSpoiler ?? false;
  }

  @override
  void dispose() {
    _content.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final content = _content.text.trim();
    if (content.isEmpty || _saving) return;
    setState(() => _saving = true);
    try {
      final repo = AppScope.of(context).commentRepository;
      final editing = widget.editingComment;
      if (editing == null) {
        await repo.createComment(
          targetType: widget.targetType,
          targetId: widget.targetId,
          parentId: widget.parentId,
          content: content,
          isSpoiler: _spoiler,
        );
      } else {
        await repo.updateComment(
          editing.id,
          content: content,
          isSpoiler: _spoiler,
        );
      }
      _content.clear();
      setState(() => _spoiler = false);
      await widget.onChanged();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AppScope.of(context).user;
    if (user == null) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(12),
          child: Text('Login to join the discussion.'),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(
        children: [
          TextField(
            controller: _content,
            minLines: 2,
            maxLines: 5,
            maxLength: 2000,
            decoration: InputDecoration(
              labelText: widget.parentId == null
                  ? 'Share a thought'
                  : 'Write a reply',
            ),
          ),
          Row(
            children: [
              FilterChip(
                label: const Text('Spoiler'),
                selected: _spoiler,
                onSelected: (value) => setState(() => _spoiler = value),
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: _saving ? null : _submit,
                icon: const Icon(Icons.send),
                label: Text(
                  _saving
                      ? 'Saving...'
                      : widget.editingComment != null
                      ? 'Save'
                      : widget.parentId != null
                      ? 'Reply'
                      : 'Comment',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

String _reactionLabel(String type) => switch (type) {
  'HEART' => 'Heart',
  'SAD' => 'Sad',
  'LAUGH' => 'Laugh',
  'ANGRY' => 'Angry',
  _ => 'Like',
};

String _formatDate(DateTime date) =>
    '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
