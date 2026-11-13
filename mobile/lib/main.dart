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

/// Signed out → sign-in; signed in → the app. Cross-fades between them.
class _Root extends StatelessWidget {
  const _Root();

  @override
  Widget build(BuildContext context) {
    final store = context.store;
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final Widget page = switch (store.phase) {
          Phase.booting || Phase.loading => const _Splash(),
          Phase.signedOut => const SignInScreen(),
          Phase.ready => const AppShell(),
        };
        return AnimatedSwitcher(
          duration: const Duration(milliseconds: 350),
          child: KeyedSubtree(key: ValueKey(store.phase == Phase.ready ? 'app' : store.phase.name), child: page),
        );
      },
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) => const Scaffold(
    body: DecoratedBox(
      decoration: BoxDecoration(gradient: Tokens.brandGradient),
      child: Center(child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5)),
    ),
  );
}
