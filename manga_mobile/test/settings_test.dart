import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:manga_mobile/main.dart';

import 'helpers/test_app.dart';

void main() {
  testWidgets('settings validates password confirmation with snackbar', (
    tester,
  ) async {
    final app = buildApp(signedIn: true);
    await tester.pumpWidget(MyApp(appState: app));
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.person_outline));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextField, 'New password'),
      '12345678',
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'Confirm new password'),
      '87654321',
    );
    await tester.drag(find.byType(ListView), const Offset(0, -420));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Change password'));
    await tester.pumpAndSettle();

    expect(
      find.text('New password confirmation does not match.'),
      findsWidgets,
    );
  });
}
