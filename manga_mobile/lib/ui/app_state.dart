import 'package:flutter/material.dart';

import '../data/repositories/repositories.dart';
import '../data/services/reader_settings_store.dart';
import '../data/services/theme_store.dart';
import '../domain/models/models.dart';

class AppState extends ChangeNotifier {
  AppState({
    required this.authRepository,
    required this.catalogRepository,
    required this.libraryRepository,
    required this.commentRepository,
    required this.notificationRepository,
    required this.chatRepository,
    ReaderSettingsStore? readerSettingsStore,
    ThemeStore? themeStore,
  }) : readerSettingsStore = readerSettingsStore ?? ReaderSettingsStore(),
       themeStore = themeStore ?? ThemeStore();

  final AuthRepository authRepository;
  final CatalogRepository catalogRepository;
  final LibraryRepository libraryRepository;
  final CommentRepository commentRepository;
  final NotificationRepository notificationRepository;
  final ChatRepository chatRepository;
  final ReaderSettingsStore readerSettingsStore;
  final ThemeStore themeStore;

  User? user;
  ThemeMode themeMode = ThemeMode.system;
  bool isBooting = true;

  bool get isSignedIn => user != null;

  Future<void> restore() async {
    isBooting = true;
    notifyListeners();
    final results = await Future.wait<Object?>([
      authRepository.restoreSession(),
      themeStore.readThemeMode(),
    ]);
    user = results[0] as User?;
    themeMode = results[1] as ThemeMode;
    isBooting = false;
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    themeMode = mode;
    notifyListeners();
    await themeStore.saveThemeMode(mode);
  }

  Future<void> login(String email, String password) async {
    user = await authRepository.login(email: email, password: password);

    notifyListeners();
  }

  Future<void> register(
    String email,
    String password,
    String displayName,
  ) async {
    await authRepository.register(
      email: email,
      password: password,
      displayName: displayName,
    );
  }

  Future<void> updateProfile({String? displayName, String? avatarUrl}) async {
    user = await authRepository.updateProfile(
      displayName: displayName,
      avatarUrl: avatarUrl,
    );
    notifyListeners();
  }

  Future<void> uploadAvatar(String filePath) async {
    user = await authRepository.uploadAvatar(filePath);
    notifyListeners();
  }

  Future<void> changePassword(
    String currentPassword,
    String newPassword,
  ) async {
    user = await authRepository.changePassword(
      currentPassword: currentPassword,
      newPassword: newPassword,
    );
    notifyListeners();
  }

  Future<void> logout() async {
    await authRepository.logout();
    user = null;
    notifyListeners();
  }
}

class AppScope extends InheritedNotifier<AppState> {
  const AppScope({super.key, required AppState appState, required super.child})
    : super(notifier: appState);

  static AppState of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    if (scope == null || scope.notifier == null) {
      throw StateError('AppScope is missing');
    }
    return scope.notifier!;
  }

  static AppState read(BuildContext context) {
    final element = context.getElementForInheritedWidgetOfExactType<AppScope>();
    final scope = element?.widget as AppScope?;

    if (scope == null || scope.notifier == null) {
      throw StateError('AppScope is missing');
    }

    return scope.notifier!;
  }
}
