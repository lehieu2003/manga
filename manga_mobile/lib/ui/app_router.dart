import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:manga_mobile/ui/features/chat/chat_assistant_button.dart';

import 'app_state.dart';
import 'features/auth/login/login_screen.dart';
import 'features/auth/register/register_screen.dart';
import 'features/auth/forgot_password/forgot_password_screen.dart';
import 'features/auth/reset_password/reset_password_screen.dart';
import 'features/auth/verify_email/verify_email_screen.dart';
import 'features/detail/manga_detail_screen.dart';
import 'features/home/home_screen.dart';
import 'features/library/library_screen.dart';
import 'features/notifications/notification_center.dart';
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

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final app = AppScope.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final showSearchAction = MediaQuery.sizeOf(context).width >= 360;
    final routeContext = _routeContext(location);
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
            tooltip: isDark ? 'Switch to light mode' : 'Switch to dark mode',
            onPressed: () =>
                app.setThemeMode(isDark ? ThemeMode.light : ThemeMode.dark),
            icon: Icon(isDark ? Icons.light_mode : Icons.dark_mode),
          ),
          if (showSearchAction)
            IconButton(
              tooltip: 'Search',
              onPressed: () => context.go('/search'),
              icon: const Icon(Icons.search),
            ),
          const NotificationCenterButton(),
        ],
      ),
      drawer: _AppDrawer(
        location: location,
        isDark: isDark,
        onThemeToggle: () =>
            app.setThemeMode(isDark ? ThemeMode.light : ThemeMode.dark),
      ),
      body: SafeArea(child: child),
      floatingActionButton: app.isSignedIn
          ? ChatAssistantButton(
              mangaId: routeContext.mangaId,
              chapterId: routeContext.chapterId,
            )
          : null,

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

class _AppDrawer extends StatelessWidget {
  const _AppDrawer({
    required this.location,
    required this.isDark,
    required this.onThemeToggle,
  });

  final String location;
  final bool isDark;
  final VoidCallback onThemeToggle;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final user = app.user;
    return Drawer(
      child: SafeArea(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  CircleAvatar(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Theme.of(context).colorScheme.onPrimary,
                    child: const Icon(Icons.menu_book),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Manga Cafe',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user == null ? 'MangaDex powered reader' : user.email,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            _DrawerDestination(
              icon: Icons.home_outlined,
              selectedIcon: Icons.home,
              label: 'Home',
              selected: location == '/',
              onTap: () => _go(context, '/'),
            ),
            _DrawerDestination(
              icon: Icons.explore_outlined,
              selectedIcon: Icons.explore,
              label: 'Search',
              selected: location == '/search',
              onTap: () => _go(context, '/search'),
            ),
            _DrawerDestination(
              icon: Icons.local_fire_department_outlined,
              selectedIcon: Icons.local_fire_department,
              label: 'Popular',
              selected: location == '/discover/popular',
              onTap: () => _go(context, '/discover/popular'),
            ),
            _DrawerDestination(
              icon: Icons.update_outlined,
              selectedIcon: Icons.update,
              label: 'Latest',
              selected: location == '/discover/latest',
              onTap: () => _go(context, '/discover/latest'),
            ),
            const Divider(),
            _DrawerDestination(
              icon: Icons.library_books_outlined,
              selectedIcon: Icons.library_books,
              label: 'Library',
              selected: location == '/library',
              onTap: () => _go(context, '/library'),
            ),
            _DrawerDestination(
              icon: Icons.person_outline,
              selectedIcon: Icons.person,
              label: 'Settings',
              selected: location == '/settings',
              onTap: () => _go(context, '/settings'),
            ),
            ListTile(
              minLeadingWidth: 24,
              leading: Icon(isDark ? Icons.light_mode : Icons.dark_mode),
              title: Text(isDark ? 'Light mode' : 'Dark mode'),
              onTap: () {
                Navigator.pop(context);
                onThemeToggle();
              },
            ),
            const Divider(),
            if (user == null) ...[
              ListTile(
                minLeadingWidth: 24,
                leading: const Icon(Icons.login),
                title: const Text('Login'),
                onTap: () => _go(context, '/login'),
              ),
              ListTile(
                minLeadingWidth: 24,
                leading: const Icon(Icons.person_add_alt),
                title: const Text('Register'),
                onTap: () => _go(context, '/register'),
              ),
            ] else ...[
              ListTile(
                minLeadingWidth: 24,
                leading: const Icon(Icons.logout),
                title: const Text('Logout'),
                onTap: () async {
                  Navigator.pop(context);
                  await app.logout();
                  if (context.mounted) context.go('/login');
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _go(BuildContext context, String path) {
    Navigator.pop(context);
    context.go(path);
  }
}

class _DrawerDestination extends StatelessWidget {
  const _DrawerDestination({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      minLeadingWidth: 24,
      leading: Icon(selected ? selectedIcon : icon),
      title: Text(label),
      selected: selected,
      onTap: onTap,
    );
  }
}

_RouteContext _routeContext(String location) {
  final manga = RegExp(r'^/manga/([^/]+)').firstMatch(location);
  if (manga != null) return _RouteContext(mangaId: manga.group(1));
  final chapter = RegExp(r'^/read/([^/]+)').firstMatch(location);
  if (chapter != null) return _RouteContext(chapterId: chapter.group(1));
  return const _RouteContext();
}

class _RouteContext {
  const _RouteContext({this.mangaId, this.chapterId});

  final String? mangaId;
  final String? chapterId;
}
