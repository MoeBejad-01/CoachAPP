// Cardio: log a walk, run, ride, swim or class in a few taps, and see the
// week's minutes against the WHO's 150-minute guideline. Cardio inside a
// program workout (bike sprints, incline walk) counts too.

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../app/format.dart';
import '../app/l10n.dart';
import '../app/theme.dart' show TokensX;
import '../data/models.dart';
import '../data/schedule.dart';
import '../data/store.dart';
import '../widgets/glyph.dart';
import '../widgets/ui.dart';

String cardioLine(CardioDetail d) => [
  Fmt.minutes(d.minutes),
  if (d.distanceKm != null && d.distanceKm! > 0) t('cardio.km', {'v': Fmt.number(d.distanceKm!, digits: 2)}),
  if (d.avgHr != null) t('cardio.bpm', {'v': d.avgHr!}),
  if (d.kcal != null) '${Fmt.number(d.kcal!)} kcal',
].join(' · ');

class CardioWeekCard extends StatelessWidget {
  const CardioWeekCard({super.key, this.showList = true});
  final bool showList;

  // Built as `const` by its parents, so it has to listen to the store itself.
  @override
  Widget build(BuildContext context) => Watch(builder: _build);

  Widget _build(BuildContext context) {
    final s = context.store.s;
    final c = context.c;
    final start = Day.startOfWeek(Day.today);
    final minutes = cardioMinutesBetween(s, start, Day.add(start, 6));
    final recent = s.cardio.reversed.take(3).toList();
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SizedBox(
                width: 64,
                height: 64,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox.expand(
                      child: TweenAnimationBuilder<double>(
                        tween: Tween(end: (minutes / weeklyCardioGoal).clamp(0.0, 1.0)),
                        duration: const Duration(milliseconds: 800),
                        curve: Curves.easeOutCubic,
                        builder: (_, v, _) => CircularProgressIndicator(value: v, strokeWidth: 7, strokeCap: StrokeCap.round, color: c.success, backgroundColor: c.surface2),
                      ),
                    ),
                    Icon(Sym.heart, size: 26, color: Tone.pink.color),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t('cardio.week'), style: context.text.titleMedium),
                    Text(t('cardio.weekValue', {'n': minutes.round(), 'goal': weeklyCardioGoal.round()}), style: context.text.titleSmall?.copyWith(color: c.success)),
                    Text(t('cardio.who'), style: context.text.bodySmall),
                  ],
                ),
              ),
            ],
          ),
          if (showList && recent.isNotEmpty) ...[
            const SizedBox(height: 12),
            for (final x in recent)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Row(
                  children: [
                    Glyph.soft(Sym.activity[x.activity] ?? Sym.cardio, tone: Tone.green, size: 30),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text('${t('cardio.act.${x.activity}')} · ${cardioLine(x.detail)}', maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.bodyMedium),
                    ),
                    Text(Fmt.relativeDay(x.date), style: context.text.bodySmall),
                  ],
                ),
              ),
          ],
          const SizedBox(height: 14),
          SecondaryButton(t('cardio.log'), icon: CupertinoIcons.plus, color: c.success, onPressed: () => CardioSheet.open(context)),
        ],
      ),
    );
  }
}

class CardioSheet extends StatefulWidget {
  const CardioSheet({super.key});

  static Future<void> open(BuildContext context) async {
    final saved = await showAppSheet<bool>(context, (_) => const CardioSheet());
    if (saved == true && context.mounted) toast(context, t('cardio.saved', {'name': context.store.s.coach.firstName}));
  }

  @override
  State<CardioSheet> createState() => _CardioSheetState();
}

class _CardioSheetState extends State<CardioSheet> {
  String _activity = 'walk';
  double _minutes = 30;
  int _effort = 2;
  bool _more = false;
  final _km = TextEditingController();
  final _hr = TextEditingController();
  final _kcal = TextEditingController();
  final _note = TextEditingController();

  @override
  void dispose() {
    for (final c in [_km, _hr, _kcal, _note]) {
      c.dispose();
    }
    super.dispose();
  }

  double? _num(TextEditingController c) {
    final v = double.tryParse(latinDigits(c.text).replaceAll(',', '.'));
    return v == null || v <= 0 ? null : v;
  }

  void _save() {
    context.store.logCardio(
      CardioSession(
        id: newId('cd'),
        date: Day.today,
        activity: _activity,
        detail: CardioDetail(minutes: _minutes, distanceKm: _num(_km), avgHr: _num(_hr), kcal: _num(_kcal)),
        effort: _effort,
        note: _note.text,
      ),
    );
    HapticFeedback.heavyImpact();
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(t('cardio.log'), style: context.text.headlineSmall),
                  Text(t('cardio.logSub'), style: context.text.bodyMedium?.copyWith(color: c.muted)),
                  const SizedBox(height: 18),
                  GridView.count(
                    padding: EdgeInsets.zero,
                    crossAxisCount: 5,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 0.82,
                    children: [
                      for (final a in cardioActivities)
                        Pressable(
                          onTap: () => setState(() => _activity = a),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 160),
                            decoration: BoxDecoration(
                              color: _activity == a ? c.successSoft : c.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: _activity == a ? c.success : c.line, width: _activity == a ? 2 : 1),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Sym.activity[a], size: 28, color: _activity == a ? c.success : c.text2),
                                const SizedBox(height: 4),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 2),
                                  child: Text(
                                    t('cardio.act.$a'),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: c.text2),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Text(t('cardio.howLong'), style: context.text.titleSmall),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _Step(icon: CupertinoIcons.minus, onTap: () => setState(() => _minutes = (_minutes - 5).clamp(5, 600))),
                      Expanded(
                        child: Text(Fmt.minutes(_minutes), textAlign: TextAlign.center, style: context.text.headlineMedium),
                      ),
                      _Step(icon: CupertinoIcons.plus, onTap: () => setState(() => _minutes = (_minutes + 5).clamp(5, 600))),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      for (final m in [10.0, 20.0, 30.0, 45.0, 60.0])
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 3),
                            child: Pressable(
                              onTap: () => setState(() => _minutes = m),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 160),
                                height: 40,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: _minutes == m ? c.successSoft : c.surface,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: _minutes == m ? c.success : c.line, width: _minutes == m ? 1.5 : 1),
                                ),
                                child: FittedBox(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 8),
                                    child: Text(
                                      Fmt.minutes(m),
                                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: _minutes == m ? c.success : c.text2),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(t('cardio.howHard'), style: context.text.titleSmall),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      for (var e = 1; e <= 3; e++)
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: Pressable(
                              onTap: () => setState(() => _effort = e),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 160),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                  color: _effort == e ? c.successSoft : c.surface,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: _effort == e ? c.success : c.line, width: _effort == e ? 2 : 1),
                                ),
                                child: Column(
                                  children: [
                                    SizedBox(
                                      height: 28,
                                      child: Center(child: LevelBars(level: e, max: 3, height: 24)),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      t('cardio.effort.$e'),
                                      style: TextStyle(fontWeight: FontWeight.w600, color: c.text2),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _km,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: t('cardio.distance'), suffixText: 'km'),
                  ),
                  AnimatedCrossFade(
                    duration: const Duration(milliseconds: 200),
                    crossFadeState: _more ? CrossFadeState.showSecond : CrossFadeState.showFirst,
                    firstChild: Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: TextButton.icon(onPressed: () => setState(() => _more = true), icon: const Icon(CupertinoIcons.plus_circle, size: 18), label: Text(t('cardio.more'))),
                    ),
                    secondChild: Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _hr,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(labelText: t('cardio.hr'), suffixText: 'bpm'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: TextField(
                                  controller: _kcal,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(labelText: t('cardio.kcal'), suffixText: 'kcal'),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          TextField(
                            controller: _note,
                            textCapitalization: TextCapitalization.sentences,
                            decoration: InputDecoration(hintText: t('cardio.note')),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Always in reach, however far the form scrolls.
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            child: PrimaryButton(t('cardio.save', {'name': context.store.s.coach.firstName}), icon: CupertinoIcons.checkmark_alt, onPressed: _save),
          ),
        ],
      ),
    );
  }
}

class _Step extends StatelessWidget {
  const _Step({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    child: Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(color: context.c.successSoft, shape: BoxShape.circle),
      child: Icon(icon, color: context.c.success),
    ),
  );
}

/// Weekly cardio minutes for the Progress chart, oldest first.
List<({String weekStart, double minutes})> cardioByWeek(Snapshot s, {int weeks = 8}) {
  final thisWeek = Day.startOfWeek(Day.today);
  return List.generate(weeks, (i) {
    final start = Day.add(thisWeek, -7 * (weeks - 1 - i));
    return (weekStart: start, minutes: cardioMinutesBetween(s, start, Day.add(start, 6)));
  });
}
