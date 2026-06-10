import 'package:flutter/material.dart';

class MangaTheme {
  static const ink = Color(0xFF17110D);
  static const panel = Color(0xFF211813);
  static const panelStrong = Color(0xFF302219);
  static const paper = Color(0xFFF7E8CF);
  static const muted = Color(0xFFCDB89F);
  static const amber = Color(0xFFFFB86B);
  static const sakura = Color(0xFFFF7AA8);
  static const cocoa = Color(0xFF2F2117);
  static const cream = Color(0xFFF8EDDD);
  static const creamPanel = Color(0xFFFFF8ED);
  static const creamStrong = Color(0xFFF0DBC0);
  static const coffeeMuted = Color(0xFF795F49);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFFB9631D),
      brightness: Brightness.light,
      surface: creamPanel,
      primary: const Color(0xFFB9631D),
      secondary: const Color(0xFFC94F78),
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: cream,
      appBarTheme: const AppBarTheme(
        backgroundColor: cream,
        foregroundColor: cocoa,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: creamPanel,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: Color(0xFFD6BEA3)),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: creamStrong,
        selectedColor: const Color(0xFFB9631D).withValues(alpha: 0.16),
        labelStyle: const TextStyle(color: cocoa),
        side: const BorderSide(color: Color(0xFFD6BEA3)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFFFFAF1),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFFD6BEA3)),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: creamPanel,
        selectedItemColor: Color(0xFFB9631D),
        unselectedItemColor: coffeeMuted,
        type: BottomNavigationBarType.fixed,
      ),
    );
  }

  static ThemeData dark() {
    final scheme = ColorScheme.fromSeed(
      seedColor: amber,
      brightness: Brightness.dark,
      surface: panel,
      primary: amber,
      secondary: sakura,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: ink,
      appBarTheme: const AppBarTheme(
        backgroundColor: ink,
        foregroundColor: paper,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: panel,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: Color(0xFF463326)),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: panelStrong,
        selectedColor: amber.withValues(alpha: 0.22),
        labelStyle: const TextStyle(color: paper),
        side: const BorderSide(color: Color(0xFF463326)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: panelStrong,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFF463326)),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: panel,
        selectedItemColor: amber,
        unselectedItemColor: muted,
        type: BottomNavigationBarType.fixed,
      ),
    );
  }
}
