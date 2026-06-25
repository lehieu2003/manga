import 'package:flutter/material.dart';

import '../../../../domain/models/models.dart';
import '../../../app_state.dart';

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
      final repo = AppScope.read(context).commentRepository;
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

      if (mounted) {
        setState(() => _spoiler = false);
      }

      await widget.onChanged();
    } catch (error) {
      if (!mounted) return;

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.toString())));
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
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
            onTapOutside: (_) {
              FocusScope.of(context).unfocus();
            },
          ),
          Row(
            children: [
              FilterChip(
                label: const Text('Spoiler'),
                selected: _spoiler,
                onSelected: (value) {
                  setState(() => _spoiler = value);
                },
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
