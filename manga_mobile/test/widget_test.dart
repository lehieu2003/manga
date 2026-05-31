import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:manga_mobile/data/repositories/repositories.dart';
import 'package:manga_mobile/data/services/api_client.dart';
import 'package:manga_mobile/main.dart';
import 'package:manga_mobile/ui/app_state.dart';

void main() {
  testWidgets('renders manga app shell', (tester) async {
    final apiClient = ApiClient(baseUrl: 'http://localhost:4000/api');
    final appState = AppState(
      authRepository: AuthRepository(apiClient),
      catalogRepository: CatalogRepository(apiClient),
      libraryRepository: LibraryRepository(apiClient),
    )..isBooting = false;

    await tester.pumpWidget(MyApp(appState: appState));
    await tester.pump();

    expect(find.text('Manga Cafe'), findsOneWidget);
    expect(find.byIcon(Icons.home), findsOneWidget);
  });
}
