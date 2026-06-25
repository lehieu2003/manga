import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../data/repositories/repositories.dart';
import 'comment_section_state.dart';

class CommentSectionCubit extends Cubit<CommentSectionState> {
  CommentSectionCubit({
    required this.commentRepository,
    required this.targetType,
    required this.targetId,
  }) : super(CommentSectionState.initial());

  final CommentRepository commentRepository;
  final String targetType;
  final String targetId;

  Future<void> load({required bool reset}) async {
    if (reset) {
      emit(
        state.copyWith(
          loading: true,
          loadingMore: false,
          error: null,
          notice: null,
          nextCursor: null,
        ),
      );
    } else {
      if (state.nextCursor == null || state.loadingMore) return;

      emit(state.copyWith(loadingMore: true, error: null, notice: null));
    }

    try {
      final page = await commentRepository.listComments(
        targetType: targetType,
        targetId: targetId,
        cursor: reset ? null : state.nextCursor,
        limit: 20,
      );

      emit(
        state.copyWith(
          comments: reset ? page.data : [...state.comments, ...page.data],
          nextCursor: page.nextCursor,
          loading: false,
          loadingMore: false,
          error: null,
        ),
      );
    } catch (error) {
      emit(
        state.copyWith(
          loading: false,
          loadingMore: false,
          error: reset ? error.toString() : state.error,
          notice: reset ? null : error.toString(),
        ),
      );
    }
  }

  Future<void> reload() async {
    await load(reset: true);
  }

  Future<void> loadMore() async {
    await load(reset: false);
  }

  void clearNotice() {
    emit(state.copyWith(notice: null));
  }
}
