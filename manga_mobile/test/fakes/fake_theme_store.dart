import 'package:flutter/material.dart';
import 'package:manga_mobile/data/services/theme_store.dart';

class FakeThemeStore extends ThemeStore {
  ThemeMode saved = ThemeMode.system;

  @override
  Future<ThemeMode> readThemeMode() async => saved;

  @override
  Future<void> saveThemeMode(ThemeMode mode) async {
    saved = mode;
  }
}
