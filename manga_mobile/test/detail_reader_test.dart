import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:manga_mobile/ui/app_state.dart';
import 'package:manga_mobile/ui/core/theme.dart';
import 'package:manga_mobile/ui/features/detail/manga_detail_screen.dart';
import 'package:manga_mobile/ui/features/reader/reader_screen.dart';

import 'helpers/test_app.dart';

void main() {
  testWidgets('detail page shows continue card and chapter filter metadata', (
    tester,
  ) async {
    final app = buildApp(signedIn: true);
    await tester.pumpWidget(
      screenHost(app, const MangaDetailScreen(mangaId: 'manga-1')),
    );
    await tester.pumpAndSettle();

    expect(find.text('Continue Reading'), findsOneWidget);
    expect(find.text('Chapters (2)'), findsOneWidget);
    expect(find.text('2 languages'), findsOneWidget);
    expect(find.text('Current'), findsWidgets);
    expect(find.text('Read'), findsWidgets);
    await tester.scrollUntilVisible(
      find.text('NEW'),
      120,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('NEW'), findsOneWidget);
    expect(find.text('Group A'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Reader discussion'),
      120,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Login to join the discussion.'), findsNothing);
    expect(find.widgetWithText(TextField, 'Share a thought'), findsOneWidget);
  });

  testWidgets(
    'reader exposes mode controls and missing manga context message',
    (tester) async {
      final app = buildApp(signedIn: true);
      final settingsStore = app.readerSettingsStore as FakeReaderSettingsStore;
      await tester.pumpWidget(
        AppScope(
          appState: app,
          child: MaterialApp(
            theme: MangaTheme.dark(),
            home: const ReaderScreen(chapterId: 'chapter-1'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.text('Chapter navigation needs manga context.'),
        findsOneWidget,
      );
      expect(find.byTooltip('Use original quality'), findsOneWidget);
      await tester.tap(find.byTooltip('Use original quality'));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Use data saver'), findsOneWidget);
      expect(settingsStore.saved.dataSaver, isFalse);

      await tester.tap(find.byTooltip('Paged mode'));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Vertical mode'), findsOneWidget);
      expect(settingsStore.saved.paged, isTrue);

      expect(find.byTooltip('Chapter comments'), findsOneWidget);
      await tester.tap(find.byTooltip('Chapter comments'));
      await tester.pumpAndSettle();
      expect(find.text('Chapter comments'), findsOneWidget);
      expect(find.text('Reader discussion'), findsOneWidget);
    },
  );
}
