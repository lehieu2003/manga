import 'package:flutter/widgets.dart';
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

  testWidgets('messages screen manages friendships and sends a DM', (
    tester,
  ) async {
    final app = buildApp(signedIn: true);
    await tester.pumpWidget(MyApp(appState: app));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Messages'));
    await tester.pumpAndSettle();

    expect(find.text('Chats'), findsOneWidget);
    expect(find.text('Mina'), findsWidgets);
    expect(find.text('Friend requests'), findsOneWidget);
    expect(find.byTooltip('Open manga assistant'), findsNothing);

    await tester.tap(find.byTooltip('Add friend'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(EditableText).last, 'Kir');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Kira'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Send friend request'));
    await tester.pumpAndSettle();

    final social = app.socialRepository as FakeSocialRepository;
    expect(social.sentRequests, ['user-4']);

    await tester.tap(find.text('Friend requests'));
    await tester.pumpAndSettle();
    expect(find.text('Nori'), findsOneWidget);
    await tester.tap(find.byTooltip('Accept request'));
    await tester.pumpAndSettle();
    expect(social.acceptedRequests, ['friendship-2']);

    await tester.tap(find.text('Mina').first);
    await tester.pumpAndSettle();
    expect(find.byTooltip('Back to chats'), findsOneWidget);

    final socket = app.socialSocketService as FakeSocialSocketService;
    socket.emitTyping(
      conversationId: 'conversation-1',
      user: social.users.first,
      typing: true,
    );
    await tester.pump();
    expect(find.text('Mina is typing...'), findsWidgets);
    socket.emitTyping(
      conversationId: 'conversation-1',
      user: social.users[1],
      typing: true,
    );
    await tester.pump();
    expect(find.text('Mina and Nori are typing...'), findsWidgets);
    socket.emitTyping(
      conversationId: 'conversation-1',
      user: social.users.first,
      typing: false,
    );
    await tester.pump();
    expect(find.text('Nori is typing...'), findsWidgets);
    expect(
      find.byKey(const ValueKey('message-thread-typing-indicator')),
      findsOneWidget,
    );

    expect(
      tester.getTopLeft(find.text('See you at chapter 12')).dy,
      lessThan(tester.getTopLeft(find.text('I am caught up')).dy),
    );

    await tester.enterText(find.bySemanticsLabel('Message'), 'Mobile hello');
    expect(socket.typingStarts, ['conversation-1']);
    await tester.tap(find.byTooltip('Send message'));
    await tester.pumpAndSettle();

    expect(find.text('Mobile hello'), findsOneWidget);
    expect(socket.typingStops, contains('conversation-1'));
    expect(
      tester.getTopLeft(find.text('I am caught up')).dy,
      lessThan(tester.getTopLeft(find.text('Mobile hello')).dy),
    );

    await tester.tap(find.byTooltip('Share manga'));
    await tester.pumpAndSettle();
    expect(find.text('Share manga'), findsOneWidget);
    await tester.tap(find.byTooltip('Share Alpha Manga'));
    await tester.pumpAndSettle();
    expect(find.text('Manga share'), findsOneWidget);
    expect(find.text('Alpha Manga'), findsWidgets);

    socket.emitMessageNew(social.pushPeerMessage('Realtime ping'));
    await tester.pump();
    await tester.pumpAndSettle();
    expect(find.text('Realtime ping'), findsOneWidget);

    await tester.tap(find.byTooltip('Back to chats'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Create group'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(EditableText).last, 'Manga Club');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Mina').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Nori').last);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Create group'));
    await tester.pumpAndSettle();

    expect(social.createdGroups.single.$1, 'Manga Club');
    expect(social.createdGroups.single.$2, ['user-2', 'user-3']);
    expect(find.text('Manga Club'), findsWidgets);
  });
}
