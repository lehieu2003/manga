import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'data/repositories/repositories.dart';
import 'data/services/api_client.dart';
import 'data/services/push_notification_service.dart';
import 'data/services/social_socket_service.dart';
import 'ui/app_router.dart';
import 'ui/app_state.dart';
import 'ui/core/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env', isOptional: true);

  final apiClient = ApiClient();
  final pushNotificationService = PushNotificationService(apiClient);
  await pushNotificationService.initialize();
  final appState = AppState(
    authRepository: AuthRepository(apiClient),
    catalogRepository: CatalogRepository(apiClient),
    libraryRepository: LibraryRepository(apiClient),
    commentRepository: CommentRepository(apiClient),
    notificationRepository: NotificationRepository(apiClient),
    socialRepository: SocialRepository(apiClient),
    socialSocketService: SocialSocketService(apiClient),
    pushNotificationService: pushNotificationService,
    chatRepository: ChatRepository(apiClient),
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
  StreamSubscription<String>? _pushRouteSubscription;

  @override
  void initState() {
    super.initState();
    _pushRouteSubscription = widget
        .appState
        .pushNotificationService
        .routeRequests
        .listen((route) => _router.go(route));
  }

  @override
  void dispose() {
    _pushRouteSubscription?.cancel();
    super.dispose();
  }

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
