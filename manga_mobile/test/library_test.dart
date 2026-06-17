import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:manga_mobile/ui/features/library/library_screen.dart';
import 'package:manga_mobile/main.dart';

import 'helpers/test_app.dart';

void main() {
  testWidgets('library fits narrow screens without horizontal overflow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 720);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final app = buildApp(signedIn: true);
    await tester.pumpWidget(
      screenHost(app, const Scaffold(body: LibraryScreen())),
    );
    await tester.pumpAndSettle();

    final exception = tester.takeException();
    expect(
      exception,
      isNull,
      reason: exception is FlutterError ? exception.toStringDeep() : null,
    );
    expect(find.text('Library'), findsOneWidget);
  });

  testWidgets('library shows summaries, clears filters, and updates actions', (
    tester,
  ) async {
    final app = buildApp(signedIn: true);
    await tester.pumpWidget(MyApp(appState: app));
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.library_books_outlined));
    await tester.pumpAndSettle();

    expect(find.text('Reading'), findsWidgets);
    expect(find.text('2 shown'), findsWidgets);

    await tester.enterText(find.byType(TextField).first, 'beta');
    await tester.pumpAndSettle();
    expect(find.text('Search: beta'), findsOneWidget);
    expect(find.text('1 shown'), findsWidgets);

    await tester.tap(find.text('Clear filters'));
    await tester.pumpAndSettle();
    expect(find.text('Search: beta'), findsNothing);

    await tester.drag(find.byType(ListView), const Offset(0, -220));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Favorite').first, warnIfMissed: false);
    await tester.pumpAndSettle();
  });
}
