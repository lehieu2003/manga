import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'data/repositories/repositories.dart';
import 'data/services/api_client.dart';
import 'ui/app_router.dart';
import 'ui/app_state.dart';
import 'ui/core/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env', isOptional: true);

  final apiClient = ApiClient();
  final appState = AppState(
    authRepository: AuthRepository(apiClient),
    catalogRepository: CatalogRepository(apiClient),
    libraryRepository: LibraryRepository(apiClient),
  );
  runApp(MyApp(appState: appState));
  appState.restore();
}

class MyApp extends StatefulWidget {
  const MyApp({super.key, required this.appState});

  final AppState appState;

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late final _router = buildRouter(widget.appState);

  @override
  Widget build(BuildContext context) {
    return AppScope(
      appState: widget.appState,
      child: AnimatedBuilder(
        animation: widget.appState,
        builder: (context, _) => MaterialApp.router(
          title: 'Manga Cafe',
          debugShowCheckedModeBanner: false,
          theme: MangaTheme.light(),
          darkTheme: MangaTheme.dark(),
          themeMode: widget.appState.themeMode,
          routerConfig: _router,
        ),
      ),
    );
  }
}
