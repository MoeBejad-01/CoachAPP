// Today's habits: water, sleep, steps, food, stress and soreness. Big tiles on
// Today, each opening a small sheet with one job. Everything is saved for the
// day and shows up for the coach (dashboard → trainee → Check-ins → Daily log).

import 'dart:math' as math;

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../app/format.dart';
import '../app/l10n.dart';
import '../app/theme.dart';
import '../data/models.dart';
import '../data/schedule.dart';
import '../data/store.dart';
import '../widgets/anatomy_shapes.dart';
import '../widgets/glyph.dart';
import '../widgets/ui.dart';

const _glassMl = 250.0;
const waterGoalMl = 2500.0;

/// The symbol for a stress level (1 very calm … 5 very stressed).
Widget stressIcon(int level, {double size = 30}) => Icon(Sym.moods[level - 1], size: size, color: Sym.moodColors[level - 1]);

/// Bars for a soreness level (1 not sore … 5 painful).
Widget sorenessBars(int level, {double height = 24}) => LevelBars(level: level, height: height);

double sleepGoal(Snapshot s) => weekOf(s.trainee, Day.today)?.targets.sleepH ?? 8;
double stepsGoal(Snapshot s) => weekOf(s.trainee, Day.today)?.targets.steps ?? 8000;

class HabitsCard extends StatelessWidget {
  const HabitsCard({super.key});

  // Built as `const` by its parents, so it has to listen to the store itself.
  @override
  Widget build(BuildContext context) => Watch(builder: _build);

  Widget _build(BuildContext context) {
    final s = context.store.s;
    final d = s.dayLog(Day.today);
    final tiles = [
      _Tile(
        icon: Sym.water,
        tone: Tone.sky,
        label: t('habit.water'),
        value: d.waterMl == null ? null : t('habit.waterValue', {'v': Fmt.number(d.waterMl! / 1000)}),
        progress: (d.waterMl ?? 0) / waterGoalMl,
        onTap: () => showAppSheet(context, (_) => const WaterSheet()),
      ),
      _Tile(
        icon: Sym.sleep,
        tone: Tone.indigo,
        label: t('habit.sleep'),
        value: d.sleepH == null ? null : t('unit.hValue', {'v': Fmt.number(d.sleepH!)}),
        progress: (d.sleepH ?? 0) / sleepGoal(s),
        onTap: () => showAppSheet(context, (_) => const SleepSheet()),
      ),
      _Tile(
        icon: Sym.steps,
        tone: Tone.teal,
        label: t('habit.steps'),
        value: d.steps == null ? null : Fmt.number(d.steps!),
        progress: (d.steps ?? 0) / stepsGoal(s),
        onTap: () => showAppSheet(context, (_) => const StepsSheet()),
      ),
      _Tile(
        icon: Sym.food,
        tone: Tone.orange,
        label: t('habit.food'),
        value: d.meals.isEmpty ? null : tn('habit.meals', d.meals.length),
        progress: d.meals.length / 3,
        onTap: () => showAppSheet(context, (_) => const FoodSheet()),
      ),
      _Tile(
        icon: d.stress == null ? Sym.stress : Sym.moods[d.stress! - 1],
        tone: Tone.purple,
        label: t('habit.stress'),
        value: d.stress == null ? null : t('stress.${d.stress}'),
        progress: d.stress == null ? 0 : 1,
        onTap: () => showAppSheet(context, (_) => const FeelingSheet(kind: FeelingKind.stress)),
      ),
      _Tile(
        icon: Sym.soreness,
        tone: Tone.pink,
        label: t('habit.soreness'),
        value: d.soreness == null ? null : t('soreness.${d.soreness}'),
        progress: d.soreness == null ? 0 : 1,
        onTap: () => showAppSheet(context, (_) => const FeelingSheet(kind: FeelingKind.soreness)),
      ),
    ];
    final logged = tiles.where((x) => x.value != null).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(t('habit.title'), action: t('habit.count', {'n': logged, 'total': tiles.length})),
        GridView.count(
          padding: EdgeInsets.zero,
          crossAxisCount: 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 0.92,
          children: tiles,
        ),
      ],
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.icon, required this.tone, required this.label, required this.value, required this.progress, required this.onTap});
  final IconData icon;
  final Tone tone;
  final String label;
  final String? value;
  final double progress;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final done = value != null;
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Glyph(icon, tone: tone, size: 38),
              const Spacer(),
              SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  value: progress.clamp(0.0, 1.0),
                  strokeWidth: 3,
                  strokeCap: StrokeCap.round,
                  color: tone.color,
                  backgroundColor: c.surface2,
                ),
              ),
            ],
          ),
          const Spacer(),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: context.text.bodySmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2),
          Text(
            value ?? t('habit.tapToLog'),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: done ? context.text.titleSmall : context.text.bodySmall?.copyWith(color: c.primary, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

/// Shared layout for the habit sheets: symbol, title, one line of help, content.
class _HabitSheet extends StatelessWidget {
  const _HabitSheet({required this.icon, required this.tone, required this.title, required this.sub, required this.children});
  final IconData icon;
  final Tone tone;
  final String title, sub;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => SafeArea(
    child: SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Glyph(icon, tone: tone, size: 48),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: context.text.headlineSmall),
                    Text(sub, style: context.text.bodyMedium?.copyWith(color: context.c.muted)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          ...children,
        ],
      ),
    ),
  );
}

// ---------- Water ----------

class WaterSheet extends StatelessWidget {
  const WaterSheet({super.key});

  void _add(BuildContext context, double ml) {
    HapticFeedback.lightImpact();
    context.store.updateDay((d) => d.copyWith(waterMl: ((d.waterMl ?? 0) + ml).clamp(0, 10000).toDouble()));
  }

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final ml = context.store.s.dayLog(Day.today).waterMl ?? 0;
        final glasses = (ml / _glassMl).round();
        return _HabitSheet(
          icon: Sym.water,
          tone: Tone.sky,
          title: t('habit.water'),
          sub: t('water.sub', {'goal': Fmt.number(waterGoalMl / 1000)}),
          children: [
            Center(child: _Bottle(fill: ml / waterGoalMl)),
            const SizedBox(height: 12),
            Text(
              t('water.amount', {'v': Fmt.number(ml / 1000), 'goal': Fmt.number(waterGoalMl / 1000)}),
              textAlign: TextAlign.center,
              style: context.text.headlineSmall,
            ),
            Text(tn('water.glasses', glasses), textAlign: TextAlign.center, style: context.text.bodySmall),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: PrimaryButton(t('water.glass'), icon: CupertinoIcons.plus, onPressed: () => _add(context, _glassMl)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: SecondaryButton(t('water.bottle'), icon: CupertinoIcons.plus, onPressed: () => _add(context, 500)),
                ),
              ],
            ),
            const SizedBox(height: 6),
            TextButton(onPressed: ml <= 0 ? null : () => _add(context, -_glassMl), child: Text(t('water.undo'))),
          ],
        );
      },
    );
  }
}

/// A bottle that fills with an animated wave.
class _Bottle extends StatefulWidget {
  const _Bottle({required this.fill});
  final double fill;
  @override
  State<_Bottle> createState() => _BottleState();
}

class _BottleState extends State<_Bottle> with SingleTickerProviderStateMixin {
  late final _wave = AnimationController(vsync: this, duration: const Duration(seconds: 3))..repeat();

  @override
  void dispose() {
    _wave.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween(end: widget.fill.clamp(0.0, 1.0)),
    duration: const Duration(milliseconds: 600),
    curve: Curves.easeOutCubic,
    builder: (_, f, _) => AnimatedBuilder(
      animation: _wave,
      builder: (_, _) => CustomPaint(size: const Size(120, 170), painter: _BottlePainter(f, _wave.value, context.c.line, context.c.surface2)),
    ),
  );
}

class _BottlePainter extends CustomPainter {
  _BottlePainter(this.fill, this.phase, this.edge, this.empty);
  final double fill, phase;
  final Color edge, empty;

  @override
  void paint(Canvas canvas, Size size) {
    final body = RRect.fromRectAndRadius(Rect.fromLTWH(8, 30, size.width - 16, size.height - 34), const Radius.circular(26));
    final neck = RRect.fromRectAndRadius(Rect.fromLTWH(size.width / 2 - 18, 6, 36, 30), const Radius.circular(8));
    final shape = Path()
      ..addRRect(body)
      ..addRRect(neck);
    canvas.drawPath(shape, Paint()..color = empty);
    canvas.save();
    canvas.clipRRect(body);
    final top = body.bottom - body.height * fill;
    final wave = Path()..moveTo(body.left, top);
    for (var x = body.left; x <= body.right; x += 2) {
      wave.lineTo(x, top + (fill >= 1 ? 0 : 4) * math.sin((x / 22) + phase * 2 * math.pi));
    }
    wave
      ..lineTo(body.right, body.bottom)
      ..lineTo(body.left, body.bottom)
      ..close();
    canvas.drawPath(
      wave,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF7FE7D6), Color(0xFF3BA7F2), Color(0xFF0071E3)],
        ).createShader(body.outerRect),
    );
    canvas.restore();
    canvas.drawPath(
      shape,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = edge,
    );
  }

  @override
  bool shouldRepaint(_BottlePainter old) => old.fill != fill || old.phase != phase;
}

// ---------- Sleep ----------

class SleepSheet extends StatefulWidget {
  const SleepSheet({super.key});
  @override
  State<SleepSheet> createState() => _SleepSheetState();
}

class _SleepSheetState extends State<SleepSheet> {
  late double _h = context.store.s.dayLog(Day.today).sleepH ?? 7.5;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final goal = sleepGoal(context.store.s);
    return _HabitSheet(
      icon: Sym.sleep,
      tone: Tone.indigo,
      title: t('habit.sleep'),
      sub: t('sleep.sub', {'goal': Fmt.number(goal)}),
      children: [
        Row(
          children: [
            _Round(icon: CupertinoIcons.minus, onTap: () => setState(() => _h = (_h - 0.5).clamp(0, 16))),
            Expanded(
              child: Column(
                children: [
                  Text(Fmt.number(_h), style: context.text.displaySmall?.copyWith(fontSize: 52)),
                  Text(t('sleep.hours'), style: context.text.bodySmall),
                ],
              ),
            ),
            _Round(icon: CupertinoIcons.plus, onTap: () => setState(() => _h = (_h + 0.5).clamp(0, 16))),
          ],
        ),
        const SizedBox(height: 16),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final h in [5.0, 6.0, 7.0, 8.0, 9.0])
              ChoiceChip(
                label: Text(t('unit.hValue', {'v': Fmt.number(h)})),
                selected: _h == h,
                showCheckmark: false,
                onSelected: (_) => setState(() => _h = h),
                shape: const StadiumBorder(),
                side: BorderSide(color: c.line),
                selectedColor: c.primarySoft,
              ),
          ],
        ),
        const SizedBox(height: 12),
        Text(_h >= goal ? t('sleep.good') : t('sleep.tip'), textAlign: TextAlign.center, style: context.text.bodySmall),
        const SizedBox(height: 18),
        PrimaryButton(
          t('common.save'),
          onPressed: () {
            context.store.updateDay((d) => d.copyWith(sleepH: _h));
            HapticFeedback.mediumImpact();
            Navigator.pop(context);
          },
        ),
      ],
    );
  }
}

class _Round extends StatelessWidget {
  const _Round({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    child: Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(color: context.c.primarySoft, shape: BoxShape.circle),
      child: Icon(icon, color: context.c.primary, size: 26),
    ),
  );
}

// ---------- Steps ----------

class StepsSheet extends StatefulWidget {
  const StepsSheet({super.key});
  @override
  State<StepsSheet> createState() => _StepsSheetState();
}

class _StepsSheetState extends State<StepsSheet> {
  late final _ctl = TextEditingController(text: context.store.s.dayLog(Day.today).steps?.round().toString() ?? '');

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }

  double get _value => double.tryParse(latinDigits(_ctl.text).replaceAll(',', '')) ?? 0;

  void _add(double n) {
    setState(() => _ctl.text = (_value + n).round().toString());
    HapticFeedback.selectionClick();
  }

  @override
  Widget build(BuildContext context) {
    final goal = stepsGoal(context.store.s);
    return _HabitSheet(
      icon: Sym.steps,
      tone: Tone.teal,
      title: t('habit.steps'),
      sub: t('steps.sub', {'goal': Fmt.number(goal)}),
      children: [
        TextField(
          controller: _ctl,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          style: context.text.displaySmall,
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9٠-٩]'))],
          decoration: InputDecoration(hintText: '0', suffixText: t('steps.unit')),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 12),
        ProgressBar(_value / goal, color: context.c.success),
        const SizedBox(height: 14),
        Row(
          children: [
            for (final n in [500.0, 1000.0, 2000.0]) ...[
              Expanded(child: SecondaryButton('+${Fmt.number(n)}', onPressed: () => _add(n))),
              if (n != 2000) const SizedBox(width: 8),
            ],
          ],
        ),
        const SizedBox(height: 10),
        Text(t('steps.tip'), textAlign: TextAlign.center, style: context.text.bodySmall),
        const SizedBox(height: 18),
        PrimaryButton(
          t('common.save'),
          onPressed: () {
            context.store.updateDay((d) => d.copyWith(steps: _value));
            HapticFeedback.mediumImpact();
            Navigator.pop(context);
          },
        ),
      ],
    );
  }
}

// ---------- Food ----------

class FoodSheet extends StatefulWidget {
  const FoodSheet({super.key});
  @override
  State<FoodSheet> createState() => _FoodSheetState();
}

class _FoodSheetState extends State<FoodSheet> {
  String _type = _guessMeal();
  final _text = TextEditingController();
  final _kcal = TextEditingController();
  final _protein = TextEditingController();

  static String _guessMeal() {
    final h = DateTime.now().hour;
    return h < 11 ? 'breakfast' : (h < 16 ? 'lunch' : (h < 21 ? 'dinner' : 'snack'));
  }

  @override
  void dispose() {
    _text.dispose();
    _kcal.dispose();
    _protein.dispose();
    super.dispose();
  }

  double? _num(TextEditingController c) => double.tryParse(latinDigits(c.text).replaceAll(',', '.'));

  void _add() {
    if (_text.text.trim().isEmpty) return;
    final meal = Meal(id: newId('meal'), type: _type, text: _text.text.trim(), kcal: _num(_kcal), proteinG: _num(_protein));
    context.store.updateDay((d) => d.copyWith(meals: [...d.meals, meal]));
    HapticFeedback.mediumImpact();
    _text.clear();
    _kcal.clear();
    _protein.clear();
    FocusScope.of(context).unfocus();
  }

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final s = context.store.s;
        final d = s.dayLog(Day.today);
        final c = context.c;
        final k = weekOf(s.trainee, Day.today)?.targets;
        return _HabitSheet(
          icon: Sym.food,
          tone: Tone.orange,
          title: t('habit.food'),
          sub: t('food.sub'),
          children: [
            if (d.kcal > 0 || d.protein > 0 || k?.calories != null)
              Row(
                children: [
                  Expanded(
                    child: _Total(label: t('target.calories'), value: Fmt.number(d.kcal), goal: k?.calories, unit: 'kcal'),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _Total(label: t('target.protein'), value: Fmt.number(d.protein), goal: k?.proteinG, unit: 'g'),
                  ),
                ],
              ),
            for (final m in d.meals)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: AppCard(
                  padding: const EdgeInsets.fromLTRB(14, 10, 6, 10),
                  child: Row(
                    children: [
                      Glyph.soft(Sym.meal[m.type] ?? Sym.food, tone: Tone.orange, size: 36),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(m.text, style: context.text.titleSmall),
                            Text(
                              [
                                t('meal.${m.type}'),
                                if (m.kcal != null) '${Fmt.number(m.kcal!)} kcal',
                                if (m.proteinG != null) t('unit.gValue', {'v': m.proteinG!}),
                              ].join(' · '),
                              style: context.text.bodySmall,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        tooltip: t('common.remove'),
                        icon: Icon(CupertinoIcons.xmark_circle_fill, color: c.faint),
                        onPressed: () => context.store.updateDay((x) => x.copyWith(meals: x.meals.where((y) => y.id != m.id).toList())),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 18),
            Text(t('food.add'), style: context.text.titleSmall),
            const SizedBox(height: 8),
            Row(
              children: [
                for (final type in mealTypes)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: Pressable(
                        onTap: () => setState(() => _type = type),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 160),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _type == type ? c.primarySoft : c.surface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: _type == type ? c.primary : c.line),
                          ),
                          child: Column(
                            children: [
                              Icon(Sym.meal[type], size: 26, color: _type == type ? c.primary : Tone.orange.color),
                              const SizedBox(height: 4),
                              Text(
                                t('meal.$type'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _type == type ? c.primary : c.text2),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _text,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(hintText: t('food.what')),
              onSubmitted: (_) => _add(),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _kcal,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: t('food.kcal'), suffixText: 'kcal'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _protein,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: t('food.protein'), suffixText: 'g'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            PrimaryButton(t('food.addButton'), icon: CupertinoIcons.plus, onPressed: _add),
          ],
        );
      },
    );
  }
}

class _Total extends StatelessWidget {
  const _Total({required this.label, required this.value, required this.goal, required this.unit});
  final String label, value, unit;
  final double? goal;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: context.c.surface, borderRadius: BorderRadius.circular(Tokens.rSmall)),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: context.text.bodySmall),
        Text(goal == null ? '$value $unit' : '$value / ${Fmt.number(goal!)} $unit', style: context.text.titleSmall),
      ],
    ),
  );
}

// ---------- Stress & soreness ----------

enum FeelingKind { stress, soreness }

class FeelingSheet extends StatefulWidget {
  const FeelingSheet({super.key, required this.kind});
  final FeelingKind kind;
  @override
  State<FeelingSheet> createState() => FeelingKindSheetState();
}

class FeelingKindSheetState extends State<FeelingSheet> {
  late final _day = context.store.s.dayLog(Day.today);
  late int? _value = widget.kind == FeelingKind.stress ? _day.stress : _day.soreness;
  late final Set<String> _areas = {..._day.sorenessAreas};

  bool get _stress => widget.kind == FeelingKind.stress;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final key = _stress ? 'stress' : 'soreness';
    return _HabitSheet(
      icon: _stress ? Sym.stress : Sym.soreness,
      tone: _stress ? Tone.purple : Tone.pink,
      title: t(_stress ? 'habit.stress' : 'habit.soreness'),
      sub: t(_stress ? 'stress.sub' : 'soreness.sub'),
      children: [
        Row(
          children: [
            for (var i = 1; i <= 5; i++)
              Expanded(
                child: Semantics(
                  button: true,
                  selected: _value == i,
                  label: t('$key.$i'),
                  child: Pressable(
                    onTap: () => setState(() => _value = i),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _value == i ? c.primarySoft : c.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: _value == i ? c.primary : c.line, width: _value == i ? 2 : 1),
                      ),
                      child: Column(
                        children: [
                          AnimatedScale(
                            scale: _value == i ? 1.2 : 1,
                            duration: const Duration(milliseconds: 180),
                            child: SizedBox(height: 34, child: Center(child: _stress ? stressIcon(i, size: 34) : sorenessBars(i, height: 26))),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '$i',
                            style: TextStyle(fontWeight: FontWeight.w700, color: _value == i ? c.primary : c.muted),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 10),
        Text(_value == null ? t('feeling.pick') : t('$key.$_value'), textAlign: TextAlign.center, style: context.text.titleSmall),
        if (!_stress && (_value ?? 0) >= 2) ...[
          const SizedBox(height: 18),
          Text(t('soreness.where'), style: context.text.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final g in MuscleGroup.values)
                FilterChip(
                  label: Text(t('muscle.${g.name}')),
                  selected: _areas.contains(g.name),
                  onSelected: (on) => setState(() => on ? _areas.add(g.name) : _areas.remove(g.name)),
                  shape: const StadiumBorder(),
                  side: BorderSide(color: c.line),
                  selectedColor: c.errorSoft,
                  checkmarkColor: c.error,
                ),
            ],
          ),
          if ((_value ?? 0) >= 5) ...[const SizedBox(height: 12), Text(t('soreness.painNote'), style: context.text.bodySmall?.copyWith(color: c.error))],
        ],
        const SizedBox(height: 20),
        PrimaryButton(
          t('common.save'),
          onPressed: _value == null
              ? null
              : () {
                  final v = _value!;
                  context.store.updateDay((d) => _stress ? d.copyWith(stress: v) : d.copyWith(soreness: v, sorenessAreas: v >= 2 ? _areas.toList() : const []));
                  HapticFeedback.mediumImpact();
                  Navigator.pop(context);
                },
        ),
      ],
    );
  }
}
