import 'package:flutter/material.dart';

class MangaTheme {
  static const ink = Color(0xFF17110D);
  static const panel = Color(0xFF211813);
  static const panelStrong = Color(0xFF302219);
  static const paper = Color(0xFFF7E8CF);
  static const muted = Color(0xFFCDB89F);
  static const amber = Color(0xFFFFB86B);
  static const sakura = Color(0xFFFF7AA8);

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
