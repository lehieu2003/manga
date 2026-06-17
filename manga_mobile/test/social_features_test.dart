import 'package:flutter_test/flutter_test.dart';
import 'package:manga_mobile/main.dart';

import 'helpers/test_app.dart';

void main() {
  testWidgets('notification center shows unread count and opens target', (
    tester,
  ) async {
    final app = buildApp(signedIn: true);
    await tester.pumpWidget(MyApp(appState: app));
    await tester.pumpAndSettle();

    expect(find.text('1'), findsOneWidget);
    await tester.tap(find.byTooltip('Notifications'));
    await tester.pumpAndSettle();

    expect(find.text('Reader replied to your comment'), findsOneWidget);
    await tester.tap(find.text('Reader replied to your comment'));
    await tester.pumpAndSettle();
    expect((app.notificationRepository as FakeNotificationRepository).readIds, [
      'notification-1',
    ]);
  });

  testWidgets('chat assistant sends starter prompt and opens source', (
    tester,
  ) async {
    final app = buildApp(signedIn: true);
    await tester.pumpWidget(MyApp(appState: app));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Open manga assistant'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Recommend something completed.'));
    await tester.pumpAndSettle();

    expect(find.text('Alpha Manga'), findsWidgets);
    await tester.tap(find.text('Alpha Manga').last);
    await tester.pumpAndSettle();
    expect(find.text('Manga detail'), findsOneWidget);
  });
}
