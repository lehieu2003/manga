import 'package:flutter/material.dart';
import 'package:manga_mobile/data/services/api_client.dart';
import 'package:manga_mobile/ui/app_state.dart';
import 'package:manga_mobile/ui/core/theme.dart';

import '../fakes/fake_auth_repository.dart';
import '../fakes/fake_catalog_repository.dart';
import '../fakes/fake_chat_repository.dart';
import '../fakes/fake_comment_repository.dart';
import '../fakes/fake_library_repository.dart';
import '../fakes/fake_notification_repository.dart';
import '../fakes/fake_push_notification_service.dart';
import '../fakes/fake_reader_settings_store.dart';
import '../fakes/fake_social_repository.dart';
import '../fakes/fake_social_socket_service.dart';
import '../fakes/fake_theme_store.dart';
import 'test_fixtures.dart';

export 'test_fixtures.dart';

TestAppState buildApp({bool signedIn = false}) {
  final api = ApiClient(baseUrl: 'http://localhost:4000/api');
  final user = testUser();
  final app = TestAppState(
    authRepository: FakeAuthRepository(api, user),
    catalogRepository: FakeCatalogRepository(api),
    libraryRepository: FakeLibraryRepository(api),
    commentRepository: FakeCommentRepository(api),
    notificationRepository: FakeNotificationRepository(api),
    socialRepository: FakeSocialRepository(api),
    socialSocketService: FakeSocialSocketService(api),
    pushNotificationService: FakePushNotificationService(api),
    chatRepository: FakeChatRepository(api),
    readerSettingsStore: FakeReaderSettingsStore(),
    themeStore: FakeThemeStore(),
  )..isBooting = false;
  if (signedIn) app.user = user;
  return app;
}

Widget screenHost(AppState app, Widget child) {
  return AppScope(
    appState: app,
    child: MaterialApp(theme: MangaTheme.dark(), home: child),
  );
}

class TestAppState extends AppState {
  TestAppState({
    required super.authRepository,
    required super.catalogRepository,
    required super.libraryRepository,
    required super.commentRepository,
    required super.notificationRepository,
    required super.socialRepository,
    required super.socialSocketService,
    required super.pushNotificationService,
    required super.chatRepository,
    super.readerSettingsStore,
    super.themeStore,
  });
}
