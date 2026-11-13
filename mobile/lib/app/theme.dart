// Design tokens, matching the public website (web/src/site/theme.css): the
// same blues, greys, radii and brand gradient, with the site's dark values.
// Read them in widgets with `context.c`.

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:material_ui/material_ui.dart';

@immutable
class Tokens extends ThemeExtension<Tokens> {
  const Tokens({
    required this.bg,
    required this.surface,
    required this.surface2,
    required this.tint,
    required this.text,
    required this.text2,
    required this.muted,
    required this.faint,
    required this.line,
    required this.hairline,
    required this.primary,
    required this.primarySoft,
    required this.link,
    required this.success,
    required this.successSoft,
    required this.warn,
    required this.warnSoft,
    required this.error,
    required this.errorSoft,
    required this.anatBody,
    required this.anatMuscle,
    required this.dark,
  });

  final Color bg, surface, surface2, tint;
  final Color text, text2, muted, faint;
  final Color line, hairline;
  final Color primary, primarySoft, link;
  final Color success, successSoft, warn, warnSoft, error, errorSoft;
  final Color anatBody, anatMuscle;
  final bool dark;

  // Shared by both modes.
  static const fill = Color(0xFF0071E3); // button fill; white text passes contrast
  static const brand = Color(0xFF0B3D91);
  static const accent = Color(0xFF3BA7F2);
  static const glow = Color(0xFF7FE7D6);

  static const brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0B3D91), Color(0xFF0058D6), Color(0xFF1E8BE9), Color(0xFF3BA7F2)],
    stops: [0, 0.48, 0.82, 1],
  );

  static const rSmall = 12.0;
  static const r = 20.0;
  static const rLarge = 28.0;

  static const light = Tokens(
    bg: Color(0xFFF5F5F7),
    surface: Color(0xFFFFFFFF),
    surface2: Color(0xFFF5F5F7),
    tint: Color(0xFFE8F6FF),
    text: Color(0xFF1D1D1F),
    text2: Color(0xFF424245),
    muted: Color(0xFF6E6E73),
    faint: Color(0xFF86868B),
    line: Color(0xFFD2D2D7),
    hairline: Color(0x14000000),
    primary: Color(0xFF007AFF),
    primarySoft: Color(0x1A007AFF),
    link: Color(0xFF0066CC),
    success: Color(0xFF0F7B6C),
    successSoft: Color(0xFFE6F8F4),
    warn: Color(0xFFB25000),
    warnSoft: Color(0xFFFFF4E5),
    error: Color(0xFFD70015),
    errorSoft: Color(0xFFFFF1F0),
    anatBody: Color(0xFFE3E6EC),
    anatMuscle: Color(0xFFCDD3DD),
    dark: false,
  );

  static const darkTokens = Tokens(
    bg: Color(0xFF000000),
    surface: Color(0xFF161617),
    surface2: Color(0xFF232325),
    tint: Color(0xFF0B1E33),
    text: Color(0xFFF5F5F7),
    text2: Color(0xFFD2D2D7),
    muted: Color(0xFFAAAAAA),
    faint: Color(0xFF86868B),
    line: Color(0xFF3A3A3C),
    hairline: Color(0x1AFFFFFF),
    primary: Color(0xFF0A84FF),
    primarySoft: Color(0x290A84FF),
    link: Color(0xFF2997FF),
    success: Color(0xFF7FE7D6),
    successSoft: Color(0x1F7FE7D6),
    warn: Color(0xFFFFB35C),
    warnSoft: Color(0x24FFB35C),
    error: Color(0xFFFF6961),
    errorSoft: Color(0x1FFF6961),
    anatBody: Color(0xFF2A2C31),
    anatMuscle: Color(0xFF3A3D44),
    dark: true,
  );

  @override
  Tokens copyWith() => this;

  @override
  Tokens lerp(Tokens? other, double t) => t < 0.5 ? this : (other ?? this);
}

extension TokensX on BuildContext {
  Tokens get c => Theme.of(this).extension<Tokens>()!;
  TextTheme get text => Theme.of(this).textTheme;
}

ThemeData buildTheme(Tokens k, {required bool arabic}) {
  final base = ThemeData(
    useMaterial3: true,
    brightness: k.dark ? Brightness.dark : Brightness.light,
    colorScheme: ColorScheme.fromSeed(
      seedColor: k.primary,
      brightness: k.dark ? Brightness.dark : Brightness.light,
    ).copyWith(primary: k.primary, surface: k.surface, onSurface: k.text, error: k.error),
    scaffoldBackgroundColor: k.bg,
    splashFactory: InkSparkle.splashFactory,
  );
  // Apple-style type scale: tight headlines, comfortable body text.
  final t = base.textTheme.apply(bodyColor: k.text, displayColor: k.text);
  final h = arabic ? 1.35 : 1.15;
  return base.copyWith(
    extensions: [k],
    textTheme: t.copyWith(
      displaySmall: t.displaySmall?.copyWith(fontSize: 34, fontWeight: FontWeight.w700, letterSpacing: arabic ? 0 : -0.8, height: h),
      headlineMedium: t.headlineMedium?.copyWith(fontSize: 28, fontWeight: FontWeight.w700, letterSpacing: arabic ? 0 : -0.6, height: h),
      headlineSmall: t.headlineSmall?.copyWith(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: arabic ? 0 : -0.4, height: h),
      titleLarge: t.titleLarge?.copyWith(fontSize: 20, fontWeight: FontWeight.w600, letterSpacing: arabic ? 0 : -0.3),
      titleMedium: t.titleMedium?.copyWith(fontSize: 17, fontWeight: FontWeight.w600, letterSpacing: arabic ? 0 : -0.2),
      titleSmall: t.titleSmall?.copyWith(fontSize: 15, fontWeight: FontWeight.w600),
      bodyLarge: t.bodyLarge?.copyWith(fontSize: 17, height: 1.4),
      bodyMedium: t.bodyMedium?.copyWith(fontSize: 15, height: 1.4),
      bodySmall: t.bodySmall?.copyWith(fontSize: 13, height: 1.35, color: k.muted),
      labelLarge: t.labelLarge?.copyWith(fontSize: 15, fontWeight: FontWeight.w600),
      labelMedium: t.labelMedium?.copyWith(fontSize: 13, fontWeight: FontWeight.w600),
      labelSmall: t.labelSmall?.copyWith(fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: arabic ? 0 : 0.4),
    ),
    dividerTheme: DividerThemeData(color: k.hairline, thickness: 1, space: 1),
    appBarTheme: AppBarTheme(
      backgroundColor: k.bg,
      surfaceTintColor: Colors.transparent,
      foregroundColor: k.text,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: true,
      titleTextStyle: t.titleMedium?.copyWith(fontSize: 17, fontWeight: FontWeight.w600, color: k.text),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: k.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Tokens.rSmall),
        borderSide: BorderSide(color: k.line.withValues(alpha: 0.7)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Tokens.rSmall),
        borderSide: BorderSide(color: k.line.withValues(alpha: 0.7)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Tokens.rSmall),
        borderSide: BorderSide(color: k.primary, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Tokens.rSmall),
        borderSide: BorderSide(color: k.error, width: 1.5),
      ),
      hintStyle: TextStyle(color: k.faint),
      labelStyle: TextStyle(color: k.muted),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: k.bg,
      surfaceTintColor: Colors.transparent,
      showDragHandle: true,
      dragHandleColor: k.line,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(Tokens.rLarge))),
    ),
    dialogTheme: DialogThemeData(backgroundColor: k.surface, surfaceTintColor: Colors.transparent),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: k.dark ? k.surface2 : k.text,
      contentTextStyle: TextStyle(color: k.dark ? k.text : k.surface, fontSize: 15),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Tokens.rSmall)),
    ),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {TargetPlatform.iOS: CupertinoPageTransitionsBuilder(), TargetPlatform.android: CupertinoPageTransitionsBuilder()},
    ),
    cupertinoOverrideTheme: CupertinoThemeData(primaryColor: k.primary),
  );
}
