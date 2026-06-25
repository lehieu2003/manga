import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:manga_mobile/ui/features/chat/chat_assistant_button.dart';

import '../../app_state.dart';
import '../../core/widgets.dart';
import 'cubit/reader_cubit.dart';
import 'cubit/reader_state.dart';
import 'widgets/chapter_nav.dart';
import 'widgets/paged_reader_view.dart';
import 'widgets/reader_comments_sheet.dart';
import 'widgets/reader_error_pane.dart';
import 'widgets/vertical_reader_view.dart';

class ReaderScreen extends StatelessWidget {
  const ReaderScreen({super.key, required this.chapterId, this.mangaId});

  final String chapterId;
  final String? mangaId;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);

    return BlocProvider(
      create: (_) => ReaderCubit(
        chapterId: chapterId,
        mangaId: mangaId,
        catalogRepository: app.catalogRepository,
        libraryRepository: app.libraryRepository,
        readerSettingsStore: app.readerSettingsStore,
        isSignedIn: app.isSignedIn,
        assetUrl: app.catalogRepository.assetUrl,
      )..load(),
      child: _ReaderView(
        chapterId: chapterId,
        mangaId: mangaId,
        isSignedIn: app.isSignedIn,
      ),
    );
  }
}

class _ReaderView extends StatefulWidget {
  const _ReaderView({
    required this.chapterId,
    required this.mangaId,
    required this.isSignedIn,
  });

  final String chapterId;
  final String? mangaId;
  final bool isSignedIn;

  @override
  State<_ReaderView> createState() => _ReaderViewState();
}

class _ReaderViewState extends State<_ReaderView> {
  void _openComments() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) {
        return ReaderCommentsSheet(chapterId: widget.chapterId);
      },
    );
  }

  void _preloadAround(ReaderState state) {
    if (!state.paged || !mounted) return;

    for (final next in [state.pageIndex + 1, state.pageIndex + 2]) {
      if (next >= 0 && next < state.pages.length) {
        precacheImage(CachedNetworkImageProvider(state.pages[next]), context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<ReaderCubit, ReaderState>(
      listenWhen: (previous, current) {
        return previous.pageIndex != current.pageIndex ||
            previous.pages != current.pages ||
            previous.paged != current.paged;
      },
      listener: (context, state) {
        _preloadAround(state);
      },
      builder: (context, state) {
        final cubit = context.read<ReaderCubit>();

        return PopScope(
          onPopInvokedWithResult: (_, _) {
            cubit.saveProgress();
          },
          child: Scaffold(
            backgroundColor: Colors.black,
            appBar: AppBar(
              backgroundColor: Colors.black,
              title: Text(
                'Page ${state.displayPageNumber}/${state.pages.length}',
              ),
              actions: [
                IconButton(
                  tooltip: 'Chapter comments',
                  onPressed: _openComments,
                  icon: const Icon(Icons.mode_comment_outlined),
                ),
                IconButton(
                  tooltip: state.dataSaver
                      ? 'Use original quality'
                      : 'Use data saver',
                  onPressed: cubit.toggleQuality,
                  icon: Icon(
                    state.dataSaver ? Icons.hd_outlined : Icons.data_saver_on,
                  ),
                ),
                IconButton(
                  tooltip: state.paged ? 'Vertical mode' : 'Paged mode',
                  onPressed: cubit.togglePaged,
                  icon: Icon(
                    state.paged ? Icons.view_stream : Icons.view_carousel,
                  ),
                ),
                IconButton(
                  tooltip: 'Image fit',
                  onPressed: cubit.toggleContain,
                  icon: const Icon(Icons.fit_screen),
                ),
              ],
            ),
            body: _buildBody(context, state, cubit),
            floatingActionButton: widget.isSignedIn
                ? ChatAssistantButton(
                    mangaId: widget.mangaId,
                    chapterId: widget.chapterId,
                  )
                : null,
          ),
        );
      },
    );
  }

  Widget _buildBody(
    BuildContext context,
    ReaderState state,
    ReaderCubit cubit,
  ) {
    if (state.loading) {
      return const AsyncPane(message: 'Preparing reader...');
    }

    if (state.error != null) {
      return ReaderErrorPane(
        message: state.error!,
        mangaId: widget.mangaId,
        onRetry: cubit.load,
      );
    }

    if (state.pages.isEmpty) {
      return const AsyncPane(message: 'No readable pages were returned.');
    }

    return Column(
      children: [
        ChapterNav(
          chapterId: widget.chapterId,
          mangaId: widget.mangaId,
          chapters: state.chapters,
        ),
        Expanded(
          child: state.paged
              ? PagedReaderView(
                  pages: state.pages,
                  pageIndex: state.pageIndex,
                  contain: state.contain,
                  onPageChanged: cubit.setPage,
                )
              : VerticalReaderView(
                  pages: state.pages,
                  contain: state.contain,
                  onVisible: cubit.setPage,
                ),
        ),
      ],
    );
  }
}
