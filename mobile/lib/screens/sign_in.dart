// Sign in: the brand gradient with a barbell that loads itself, then email
// and password. Accounts are the trainees in the coach's workspace (demo
// password for now, see web/server/syncApi.ts).

import 'dart:async';

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../app/l10n.dart';
import '../app/settings.dart';
import '../app/theme.dart';
import '../data/store.dart';
import '../widgets/barbell.dart';
import '../widgets/logo.dart';
import '../widgets/ui.dart';
import 'me.dart';

/// The first active trainee in the dashboard's demo data.
const demoEmail = 'layla.mansour@example.com';
const demoPassword = 'demo1234';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});
  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _passwordFocus = FocusNode();
  bool _busy = false, _show = false;
  String? _error;
  int _loaded = 0;
  Timer? _loop;

  @override
  void initState() {
    super.initState();
    // Load the bar one plate at a time, then start over.
    _loop = Timer.periodic(const Duration(milliseconds: 900), (_) => setState(() => _loaded = (_loaded + 1) % 6));
  }

  @override
  void dispose() {
    _loop?.cancel();
    _email.dispose();
    _password.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'signIn.error.empty');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final err = await context.store.signIn(_email.text, _password.text);
    if (!mounted) return;
    if (err != null) HapticFeedback.heavyImpact();
    setState(() {
      _busy = false;
      _error = err;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final c = context.c;
        final settings = context.settings;
        final notice = context.store.notice;
        final top = MediaQuery.paddingOf(context).top;
        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: SystemUiOverlayStyle.light,
          child: Scaffold(
            backgroundColor: c.bg,
            body: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    decoration: const BoxDecoration(
                      gradient: Tokens.brandGradient,
                      borderRadius: BorderRadius.vertical(bottom: Radius.circular(36)),
                    ),
                    padding: EdgeInsets.fromLTRB(24, top + 12, 24, 30),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const LogoMark(),
                            const SizedBox(width: 10),
                            const Text(
                              'Coach HQ',
                              textDirection: TextDirection.ltr,
                              style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: -0.3),
                            ),
                            const Spacer(),
                            TextButton(
                              onPressed: () => settings.lang = settings.isArabic ? Lang.en : Lang.ar,
                              style: TextButton.styleFrom(
                                foregroundColor: Colors.white,
                                backgroundColor: Colors.white.withValues(alpha: 0.16),
                                shape: const StadiumBorder(),
                              ),
                              child: Text(settings.isArabic ? Lang.en.nativeName : Lang.ar.nativeName),
                            ),
                          ],
                        ),
                        const SizedBox(height: 34),
                        Barbell(plates: platesFor(5), loaded: _loaded, height: 96, onDark: true),
                        const SizedBox(height: 30),
                        Text(t('signIn.title'), style: context.text.displaySmall?.copyWith(color: Colors.white)),
                        const SizedBox(height: 10),
                        Text(t('signIn.body'), style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 17, height: 1.4)),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 22, 20, 24),
                    child: AutofillGroup(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (notice != null) ...[
                            AppCard(
                              color: c.warnSoft,
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                children: [
                                  Icon(CupertinoIcons.info_circle_fill, color: c.warn, size: 18),
                                  const SizedBox(width: 10),
                                  Expanded(child: Text(t(notice), style: context.text.bodyMedium)),
                                ],
                              ),
                            ),
                            const SizedBox(height: 14),
                          ],
                          TextField(
                            controller: _email,
                            keyboardType: TextInputType.emailAddress,
                            autofillHints: const [AutofillHints.username, AutofillHints.email],
                            autocorrect: false,
                            textInputAction: TextInputAction.next,
                            textDirection: TextDirection.ltr,
                            onSubmitted: (_) => _passwordFocus.requestFocus(),
                            decoration: InputDecoration(labelText: t('signIn.email'), prefixIcon: const Icon(CupertinoIcons.mail)),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _password,
                            focusNode: _passwordFocus,
                            obscureText: !_show,
                            autofillHints: const [AutofillHints.password],
                            textInputAction: TextInputAction.go,
                            onSubmitted: (_) => _submit(),
                            decoration: InputDecoration(
                              labelText: t('signIn.password'),
                              prefixIcon: const Icon(CupertinoIcons.lock),
                              suffixIcon: IconButton(
                                tooltip: t(_show ? 'signIn.hide' : 'signIn.show'),
                                icon: Icon(_show ? CupertinoIcons.eye_slash : CupertinoIcons.eye),
                                onPressed: () => setState(() => _show = !_show),
                              ),
                            ),
                          ),
                          AnimatedSize(
                            duration: const Duration(milliseconds: 200),
                            child: _error == null
                                ? const SizedBox(height: 18)
                                : Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Icon(CupertinoIcons.exclamationmark_circle_fill, size: 16, color: c.error),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(t(_error!), style: TextStyle(color: c.error, fontSize: 14)),
                                        ),
                                      ],
                                    ),
                                  ),
                          ),
                          PrimaryButton(t('signIn.submit'), loading: _busy, onPressed: _submit),
                          const SizedBox(height: 10),
                          SecondaryButton(
                            t('signIn.demo'),
                            icon: CupertinoIcons.person_crop_circle_badge_checkmark,
                            onPressed: _busy
                                ? null
                                : () {
                                    _email.text = demoEmail;
                                    _password.text = demoPassword;
                                    _submit();
                                  },
                          ),
                          const SizedBox(height: 22),
                          Text(t('signIn.join'), textAlign: TextAlign.center, style: context.text.bodySmall),
                          const SizedBox(height: 6),
                          Center(
                            child: TextButton.icon(
                              onPressed: () => ServerSheet.open(context),
                              icon: Icon(CupertinoIcons.antenna_radiowaves_left_right, size: 15, color: c.faint),
                              label: Text(
                                t('signIn.server', {'url': settings.server.replaceFirst(RegExp(r'^https?://'), '')}),
                                style: TextStyle(color: c.faint, fontSize: 13),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
