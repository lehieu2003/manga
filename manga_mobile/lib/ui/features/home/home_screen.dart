import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:manga_mobile/ui/features/home/home_state.dart';

import '../../app_state.dart';
import '../../core/widgets.dart';
import 'continue_section.dart';
import 'genre_section.dart';
import 'hero_section.dart';
import 'home_cubit.dart';
import 'latest_section.dart';
import 'popular_section.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final HomeCubit _cubit;

  @override
  void initState() {
    super.initState();
    _cubit = HomeCubit();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final app = AppScope.of(context);
    _cubit.load(app);
  }

  @override
  void dispose() {
    _cubit.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);

    return BlocProvider.value(
      value: _cubit,
      child: BlocBuilder<HomeCubit, HomeState>(
        builder: (context, state) {
          if (state.isLoading &&
              state.popular.isEmpty &&
              state.latest.isEmpty) {
            return const AsyncPane(message: 'Loading manga shelf...');
          }

          if (state.error != null &&
              state.popular.isEmpty &&
              state.latest.isEmpty) {
            return AsyncPane(
              message: state.error.toString(),
              onRetry: () => _cubit.load(app),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => _cubit.load(app),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(14),
              children: [
                HomeHeroSection(app: app),
                if (app.isSignedIn)
                  HomeContinueSection(
                    continueItems: state.continueItems,
                    onLibraryTap: () => context.go('/library'),
                  ),
                HomeGenreSection(
                  genres: state.genres,
                  onGenreTap: (String genreName) =>
                      context.go('/genres/${Uri.encodeComponent(genreName)}'),
                ),
                HomePopularSection(
                  items: state.popular,
                  assetUrl: app.catalogRepository.assetUrl,
                ),
                HomeLatestSection(
                  items: state.latest,
                  assetUrl: app.catalogRepository.assetUrl,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
