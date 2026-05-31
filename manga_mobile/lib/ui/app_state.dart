import 'package:flutter/widgets.dart';

import '../data/repositories/repositories.dart';
import '../domain/models/models.dart';

class AppState extends ChangeNotifier {
  AppState({
    required this.authRepository,
    required this.catalogRepository,
    required this.libraryRepository,
  });

  final AuthRepository authRepository;
  final CatalogRepository catalogRepository;
  final LibraryRepository libraryRepository;

  User? user;
  bool isBooting = true;

  bool get isSignedIn => user != null;

  Future<void> restore() async {
    isBooting = true;
    notifyListeners();
    user = await authRepository.restoreSession();
    isBooting = false;
    notifyListeners();
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
    user = await authRepository.register(
      email: email,
      password: password,
      displayName: displayName,
    );
    notifyListeners();
  }

  Future<void> updateProfile({String? displayName, String? avatarUrl}) async {
    user = await authRepository.updateProfile(
      displayName: displayName,
      avatarUrl: avatarUrl,
    );
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
}
