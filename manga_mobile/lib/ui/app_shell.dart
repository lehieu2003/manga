import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:manga_mobile/ui/features/chat/chat_assistant_button.dart';

import 'app_drawer.dart';
import 'app_state.dart';
import 'features/notifications/notification_center.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final app = AppScope.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final width = MediaQuery.sizeOf(context).width;
    final showSearchAction = width >= 360;
    final hideShellChrome =
        location == '/messages' && app.hideShellChrome && width < 760;
    final routeContext = _routeContext(location);
    final showChatAssistant = app.isSignedIn && location != '/messages';
    final index = _navigationIndex(location);

    return Scaffold(
      appBar: hideShellChrome
          ? null
          : AppBar(
              title: const Text('Manga Cafe'),
              actions: [
                IconButton(
                  tooltip: isDark
                      ? 'Switch to light mode'
                      : 'Switch to dark mode',
                  onPressed: () => app.setThemeMode(
                    isDark ? ThemeMode.light : ThemeMode.dark,
                  ),
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
      drawer: hideShellChrome
          ? null
          : AppDrawer(
              location: location,
              isDark: isDark,
              onThemeToggle: () =>
                  app.setThemeMode(isDark ? ThemeMode.light : ThemeMode.dark),
            ),
      body: SafeArea(child: child),
      floatingActionButton: showChatAssistant
          ? ChatAssistantButton(
              mangaId: routeContext.mangaId,
              chapterId: routeContext.chapterId,
            )
          : null,
      bottomNavigationBar: hideShellChrome
          ? null
          : BottomNavigationBar(
              currentIndex: index,
              onTap: (value) => _goToNavigationIndex(context, value),
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
                  icon: Icon(Icons.chat_bubble_outline),
                  activeIcon: Icon(Icons.chat_bubble),
                  label: 'Messages',
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

int _navigationIndex(String location) {
  return switch (location) {
    '/search' => 1,
    '/library' => 2,
    '/messages' => 3,
    '/settings' => 4,
    _ => 0,
  };
}

void _goToNavigationIndex(BuildContext context, int value) {
  switch (value) {
    case 1:
      context.go('/search');
    case 2:
      context.go('/library');
    case 3:
      context.go('/messages');
    case 4:
      context.go('/settings');
    default:
      context.go('/');
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
