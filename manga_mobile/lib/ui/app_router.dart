import 'package:go_router/go_router.dart';
import 'package:manga_mobile/ui/features/search/search_discovery_preset.dart';

import 'app_shell.dart';
import 'app_state.dart';
import 'features/auth/login/login_screen.dart';
import 'features/auth/register/register_screen.dart';
import 'features/auth/forgot_password/forgot_password_screen.dart';
import 'features/auth/reset_password/reset_password_screen.dart';
import 'features/auth/verify_email/verify_email_screen.dart';
import 'features/detail/manga_detail_screen.dart';
import 'features/home/home_screen.dart';
import 'features/library/library_screen.dart';
import 'features/messages/messages_screen.dart';
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
          state.matchedLocation == '/messages' ||
          state.matchedLocation == '/settings';
      final authRoute =
          state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';
      if (appState.isBooting) return null;
      if (protected && !appState.isSignedIn) {
        return '/login?from=${Uri.encodeComponent(state.uri.toString())}';
      }
      if (authRoute && appState.isSignedIn) {
        final from = state.uri.queryParameters['from'];

        if (from != null && from.startsWith('/')) {
          return from;
        }

        return '/';
      }
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
            path: '/discover/popular',
            builder: (context, state) =>
                const SearchScreen(preset: DiscoveryPreset.popular),
          ),
          GoRoute(
            path: '/discover/latest',
            builder: (context, state) =>
                const SearchScreen(preset: DiscoveryPreset.latest),
          ),
          GoRoute(
            path: '/genres/:genre',
            builder: (context, state) =>
                SearchScreen(routeGenre: state.pathParameters['genre']),
          ),
          GoRoute(
            path: '/library',
            builder: (context, state) => const LibraryScreen(),
          ),
          GoRoute(
            path: '/messages',
            builder: (context, state) => const MessagesScreen(),
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
        path: '/forgot',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/reset',
        builder: (context, state) =>
            ResetPasswordScreen(token: state.uri.queryParameters['token']),
      ),
      GoRoute(
        path: '/verify',
        builder: (context, state) =>
            VerifyEmailScreen(email: state.uri.queryParameters['email']),
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
