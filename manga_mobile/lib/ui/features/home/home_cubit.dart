import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:manga_mobile/ui/features/home/home_state.dart';
import '../../../domain/models/models.dart';
import '../../app_state.dart';

class HomeCubit extends Cubit<HomeState> {
  HomeCubit() : super(const HomeState(isLoading: true));

  List<LibraryItem> sortContinueItems(List<LibraryItem> library) {
    final continueItems =
        library
            .where(
              (item) => item.readingProgress != null || item.lastReadAt != null,
            )
            .toList()
          ..sort((a, b) => _activityTime(b).compareTo(_activityTime(a)));

    return continueItems;
  }

  Future<void> load(AppState app) async {
    emit(state.copyWith(isLoading: true, error: null));

    try {
      final popularResponse = await app.catalogRepository.searchManga(
        limit: 12,
        sort: 'followed',
      );
      final latestResponse = await app.catalogRepository.searchManga(
        limit: 8,
        sort: 'latest',
      );
      final genres = await app.catalogRepository.genres();
      final library = app.isSignedIn
          ? await app.libraryRepository.all()
          : <LibraryItem>[];

      emit(
        state.copyWith(
          isLoading: false,
          popular: popularResponse.data,
          latest: latestResponse.data,
          genres: genres,
          library: library,
          continueItems: sortContinueItems(library),
        ),
      );
    } catch (error) {
      emit(state.copyWith(isLoading: false, error: error.toString()));
    }
  }
}

DateTime _activityTime(LibraryItem item) =>
    item.readingProgress?.updatedAt ?? item.lastReadAt ?? item.updatedAt;
