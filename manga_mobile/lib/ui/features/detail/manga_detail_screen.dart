import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:manga_mobile/ui/features/chat/chat_assistant_button.dart';

import '../../app_state.dart';
import '../../core/widgets.dart';
import '../comments/comment_section.dart';
import 'cubit/manga_detail_cubit.dart';
import 'cubit/manga_detail_state.dart';
import 'widgets/chapter_filter_bar.dart';
import 'widgets/chapter_group_filters.dart';
import 'widgets/chapter_row.dart';
import 'widgets/continue_reading_card.dart';
import 'widgets/manga_info_card.dart';

class MangaDetailScreen extends StatelessWidget {
  const MangaDetailScreen({super.key, required this.mangaId});

  final String mangaId;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);

    return BlocProvider(
      create: (_) => MangaDetailCubit(
        mangaId: mangaId,
        catalogRepository: app.catalogRepository,
        libraryRepository: app.libraryRepository,
        isSignedIn: app.isSignedIn,
      )..load(),
      child: _MangaDetailView(
        mangaId: mangaId,
        isSignedIn: app.isSignedIn,
        assetUrl: app.catalogRepository.assetUrl,
      ),
    );
  }
}

class _MangaDetailView extends StatefulWidget {
  const _MangaDetailView({
    required this.mangaId,
    required this.isSignedIn,
    required this.assetUrl,
  });

  final String mangaId;
  final bool isSignedIn;
  final String Function(String? url) assetUrl;

  @override
  State<_MangaDetailView> createState() => _MangaDetailViewState();
}

class _MangaDetailViewState extends State<_MangaDetailView> {
  final _chapterSearchController = TextEditingController();

  @override
  void dispose() {
    _chapterSearchController.dispose();
    super.dispose();
  }

  void _syncChapterSearch(String value) {
    if (_chapterSearchController.text == value) return;

    _chapterSearchController.value = TextEditingValue(
      text: value,
      selection: TextSelection.collapsed(offset: value.length),
    );
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<MangaDetailCubit, MangaDetailState>(
      listenWhen: (previous, current) {
        return previous.notice != current.notice ||
            previous.chapterSearch != current.chapterSearch;
      },
      listener: (context, state) {
        _syncChapterSearch(state.chapterSearch);

        if (state.notice != null) {
          _showSnack(state.notice!);
          context.read<MangaDetailCubit>().clearNotice();
        }
      },
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(title: const Text('Manga detail')),
          floatingActionButton: widget.isSignedIn
              ? ChatAssistantButton(mangaId: widget.mangaId)
              : null,
          body: _buildBody(context, state),
        );
      },
    );
  }

  Widget _buildBody(BuildContext context, MangaDetailState state) {
    final cubit = context.read<MangaDetailCubit>();

    if (state.loading) {
      return const AsyncPane(message: 'Loading manga...');
    }

    if (state.error != null && state.manga == null) {
      return AsyncPane(message: state.error!, onRetry: cubit.load);
    }

    final manga = state.manga;

    if (manga == null) {
      return const AsyncPane(message: 'Manga not found.');
    }

    final cover = widget.assetUrl(manga.coverUrl);
    final visible = state.visibleChapters;
    final latestPublishAt = state.latestPublishAt;
    final continueChapter = state.continueChapter;
    final readingProgress = state.progress?.progress;

    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        MangaInfoCard(
          manga: manga,
          coverUrl: cover,
          isSignedIn: widget.isSignedIn,
          libraryItem: state.libraryItem,
          error: state.error,
          onFollow: cubit.follow,
          onRemove: cubit.remove,
          onLogin: () => context.push('/login'),
        ),
        if (readingProgress != null && continueChapter != null)
          ContinueReadingCard(
            mangaId: widget.mangaId,
            chapter: continueChapter,
            progress: readingProgress,
          ),
        SectionHeader(title: 'Chapters (${state.chapterTotal})'),
        ChapterFilterBar(
          state: state,
          searchController: _chapterSearchController,
          onClearFilters: cubit.clearChapterFilters,
          onLanguageSelected: cubit.toggleLanguage,
          onSearchChanged: cubit.setChapterSearch,
          onSortChanged: cubit.setSort,
        ),
        ChapterGroupFilters(
          groups: state.groups,
          selectedGroups: state.selectedGroups,
          onSelected: cubit.toggleGroup,
        ),
        const SizedBox(height: 10),
        ...visible.map(
          (chapter) => ChapterRow(
            chapter: chapter,
            mangaId: widget.mangaId,
            currentProgress: state.progress?.progress,
            chaptersProgress: state.progress?.chaptersProgress ?? const [],
            isLatest:
                latestPublishAt != null &&
                chapter.publishAt.isAtSameMomentAs(latestPublishAt),
          ),
        ),
        if (state.canLoadMore)
          Padding(
            padding: const EdgeInsets.all(16),
            child: FilledButton(
              onPressed: state.loadingMore ? null : cubit.loadMoreChapters,
              child: Text(state.loadingMore ? 'Loading...' : 'Load more'),
            ),
          ),
        CommentSection(targetType: 'MANGA', targetId: widget.mangaId),
      ],
    );
  }
}
