import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'app_state.dart';
import 'features/auth/auth_screens.dart';
import 'features/detail/manga_detail_screen.dart';
import 'features/home/home_screen.dart';
import 'features/library/library_screen.dart';
import 'features/reader/reader_screen.dart';
import 'features/search/search_screen.dart';
import 'features/settings/settings_screen.dart';

GoRouter buildRouter(AppState appState) {
  return GoRouter(
    refreshListenable: appState,
    initialLocation: '/',
    redirect: (context, state) {
      final protected =
          state.matchedLocation == '/library' ||
          state.matchedLocation == '/settings';
      final authRoute =
          state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';
      if (appState.isBooting) return null;
      if (protected && !appState.isSignedIn) {
        return '/login?from=${Uri.encodeComponent(state.uri.toString())}';
      }
      if (authRoute && appState.isSignedIn) return '/';
      return null;
    },
    routes: [
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
          GoRoute(
            path: '/search',
            builder: (context, state) => const SearchScreen(),
          ),
          GoRoute(
            path: '/library',
            builder: (context, state) => const LibraryScreen(),
          ),
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingsScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) =>
            LoginScreen(from: state.uri.queryParameters['from']),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/manga/:mangaId',
        builder: (context, state) =>
            MangaDetailScreen(mangaId: state.pathParameters['mangaId']!),
      ),
      GoRoute(
        path: '/read/:chapterId',
        builder: (context, state) => ReaderScreen(
          chapterId: state.pathParameters['chapterId']!,
          mangaId: state.uri.queryParameters['mangaId'],
        ),
      ),
    ],
  );
}

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final index = switch (location) {
      '/search' => 1,
      '/library' => 2,
      '/settings' => 3,
      _ => 0,
    };
    return Scaffold(
      appBar: AppBar(
        title: const Text('Manga Cafe'),
        actions: [
          IconButton(
            tooltip: 'Search',
            onPressed: () => context.go('/search'),
            icon: const Icon(Icons.search),
          ),
        ],
      ),
      body: SafeArea(child: child),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: index,
        onTap: (value) {
          switch (value) {
            case 1:
              context.go('/search');
            case 2:
              context.go('/library');
            case 3:
              context.go('/settings');
            default:
              context.go('/');
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.explore_outlined),
            activeIcon: Icon(Icons.explore),
            label: 'Search',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.library_books_outlined),
            activeIcon: Icon(Icons.library_books),
            label: 'Library',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}
