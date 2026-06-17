import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:manga_mobile/main.dart';

import 'helpers/test_app.dart';

void main() {
  testWidgets('search supports discovery and genre routes with clear filters', (
    tester,
  ) async {
    final app = buildApp();
    await tester.pumpWidget(MyApp(appState: app));
    await tester.pumpAndSettle();

    await tester.tap(find.text('View all'));
    await tester.pumpAndSettle();

    expect(find.text('Popular manga'), findsOneWidget);
    expect(find.text('Popular'), findsWidgets);

    await tester.tap(find.text('Home'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Action 3'),
      120,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Action 3'));
    await tester.pumpAndSettle();

    expect(find.text('Genre: Action'), findsOneWidget);
    await tester.enterText(find.widgetWithText(TextField, 'Author'), 'ONE');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Author: ONE'),
      120,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Author: ONE'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Include: Action'),
      120,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Include: Action'), findsOneWidget);

    final clearFilters = find.widgetWithText(ActionChip, 'Clear filters');
    await tester.ensureVisible(clearFilters);
    await tester.pumpAndSettle();
    await tester.tap(clearFilters);
    await tester.pumpAndSettle();

    expect(find.text('Include: Action'), findsNothing);
    expect(find.text('Author: ONE'), findsNothing);
  });
}
