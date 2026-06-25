import 'package:flutter/material.dart';

import '../../comments/comment_section.dart';

class ReaderCommentsSheet extends StatelessWidget {
  const ReaderCommentsSheet({super.key, required this.chapterId});

  final String chapterId;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.78,
          child: SingleChildScrollView(
            child: CommentSection(
              targetType: 'CHAPTER',
              targetId: chapterId,
              compact: true,
            ),
          ),
        ),
      ),
    );
  }
}
