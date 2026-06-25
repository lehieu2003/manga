import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../data/repositories/repositories.dart';
import '../../../../domain/models/models.dart';
import 'library_state.dart';

class LibraryCubit extends Cubit<LibraryState> {
  LibraryCubit({required this.libraryRepository})
    : super(LibraryState.initial());

  final LibraryRepository libraryRepository;

  Future<void> load() async {
    emit(state.copyWith(loading: true, error: null, notice: null));

    try {
      final items = await libraryRepository.all();

      emit(state.copyWith(items: items, loading: false, error: null));
    } catch (error) {
      emit(state.copyWith(loading: false, error: error.toString()));
    }
  }

  Future<void> updateItem(
    LibraryItem item, {
    String? status,
    bool? favorite,
  }) async {
    try {
      await libraryRepository.upsert(
        item.mangaId,
        status: status ?? item.status,
        isFavorite: favorite ?? item.isFavorite,
      );

      final items = await libraryRepository.all();

      emit(
        state.copyWith(items: items, notice: 'Library updated.', error: null),
      );
    } catch (error) {
      emit(state.copyWith(notice: error.toString()));
    }
  }

  Future<void> removeItem(String mangaId) async {
    try {
      await libraryRepository.remove(mangaId);

      final items = await libraryRepository.all();

      emit(
        state.copyWith(
          items: items,
          notice: 'Removed from library.',
          error: null,
        ),
      );
    } catch (error) {
      emit(state.copyWith(notice: error.toString()));
    }
  }

  void setTab(String tab) {
    emit(state.copyWith(tab: tab));
  }

  void setQuery(String query) {
    emit(state.copyWith(query: query));
  }

  void setSort(String sort) {
    emit(state.copyWith(sort: sort));
  }

  void clearFilters() {
    emit(state.copyWith(query: '', sort: 'lastRead'));
  }

  void clearNotice() {
    emit(state.copyWith(notice: null));
  }
}
