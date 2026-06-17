import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:manga_mobile/main.dart';

import 'helpers/test_app.dart';

void main() {
  testWidgets('app shell toggles between system dark and light mode', (
    tester,
  ) async {
    final app = buildApp();
    await tester.pumpWidget(MyApp(appState: app));
    await tester.pumpAndSettle();

    final initialIsDark =
        tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode ==
        ThemeMode.system;
    expect(initialIsDark, isTrue);

    final lightToggle = find.byTooltip('Switch to light mode');
    final darkToggle = find.byTooltip('Switch to dark mode');
    final isCurrentlyDark = lightToggle.evaluate().isNotEmpty;
    final toggle = isCurrentlyDark ? lightToggle : darkToggle;
    await tester.tap(toggle);
    await tester.pumpAndSettle();

    expect(
      tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode,
      isCurrentlyDark ? ThemeMode.light : ThemeMode.dark,
    );
  });

  testWidgets('app drawer opens and navigates to discovery routes', (
    tester,
  ) async {
    final app = buildApp();
    await tester.pumpWidget(MyApp(appState: app));
    await tester.pumpAndSettle();

    await tester.tap(find.byType(DrawerButton));
    await tester.pumpAndSettle();

    expect(find.text('MangaDex powered reader'), findsOneWidget);
    expect(find.text('Popular'), findsWidgets);

    await tester.tap(find.text('Popular').last);
    await tester.pumpAndSettle();

    expect(find.text('Popular manga'), findsOneWidget);
  });
}
