// "Can't make it?": move today's session to tomorrow, or skip it for this
// week with a reason the coach sees (dashboard → trainee → This week).

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../app/l10n.dart';
import '../app/theme.dart';
import '../data/models.dart';
import '../data/store.dart';
import '../widgets/glyph.dart';
import '../widgets/ui.dart';

const skipIcons = {
  'sick': Icons.sick_rounded,
  'busy': Icons.work_rounded,
  'travel': Icons.flight_takeoff_rounded,
  'sore': Icons.healing_rounded,
  'motivation': Icons.battery_2_bar_rounded,
  'other': Icons.more_horiz_rounded,
};

class SkipSheet extends StatefulWidget {
  const SkipSheet({super.key, required this.day, required this.plannedFor, this.canMove = true});
  final ProgramDay day;
  final String plannedFor;

  /// "Do it tomorrow" only makes sense for a session that's due today.
  final bool canMove;

  static Future<void> open(BuildContext context, {required ProgramDay day, required String plannedFor, bool canMove = true}) async {
    final skipped = await showAppSheet<bool>(context, (_) => SkipSheet(day: day, plannedFor: plannedFor, canMove: canMove));
    if (skipped == true && context.mounted) toast(context, t('skip.done', {'name': context.store.s.coach.firstName}));
  }

  @override
  State<SkipSheet> createState() => _SkipSheetState();
}

class _SkipSheetState extends State<SkipSheet> {
  bool _skipping = false;
  String? _reason;
  final _note = TextEditingController();

  @override
  void initState() {
    super.initState();
    _skipping = !widget.canMove;
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final coach = context.store.s.coach.firstName;
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(t('skip.title'), style: context.text.headlineSmall),
            const SizedBox(height: 4),
            Text(t('skip.sub', {'day': widget.day.name}), style: context.text.bodyMedium?.copyWith(color: c.muted)),
            const SizedBox(height: 18),
            if (widget.canMove) ...[
              _Choice(
                icon: Sym.calendar,
                tone: Tone.blue,
                title: t('skip.tomorrow'),
                body: t('skip.tomorrowSub'),
                selected: false,
                onTap: () {
                  context.store.skipToday();
                  HapticFeedback.mediumImpact();
                  Navigator.pop(context);
                },
              ),
              const SizedBox(height: 10),
            ],
            _Choice(
              icon: Sym.skip,
              tone: Tone.orange,
              title: t('skip.skip'),
              body: t('skip.skipSub', {'name': coach}),
              selected: _skipping,
              onTap: () => setState(() => _skipping = true),
            ),
            AnimatedSize(
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeOutCubic,
              child: !_skipping
                  ? const SizedBox(width: double.infinity)
                  : Padding(
                      padding: const EdgeInsets.only(top: 18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(t('skip.why'), style: context.text.titleSmall),
                          const SizedBox(height: 10),
                          GridView.count(
                            padding: EdgeInsets.zero,
                            crossAxisCount: 3,
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            mainAxisSpacing: 8,
                            crossAxisSpacing: 8,
                            childAspectRatio: 1.25,
                            children: [
                              for (final r in skipReasons)
                                Pressable(
                                  onTap: () => setState(() => _reason = r),
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 160),
                                    decoration: BoxDecoration(
                                      color: _reason == r ? Tone.orange.color.withValues(alpha: 0.12) : c.surface,
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(color: _reason == r ? Tone.orange.color : c.line, width: _reason == r ? 2 : 1),
                                    ),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(skipIcons[r], size: 26, color: _reason == r ? Tone.orange.color : c.text2),
                                        const SizedBox(height: 6),
                                        Text(
                                          t('skip.reason.$r'),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: c.text),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _note,
                            minLines: 1,
                            maxLines: 3,
                            textCapitalization: TextCapitalization.sentences,
                            decoration: InputDecoration(hintText: t('skip.note', {'name': coach})),
                          ),
                          const SizedBox(height: 16),
                          PrimaryButton(
                            t('skip.confirm', {'day': widget.day.name}),
                            onPressed: _reason == null
                                ? null
                                : () {
                                    context.store.skipSession(day: widget.day, plannedFor: widget.plannedFor, reason: _reason!, note: _note.text);
                                    HapticFeedback.mediumImpact();
                                    Navigator.pop(context, true);
                                  },
                          ),
                          const SizedBox(height: 8),
                          Text(t('skip.tip'), textAlign: TextAlign.center, style: context.text.bodySmall),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Choice extends StatelessWidget {
  const _Choice({required this.icon, required this.tone, required this.title, required this.body, required this.selected, required this.onTap});
  final IconData icon;
  final Tone tone;
  final String title, body;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => AppCard(
    onTap: onTap,
    border: selected ? tone.color : null,
    padding: const EdgeInsets.all(16),
    child: Row(
      children: [
        Glyph(icon, tone: tone, size: 44),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: context.text.titleMedium),
              const SizedBox(height: 2),
              Text(body, style: context.text.bodySmall),
            ],
          ),
        ),
        Icon(CupertinoIcons.chevron_forward, size: 16, color: context.c.faint),
      ],
    ),
  );
}

/// "Skipped · Busy" for a skipped session.
String skipLabel(SkippedSession k) => t('skip.noted', {'reason': t('skip.reason.${k.reason}')});
