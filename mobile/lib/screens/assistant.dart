// The Coach HQ assistant (proof of concept). The screen works like a chat:
// suggested questions, a message box, the trainee's messages. It doesn't
// answer yet: replies get switched on when an AI model is connected.
// Messages stay on the phone and aren't sent anywhere.

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../app/format.dart';
import '../app/l10n.dart';
import '../app/theme.dart';
import '../data/store.dart';
import '../widgets/ui.dart';

class AssistantScreen extends StatefulWidget {
  const AssistantScreen({super.key});

  static void open(BuildContext context) =>
      Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(fullscreenDialog: true, builder: (_) => const AssistantScreen()));

  @override
  State<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends State<AssistantScreen> {
  final _text = TextEditingController();
  final _sent = <({String text, DateTime at})>[];

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  void _send([String? quick]) {
    final v = (quick ?? _text.text).trim();
    if (v.isEmpty) return;
    HapticFeedback.lightImpact();
    setState(() => _sent.add((text: v, at: DateTime.now())));
    _text.clear();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final name = context.store.s.trainee.firstName;
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;
    final bottom = MediaQuery.paddingOf(context).bottom;
    final prompts = [t('ai.q1'), t('ai.q2'), t('ai.q3'), t('ai.q4')];
    return Scaffold(
      backgroundColor: c.bg,
      resizeToAvoidBottomInset: false,
      appBar: AppBar(
        leading: IconButton(tooltip: t('common.close'), icon: const Icon(CupertinoIcons.xmark), onPressed: () => Navigator.pop(context)),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const _Spark(size: 28),
            const SizedBox(width: 8),
            Text(t('ai.title')),
            const SizedBox(width: 8),
            Pill(t('ai.preview'), color: c.primary, background: c.primarySoft),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              reverse: true,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              children: [
                if (_sent.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(CupertinoIcons.lock_fill, size: 12, color: c.faint),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(t('ai.noReplies'), textAlign: TextAlign.center, style: context.text.bodySmall?.copyWith(fontSize: 12)),
                        ),
                      ],
                    ),
                  ),
                for (final m in _sent.reversed)
                  Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: Container(
                      margin: const EdgeInsets.only(top: 8),
                      constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.76),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        gradient: Tokens.brandGradient,
                        borderRadius: const BorderRadiusDirectional.only(
                          topStart: Radius.circular(20),
                          topEnd: Radius.circular(20),
                          bottomStart: Radius.circular(20),
                          bottomEnd: Radius.circular(6),
                        ).resolve(Directionality.of(context)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(m.text, style: const TextStyle(color: Colors.white, fontSize: 16, height: 1.35)),
                          const SizedBox(height: 3),
                          Text(Fmt.time(m.at), style: const TextStyle(color: Colors.white70, fontSize: 11)),
                        ],
                      ),
                    ),
                  ),
                if (_sent.isEmpty) ...[
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final p in prompts)
                        ActionChip(
                          avatar: Icon(Icons.auto_awesome_rounded, size: 15, color: c.primary),
                          label: Text(p),
                          onPressed: () => _send(p),
                          shape: const StadiumBorder(),
                          side: BorderSide(color: c.line),
                          backgroundColor: c.surface,
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(t('ai.try'), style: context.text.labelMedium?.copyWith(color: c.muted)),
                ],
                const SizedBox(height: 16),
                AppCard(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _Spark(size: 40),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(t('ai.hello', {'name': name}), style: context.text.titleMedium),
                            const SizedBox(height: 4),
                            Text(t('ai.intro'), style: context.text.bodyMedium?.copyWith(color: c.text2)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: EdgeInsets.fromLTRB(12, 8, 8, 8 + (keyboard > 0 ? keyboard : bottom)),
            decoration: BoxDecoration(
              color: c.bg,
              border: Border(top: BorderSide(color: c.hairline)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    controller: _text,
                    minLines: 1,
                    maxLines: 4,
                    textCapitalization: TextCapitalization.sentences,
                    onChanged: (_) => setState(() {}),
                    onSubmitted: (_) => _send(),
                    decoration: InputDecoration(
                      hintText: t('ai.placeholder'),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(22),
                        borderSide: BorderSide(color: c.line),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(22),
                        borderSide: BorderSide(color: c.line),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(22),
                        borderSide: BorderSide(color: c.primary),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                IconButton.filled(
                  tooltip: t('chat.send'),
                  onPressed: _text.text.trim().isEmpty ? null : _send,
                  style: IconButton.styleFrom(backgroundColor: Tokens.fill, disabledBackgroundColor: c.line, fixedSize: const Size(44, 44)),
                  icon: Icon(context.settings.isArabic ? CupertinoIcons.arrow_left : CupertinoIcons.arrow_up, color: Colors.white),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// The assistant's mark: sparkles on the brand gradient.
class _Spark extends StatelessWidget {
  const _Spark({required this.size});
  final double size;
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: const BoxDecoration(shape: BoxShape.circle, gradient: Tokens.brandGradient),
    child: Icon(Icons.auto_awesome_rounded, color: Colors.white, size: size * 0.52),
  );
}

/// The round sparkle button in page headers.
class AssistantButton extends StatelessWidget {
  const AssistantButton({super.key});
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: t('ai.title'),
    child: Pressable(onTap: () => AssistantScreen.open(context), child: const _Spark(size: 38)),
  );
}
