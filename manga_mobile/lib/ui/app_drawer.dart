import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'app_state.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({
    super.key,
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
              icon: Icons.chat_bubble_outline,
              selectedIcon: Icons.chat_bubble,
              label: 'Messages',
              selected: location == '/messages',
              onTap: () => _go(context, '/messages'),
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
