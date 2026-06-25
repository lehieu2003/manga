import '../../../../domain/models/models.dart';

class CommentSectionState {
  const CommentSectionState({
    required this.comments,
    required this.loading,
    required this.loadingMore,
    this.nextCursor,
    this.error,
    this.notice,
  });

  factory CommentSectionState.initial() {
    return const CommentSectionState(
      comments: [],
      loading: true,
      loadingMore: false,
    );
  }

  final List<CommentItem> comments;
  final bool loading;
  final bool loadingMore;
  final String? nextCursor;
  final String? error;
  final String? notice;

  bool get hasMore => nextCursor != null;

  static const _unset = Object();

  CommentSectionState copyWith({
    List<CommentItem>? comments,
    bool? loading,
    bool? loadingMore,
    Object? nextCursor = _unset,
    Object? error = _unset,
    Object? notice = _unset,
  }) {
    return CommentSectionState(
      comments: comments ?? this.comments,
      loading: loading ?? this.loading,
      loadingMore: loadingMore ?? this.loadingMore,
      nextCursor: nextCursor == _unset
          ? this.nextCursor
          : nextCursor as String?,
      error: error == _unset ? this.error : error as String?,
      notice: notice == _unset ? this.notice : notice as String?,
    );
  }
}
