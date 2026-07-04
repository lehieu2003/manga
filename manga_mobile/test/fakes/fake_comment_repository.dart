import 'package:manga_mobile/data/repositories/repositories.dart';
import 'package:manga_mobile/domain/models/models.dart';

import '../helpers/test_app.dart';

class FakeCommentRepository extends CommentRepository {
  FakeCommentRepository(super.api);

  final List<CommentItem> comments = [
    CommentItem(
      id: 'comment-1',
      targetType: 'MANGA',
      targetId: 'manga-1',
      parentId: null,
      rootId: null,
      depth: 0,
      content: 'Great chapter list.',
      isSpoiler: false,
      status: 'VISIBLE',
      createdAt: testNow,
      updatedAt: testNow,
      replyCount: 1,
      reactionCounts: const {'LIKE': 1},
      author: const CommentAuthor(
        id: 'user-1',
        displayName: 'Reader',
        role: 'USER',
      ),
    ),
    CommentItem(
      id: 'comment-2',
      targetType: 'CHAPTER',
      targetId: 'chapter-1',
      parentId: null,
      rootId: null,
      depth: 0,
      content: 'Spoiler comment.',
      isSpoiler: true,
      status: 'VISIBLE',
      createdAt: testNow,
      updatedAt: testNow,
      replyCount: 0,
      reactionCounts: const {},
      author: const CommentAuthor(
        id: 'user-2',
        displayName: 'Other',
        role: 'USER',
      ),
    ),
  ];

  @override
  Future<CommentListResponse> listComments({
    required String targetType,
    required String targetId,
    String? parentId,
    String? cursor,
    int limit = 20,
  }) async {
    return CommentListResponse(
      data: comments
          .where(
            (comment) =>
                comment.targetType == targetType &&
                comment.targetId == targetId &&
                comment.parentId == parentId,
          )
          .toList(),
    );
  }

  @override
  Future<CommentItem> createComment({
    required String targetType,
    required String targetId,
    String? parentId,
    required String content,
    required bool isSpoiler,
  }) async {
    final item = CommentItem(
      id: 'comment-${comments.length + 1}',
      targetType: targetType,
      targetId: targetId,
      parentId: parentId,
      rootId: parentId,
      depth: parentId == null ? 0 : 1,
      content: content,
      isSpoiler: isSpoiler,
      status: 'VISIBLE',
      createdAt: testNow,
      updatedAt: testNow,
      replyCount: 0,
      reactionCounts: const {},
      author: const CommentAuthor(
        id: 'user-1',
        displayName: 'Reader',
        role: 'USER',
      ),
    );
    comments.add(item);
    return item;
  }

  @override
  Future<CommentItem> updateComment(
    String id, {
    String? content,
    bool? isSpoiler,
  }) async {
    return comments.firstWhere((comment) => comment.id == id);
  }

  @override
  Future<CommentItem> deleteComment(String id) async {
    return comments.firstWhere((comment) => comment.id == id);
  }

  @override
  Future<void> setReaction(String id, String type) async {}

  @override
  Future<void> removeReaction(String id) async {}
}
