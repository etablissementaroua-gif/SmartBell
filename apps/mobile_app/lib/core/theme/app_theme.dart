import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color slateNavy = Color(0xFF0F172A);
  static const Color slateCard = Color(0xFF1E293B);
  static const Color tealPrimary = Color(0xFF0D9488);
  static const Color tealAccent = Color(0xFF14B8A6);
  static const Color emergencyRed = Color(0xFFDC2626);
  static const Color mutedSilver = Color(0xFF94A3B8);
  static const Color surfaceLight = Color(0xFFF8FAFC);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: slateNavy,
      primaryColor: tealPrimary,
      cardColor: slateCard,
      textTheme: GoogleFonts.cairoTextTheme(ThemeData.dark().textTheme),
      colorScheme: const ColorScheme.dark(
        primary: tealPrimary,
        secondary: tealAccent,
        surface: slateCard,
        error: emergencyRed,
        onPrimary: Colors.white,
        onSecondary: Colors.black,
        onSurface: Colors.white,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: slateNavy,
        elevation: 0,
        titleTextStyle: GoogleFonts.cairo(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
    );
  }
}
