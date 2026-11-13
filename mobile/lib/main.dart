// Coach HQ trainee app. It signs in to the coach's workspace through the local
// sync API (web/server/syncApi.ts): the program comes from the coach's
// dashboard, and everything logged here shows up there.

import 'package:flutter/services.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:material_ui/material_ui.dart';

import 'app/settings.dart';
import 'app/theme.dart';
import 'data/store.dart';
import 'screens/shell.dart';
import 'screens/sign_in.dart';
import 'widgets/barbell.dart';
import 'widgets/logo.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  final settings = await AppSettings.load();
  final store = TraineeStore(settings);
  runApp(CoachHqApp(settings: settings, store: store));
  await store.init();
}

class CoachHqApp extends StatelessWidget {
  const CoachHqApp({super.key, required this.settings, required this.store});
  final AppSettings settings;
  final TraineeStore store;

  @override
  Widget build(BuildContext context) {
    return Scope(
      store: store,
      settings: settings,
      child: ListenableBuilder(
        listenable: settings,
        builder: (context, _) {
          final arabic = settings.isArabic;
          return MaterialApp(
            title: 'Coach HQ',
            debugShowCheckedModeBanner: false,
            theme: buildTheme(Tokens.light, arabic: arabic),
            darkTheme: buildTheme(Tokens.darkTokens, arabic: arabic),
            themeMode: settings.themeMode,
            locale: settings.lang.locale,
            supportedLocales: const [Locale('en'), Locale('ar')],
            localizationsDelegates: GlobalMaterialLocalizations.delegates,
            builder: (context, child) {
              final dark = Theme.of(context).brightness == Brightness.dark;
              return AnnotatedRegion<SystemUiOverlayStyle>(value: dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark, child: child!);
            },
            home: const _Root(),
          );
        },
      ),
    );
  }
}

/// Signed out → sign-in; signed in → the app. Cross-fades between them. The
/// loading screen stays up for a moment so its animation can finish.
class _Root extends StatefulWidget {
  const _Root();
  @override
  State<_Root> createState() => _RootState();
}

class _RootState extends State<_Root> {
  bool _intro = true;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1900), () {
      if (mounted) setState(() => _intro = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final store = context.store;
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final loading = _intro || store.phase == Phase.booting || store.phase == Phase.loading;
        final Widget page = loading
            ? const LoadingScreen()
            : switch (store.phase) {
                Phase.signedOut => const SignInScreen(),
                _ => const AppShell(),
              };
        return AnimatedSwitcher(
          duration: const Duration(milliseconds: 450),
          switchInCurve: Curves.easeOut,
          child: KeyedSubtree(key: ValueKey(loading ? 'loading' : store.phase.name), child: page),
        );
      },
    );
  }
}

/// The opening screen: the logo settles in, the bar loads its plates, then the app fades in.
class LoadingScreen extends StatelessWidget {
  const LoadingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        body: DecoratedBox(
          decoration: const BoxDecoration(gradient: Tokens.brandGradient),
          child: SafeArea(
            child: Center(
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: const Duration(milliseconds: 1500),
                builder: (context, t, _) {
                  final logo = Curves.elasticOut.transform((t / 0.45).clamp(0.0, 1.0));
                  final word = Curves.easeOut.transform(((t - 0.25) / 0.3).clamp(0.0, 1.0));
                  final plates = ((t - 0.35) / 0.5 * 5).clamp(0.0, 5.0).floor();
                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Transform.scale(scale: 0.4 + 0.6 * logo, child: const LogoMark(size: 92)),
                      const SizedBox(height: 22),
                      Opacity(
                        opacity: word,
                        child: Transform.translate(
                          offset: Offset(0, 12 * (1 - word)),
                          child: const Text(
                            'Coach HQ',
                            textDirection: TextDirection.ltr,
                            style: TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w800, letterSpacing: -0.8),
                          ),
                        ),
                      ),
                      const SizedBox(height: 36),
                      SizedBox(
                        width: 240,
                        child: Barbell(plates: platesFor(5), loaded: plates, height: 70, onDark: true),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}
