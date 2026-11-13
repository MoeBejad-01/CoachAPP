// The live workout: log each set (weight × reps), rest timer between sets,
// last time's numbers pre-filled, live "new best" badges, pain flags and notes.
// Finishing saves the session and sends it to the coach.

import 'dart:async';

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../app/format.dart';
import '../app/l10n.dart';
import '../app/theme.dart';
import '../data/draft.dart';
import '../data/models.dart';
import '../data/schedule.dart';
import '../data/store.dart';
import '../widgets/anatomy_shapes.dart';
import '../widgets/glyph.dart';
import '../widgets/muscle_map.dart';
import '../widgets/ui.dart';
import 'cardio.dart' show cardioLine;
import 'technique.dart';
import 'train.dart';

class WorkoutScreen extends StatefulWidget {
  const WorkoutScreen({super.key});

  static void open(BuildContext context) {
    if (context.store.draft == null) return;
    Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(fullscreenDialog: true, builder: (_) => const WorkoutScreen()));
  }

  @override
  State<WorkoutScreen> createState() => _WorkoutScreenState();
}

class _WorkoutScreenState extends State<WorkoutScreen> {
  late final Timer _tick;
  DateTime? _restEnd;
  int _restTotal = 0;
  bool _restDone = false;
  final _controllers = <String, TextEditingController>{};

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_restEnd != null && !_restDone && DateTime.now().isAfter(_restEnd!)) {
        _restDone = true;
        HapticFeedback.heavyImpact();
        Future.delayed(const Duration(seconds: 4), () {
          if (mounted && _restDone) setState(() => _restEnd = null);
        });
      }
      setState(() {});
    });
  }

  @override
  void dispose() {
    _tick.cancel();
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _ctl(String key, String initial) => _controllers.putIfAbsent(key, () => TextEditingController(text: initial));

  void _changed() {
    context.store.saveDraft();
    setState(() {});
  }

  void _startRest(int seconds) {
    setState(() {
      _restTotal = seconds;
      _restEnd = DateTime.now().add(Duration(seconds: seconds));
      _restDone = false;
    });
  }

  Future<void> _leave(WorkoutDraft d) async {
    final choice = await showCupertinoModalPopup<String>(
      context: context,
      builder: (c) => CupertinoActionSheet(
        title: Text(t('workout.leave.title')),
        message: Text(t('workout.leave.body')),
        actions: [
          CupertinoActionSheetAction(onPressed: () => Navigator.pop(c, 'keep'), child: Text(t('workout.leave.keep'))),
          CupertinoActionSheetAction(isDestructiveAction: true, onPressed: () => Navigator.pop(c, 'discard'), child: Text(t('workout.leave.discard'))),
        ],
        cancelButton: CupertinoActionSheetAction(onPressed: () => Navigator.pop(c), child: Text(t('common.cancel'))),
      ),
    );
    if (!mounted || choice == null) return;
    if (choice == 'discard') context.store.discardDraft();
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final store = context.store;
        final d = store.draft;
        if (d == null) return const Scaffold();
        final c = context.c;
        final elapsed = DateTime.now().difference(d.startedAt).inSeconds;
        final currentIdx = d.exercises.indexWhere((e) => e.done < e.total);
        final bottom = MediaQuery.paddingOf(context).bottom;
        return PopScope(
          canPop: false,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) _leave(d);
          },
          child: Scaffold(
            backgroundColor: c.bg,
            appBar: AppBar(
              leading: IconButton(tooltip: t('common.close'), icon: const Icon(CupertinoIcons.xmark), onPressed: () => _leave(d)),
              title: Column(
                children: [
                  Text(d.dayName, style: context.text.titleMedium),
                  Text(Fmt.clock(elapsed), style: context.text.bodySmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
                ],
              ),
              actions: [
                Padding(
                  padding: const EdgeInsetsDirectional.only(end: 8),
                  child: CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    onPressed: () => _finish(d),
                    child: Text(
                      t('workout.finish'),
                      style: TextStyle(color: c.primary, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(6),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
                  child: SizedBox(
                    width: double.infinity,
                    child: ProgressBar(d.totalSets == 0 ? 0 : d.doneSets / d.totalSets, height: 4, track: c.line.withValues(alpha: 0.5)),
                  ),
                ),
              ),
            ),
            body: Stack(
              children: [
                ListView(
                  padding: EdgeInsets.fromLTRB(16, 12, 16, bottom + 120),
                  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                  children: [
                    for (var i = 0; i < d.exercises.length; i++) ...[
                      _ExerciseLogger(
                        key: ValueKey('ex$i'),
                        index: i,
                        e: d.exercises[i],
                        current: i == currentIdx,
                        logs: store.s.logs,
                        ctl: _ctl,
                        onChanged: _changed,
                        onSetDone: (rest) => _startRest(rest),
                      ),
                      const SizedBox(height: 12),
                    ],
                    const SizedBox(height: 8),
                    PrimaryButton(t('workout.finishLong'), icon: CupertinoIcons.flag_fill, onPressed: () => _finish(d)),
                  ],
                ),
                if (_restEnd != null)
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: bottom + 16,
                    child: _RestPill(
                      end: _restEnd!,
                      total: _restTotal,
                      done: _restDone,
                      onAdd: () => setState(() => _restEnd = _restEnd!.add(const Duration(seconds: 15))),
                      onSkip: () => setState(() => _restEnd = null),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _finish(WorkoutDraft d) async {
    FocusScope.of(context).unfocus();
    final saved = await showAppSheet<WorkoutLog>(context, (_) => _FinishSheet(draft: d));
    if (saved == null || !mounted) return;
    Navigator.of(context).pushReplacement(MaterialPageRoute(fullscreenDialog: true, builder: (_) => SummaryScreen(log: saved)));
  }
}

class _ExerciseLogger extends StatelessWidget {
  const _ExerciseLogger({
    super.key,
    required this.index,
    required this.e,
    required this.current,
    required this.logs,
    required this.ctl,
    required this.onChanged,
    required this.onSetDone,
  });
  final int index;
  final DraftExercise e;
  final bool current;
  final List<WorkoutLog> logs;
  final TextEditingController Function(String key, String initial) ctl;
  final VoidCallback onChanged;
  final ValueChanged<int> onSetDone;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final target = e.target;
    final last = lastEntryFor(logs, e.exerciseId, e.name);
    final best = logs.fold(0.0, (a, l) {
      for (final x in l.entries) {
        if (x.exerciseName == e.name) {
          for (final s in x.sets) {
            final v = e1rm(s.weight, s.reps);
            if (v > a) a = v;
          }
        }
      }
      return a;
    });
    if (e.cardio) return _CardioLogger(e: e, current: current, onChanged: onChanged);
    final complete = e.done == e.sets.length;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(Tokens.r),
        border: Border.all(color: current ? c.primary.withValues(alpha: 0.6) : (c.dark ? c.hairline : Colors.transparent), width: current ? 1.5 : 1),
      ),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(e.name, style: context.text.titleMedium?.copyWith(decoration: complete ? TextDecoration.none : null)),
                    if (target != null) ...[
                      const SizedBox(height: 3),
                      Text(
                        [
                          ltr('${target.sets} × ${target.reps}'),
                          if (target.intensity.isNotEmpty) target.intensity,
                          if (target.rest.isNotEmpty) t('train.rest', {'v': ltr(target.rest)}),
                        ].join(' · '),
                        style: context.text.bodySmall,
                      ),
                    ],
                  ],
                ),
              ),
              TechniqueButton(name: e.name, exercise: target),
              if (complete) ...[const SizedBox(width: 6), Icon(CupertinoIcons.checkmark_seal_fill, color: c.success, size: 24)],
            ],
          ),
          if (target != null && target.cue.isNotEmpty && current) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(color: c.tint, borderRadius: BorderRadius.circular(10)),
              child: Row(
                children: [
                  Icon(CupertinoIcons.lightbulb, size: 15, color: c.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(target.cue, style: context.text.bodySmall?.copyWith(color: c.text2)),
                  ),
                ],
              ),
            ),
          ],
          if (last != null) ...[
            const SizedBox(height: 8),
            Text(t('workout.last', {'sets': last.sets.map(setLabel).join(', ')}), maxLines: 2, overflow: TextOverflow.ellipsis, style: context.text.bodySmall),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              const SizedBox(width: 26),
              Expanded(
                flex: 5,
                child: Text(
                  t('workout.kg'),
                  textAlign: TextAlign.center,
                  style: context.text.labelSmall?.copyWith(color: c.faint),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 3,
                child: Text(
                  t('workout.reps'),
                  textAlign: TextAlign.center,
                  style: context.text.labelSmall?.copyWith(color: c.faint),
                ),
              ),
              const SizedBox(width: 52),
            ],
          ),
          for (var j = 0; j < e.sets.length; j++)
            _SetRow(
              key: ValueKey('ex$index-s$j'),
              n: j + 1,
              s: e.sets[j],
              weight: ctl('ex$index-s$j-w', e.sets[j].weight == null ? '' : Fmt.number(e.sets[j].weight!, digits: 2).replaceAll(',', '')),
              reps: ctl('ex$index-s$j-r', e.sets[j].reps?.toString() ?? ''),
              best: best,
              onChanged: onChanged,
              onDone: () => onSetDone(restSeconds(target?.rest ?? '90')),
            ),
          const SizedBox(height: 4),
          Wrap(
            spacing: 4,
            runSpacing: 0,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              TextButton.icon(
                onPressed: () {
                  final prev = e.sets.isEmpty ? null : e.sets.last;
                  e.sets.add(DraftSet(weight: prev?.weight, reps: prev?.reps));
                  onChanged();
                },
                icon: const Icon(CupertinoIcons.plus, size: 16),
                label: Text(t('workout.addSet')),
              ),
              if (e.sets.length > 1 && !e.sets.last.done)
                TextButton(
                  onPressed: () {
                    e.sets.removeLast();
                    onChanged();
                  },
                  child: Text(t('workout.removeSet'), style: TextStyle(color: c.muted)),
                ),
              FilterChip(
                selected: e.pain,
                showCheckmark: false,
                avatar: Icon(CupertinoIcons.bandage, size: 15, color: e.pain ? Colors.white : c.error),
                label: Text(t('workout.pain')),
                labelStyle: TextStyle(color: e.pain ? Colors.white : c.error, fontWeight: FontWeight.w600, fontSize: 13),
                selectedColor: c.error,
                backgroundColor: c.errorSoft,
                side: BorderSide.none,
                shape: const StadiumBorder(),
                onSelected: (v) {
                  e.pain = v;
                  HapticFeedback.selectionClick();
                  onChanged();
                },
              ),
            ],
          ),
          if (e.pain || e.note.isNotEmpty || current)
            Padding(
              padding: const EdgeInsets.only(top: 4, bottom: 6),
              child: TextField(
                controller: ctl('ex$index-note', e.note),
                minLines: 1,
                maxLines: 3,
                textInputAction: TextInputAction.done,
                decoration: InputDecoration(
                  isDense: true,
                  hintText: e.pain ? t('workout.painHint') : t('workout.noteHint'),
                  prefixIcon: Icon(CupertinoIcons.text_bubble, size: 18, color: c.faint),
                ),
                onChanged: (v) {
                  e.note = v;
                  context.store.saveDraft();
                },
              ),
            ),
        ],
      ),
    );
  }
}

/// A cardio exercise inside a workout: minutes and distance, then done.
class _CardioLogger extends StatefulWidget {
  const _CardioLogger({required this.e, required this.current, required this.onChanged});
  final DraftExercise e;
  final bool current;
  final VoidCallback onChanged;
  @override
  State<_CardioLogger> createState() => _CardioLoggerState();
}

class _CardioLoggerState extends State<_CardioLogger> {
  late final _km = TextEditingController(text: widget.e.distanceKm == null ? '' : Fmt.number(widget.e.distanceKm!, digits: 2));

  @override
  void dispose() {
    _km.dispose();
    super.dispose();
  }

  void _minutes(double by) {
    final e = widget.e;
    e.minutes = ((e.minutes ?? 10) + by).clamp(1, 300).toDouble();
    HapticFeedback.selectionClick();
    widget.onChanged();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final e = widget.e;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(Tokens.r),
        border: Border.all(
          color: widget.current ? c.success.withValues(alpha: 0.7) : (c.dark ? c.hairline : Colors.transparent),
          width: widget.current ? 1.5 : 1,
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(e.name, style: context.text.titleMedium),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Icon(Sym.heart, size: 14, color: Tone.pink.color),
                        const SizedBox(width: 4),
                        Text([t('cardio.title'), if (e.target != null) ltr(e.target!.reps)].join(' · '), style: context.text.bodySmall),
                      ],
                    ),
                  ],
                ),
              ),
              TechniqueButton(name: e.name, exercise: e.target),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _Step(icon: CupertinoIcons.minus, onTap: () => _minutes(-1)),
              Expanded(
                child: Column(
                  children: [
                    Text(Fmt.minutes(e.minutes ?? 10), style: context.text.headlineSmall),
                    Text(t('cardio.minutes'), style: context.text.bodySmall),
                  ],
                ),
              ),
              _Step(icon: CupertinoIcons.plus, onTap: () => _minutes(1)),
              const SizedBox(width: 10),
              SizedBox(
                width: 110,
                child: TextField(
                  controller: _km,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [_LatinNumber(decimal: true)],
                  textAlign: TextAlign.center,
                  decoration: InputDecoration(isDense: true, hintText: t('cardio.distanceShort'), suffixText: 'km'),
                  onChanged: (v) {
                    e.distanceKm = double.tryParse(v);
                    context.store.saveDraft();
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SecondaryButton(
            e.cardioDone ? t('cardio.doneTap') : t('cardio.markDone'),
            icon: e.cardioDone ? CupertinoIcons.checkmark_seal_fill : CupertinoIcons.checkmark_alt,
            color: c.success,
            onPressed: () {
              e.cardioDone = !e.cardioDone;
              if (e.cardioDone) HapticFeedback.mediumImpact();
              widget.onChanged();
            },
          ),
        ],
      ),
    );
  }
}

class _SetRow extends StatelessWidget {
  const _SetRow({
    super.key,
    required this.n,
    required this.s,
    required this.weight,
    required this.reps,
    required this.best,
    required this.onChanged,
    required this.onDone,
  });
  final int n;
  final DraftSet s;
  final TextEditingController weight, reps;
  final double best;
  final VoidCallback onChanged, onDone;

  void _step(double by) {
    final v = ((s.weight ?? 0) + by).clamp(0, 999).toDouble();
    s.weight = v;
    weight.text = Fmt.number(v, digits: 2).replaceAll(',', '');
    HapticFeedback.selectionClick();
    onChanged();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final isPr = s.done && best > 0 && s.weight != null && s.reps != null && e1rm(s.weight!, s.reps!) > best + 0.01;
    InputDecoration box() =>
        InputDecoration(isDense: true, contentPadding: const EdgeInsets.symmetric(vertical: 10), fillColor: s.done ? c.successSoft : c.surface2);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 26,
            child: isPr
                ? const Icon(CupertinoIcons.star_fill, size: 16, color: Color(0xFFF5B400))
                : Text(
                    '$n',
                    style: TextStyle(fontWeight: FontWeight.w700, color: s.done ? c.success : c.muted),
                  ),
          ),
          Expanded(
            flex: 5,
            child: Row(
              children: [
                _Step(icon: CupertinoIcons.minus, onTap: () => _step(-2.5)),
                Expanded(
                  child: TextField(
                    controller: weight,
                    textAlign: TextAlign.center,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [_LatinNumber(decimal: true)],
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, fontFeatures: [FontFeature.tabularFigures()]),
                    decoration: box().copyWith(hintText: '0'),
                    onChanged: (v) {
                      s.weight = double.tryParse(v);
                      onChanged();
                    },
                  ),
                ),
                _Step(icon: CupertinoIcons.plus, onTap: () => _step(2.5)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 3,
            child: TextField(
              controller: reps,
              textAlign: TextAlign.center,
              keyboardType: TextInputType.number,
              inputFormatters: [_LatinNumber(decimal: false)],
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, fontFeatures: [FontFeature.tabularFigures()]),
              decoration: box().copyWith(hintText: '0'),
              onChanged: (v) {
                s.reps = int.tryParse(v);
                onChanged();
              },
            ),
          ),
          const SizedBox(width: 8),
          Semantics(
            label: t(s.done ? 'workout.setUndo' : 'workout.setDone', {'n': n}),
            button: true,
            child: GestureDetector(
              onTap: () {
                if (!s.done && (s.reps == null || s.reps == 0)) {
                  HapticFeedback.heavyImpact();
                  return;
                }
                s.done = !s.done;
                if (s.done) {
                  HapticFeedback.mediumImpact();
                  FocusScope.of(context).unfocus();
                  onDone();
                }
                onChanged();
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 44,
                height: 40,
                decoration: BoxDecoration(color: s.done ? c.success : c.surface2, borderRadius: BorderRadius.circular(12)),
                child: Icon(CupertinoIcons.checkmark_alt, color: s.done ? (c.dark ? Colors.black : Colors.white) : c.faint, size: 22),
              ),
            ),
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
  Widget build(BuildContext context) => InkResponse(
    onTap: onTap,
    radius: 20,
    child: SizedBox(width: 30, height: 40, child: Icon(icon, size: 16, color: context.c.primary)),
  );
}

/// Accepts Arabic-Indic digits too, storing them as 0-9.
class _LatinNumber extends TextInputFormatter {
  _LatinNumber({required this.decimal});
  final bool decimal;
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    var text = latinDigits(newValue.text).replaceAll(',', '.');
    text = text.replaceAll(RegExp(decimal ? r'[^0-9.]' : r'[^0-9]'), '');
    if (decimal && '.'.allMatches(text).length > 1) return oldValue;
    if (text.length > 6) return oldValue;
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

class _RestPill extends StatelessWidget {
  const _RestPill({required this.end, required this.total, required this.done, required this.onAdd, required this.onSkip});
  final DateTime end;
  final int total;
  final bool done;
  final VoidCallback onAdd, onSkip;

  @override
  Widget build(BuildContext context) {
    final left = end.difference(DateTime.now()).inSeconds;
    final frac = total == 0 ? 0.0 : (left / total).clamp(0.0, 1.0);
    return AppCard(
      gradient: done ? null : Tokens.brandGradient,
      color: done ? context.c.success : null,
      padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
      child: Row(
        children: [
          SizedBox(
            width: 40,
            height: 40,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(value: done ? 1 : frac, strokeWidth: 3.5, color: Colors.white, backgroundColor: Colors.white24),
                Icon(done ? CupertinoIcons.bolt_fill : CupertinoIcons.timer, color: Colors.white, size: 18),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  done ? t('workout.rest.over') : t('workout.rest.title'),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15),
                ),
                if (!done)
                  Text(
                    Fmt.clock(left),
                    style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()]),
                  ),
              ],
            ),
          ),
          if (!done)
            TextButton(
              onPressed: onAdd,
              style: TextButton.styleFrom(foregroundColor: Colors.white),
              child: Text(t('workout.rest.add')),
            ),
          TextButton(
            onPressed: onSkip,
            style: TextButton.styleFrom(foregroundColor: Colors.white, backgroundColor: Colors.white.withValues(alpha: 0.18), shape: const StadiumBorder()),
            child: Text(done ? t('common.ok') : t('workout.rest.skip')),
          ),
        ],
      ),
    );
  }
}

class _FinishSheet extends StatefulWidget {
  const _FinishSheet({required this.draft});
  final WorkoutDraft draft;
  @override
  State<_FinishSheet> createState() => _FinishSheetState();
}

class _FinishSheetState extends State<_FinishSheet> {
  late int _minutes = widget.draft.elapsedMinutes.clamp(1, 300);
  int _rpe = 8;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final d = widget.draft;
    final coach = context.store.s.coach.firstName;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(t('finish.title'), style: context.text.headlineSmall),
            const SizedBox(height: 4),
            Text(tn('finish.sub', d.doneSets, {'total': d.totalSets}), style: context.text.bodyMedium?.copyWith(color: c.muted)),
            const SizedBox(height: 20),
            Text(t('finish.duration'), style: context.text.titleSmall),
            const SizedBox(height: 8),
            Row(
              children: [
                _RoundBtn(icon: CupertinoIcons.minus, onTap: () => setState(() => _minutes = (_minutes - 5).clamp(1, 300))),
                Expanded(
                  child: Text(Fmt.minutes(_minutes), textAlign: TextAlign.center, style: context.text.headlineSmall),
                ),
                _RoundBtn(icon: CupertinoIcons.plus, onTap: () => setState(() => _minutes = (_minutes + 5).clamp(1, 300))),
              ],
            ),
            const SizedBox(height: 20),
            Text(t('finish.rpe'), style: context.text.titleSmall),
            const SizedBox(height: 8),
            Row(
              children: [
                for (final n in [6, 7, 8, 9, 10])
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: Pressable(
                        onTap: () => setState(() => _rpe = n),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          height: 48,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: _rpe == n ? Tokens.fill : c.surface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: _rpe == n ? Colors.transparent : c.line),
                          ),
                          child: Text(
                            '$n',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: _rpe == n ? Colors.white : c.text),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(t('rpe.$_rpe'), textAlign: TextAlign.center, style: context.text.bodySmall),
            const SizedBox(height: 22),
            PrimaryButton(
              t('finish.save', {'name': coach}),
              icon: CupertinoIcons.paperplane_fill,
              onPressed: d.doneSets == 0
                  ? null
                  : () {
                      final log = d.toLog(minutes: _minutes, rpe: _rpe);
                      context.store.logWorkout(log);
                      HapticFeedback.heavyImpact();
                      Navigator.pop(context, log);
                    },
            ),
            if (d.doneSets == 0) ...[
              const SizedBox(height: 8),
              Text(
                t('finish.none'),
                textAlign: TextAlign.center,
                style: context.text.bodySmall?.copyWith(color: c.warn),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RoundBtn extends StatelessWidget {
  const _RoundBtn({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    child: Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(color: context.c.primarySoft, shape: BoxShape.circle),
      child: Icon(icon, color: context.c.primary),
    ),
  );
}

/// After saving: what the session added up to, new bests, and muscles worked.
class SummaryScreen extends StatelessWidget {
  const SummaryScreen({super.key, required this.log});
  final WorkoutLog log;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.store.s;
    final before = s.logs.where((l) => l.id != log.id).toList();
    final prs = <(String, LoggedSet, double)>[];
    for (final e in log.entries) {
      final b = bestSet(e.sets);
      if (b == null) continue;
      final prev = before.fold(0.0, (a, l) {
        for (final x in l.entries) {
          if (x.exerciseName == e.exerciseName) {
            for (final st in x.sets) {
              final v = e1rm(st.weight, st.reps);
              if (v > a) a = v;
            }
          }
        }
        return a;
      });
      final v = e1rm(b.weight, b.reps);
      if (prev > 0 && v > prev + 0.01) prs.add((e.exerciseName, b, v));
    }
    final raw = setsByMuscle([log]);
    final hi = raw.values.fold(0.0, (a, b) => b > a ? b : a);
    final levels = hi == 0 ? raw : raw.map((g, v) => MapEntry(g, v / hi));
    final bottom = MediaQuery.paddingOf(context).bottom;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: c.bg,
        body: ListView(
          padding: EdgeInsets.zero,
          children: [
            Container(
              decoration: const BoxDecoration(
                gradient: Tokens.brandGradient,
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(36)),
              ),
              padding: EdgeInsets.fromLTRB(24, MediaQuery.paddingOf(context).top + 36, 24, 32),
              child: Column(
                children: [
                  TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0.4, end: 1),
                    duration: const Duration(milliseconds: 700),
                    curve: Curves.elasticOut,
                    builder: (_, v, child) => Transform.scale(scale: v, child: child),
                    child: Container(
                      width: 84,
                      height: 84,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.18)),
                      child: const Icon(CupertinoIcons.checkmark_alt, color: Colors.white, size: 46),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    t('summary.title'),
                    textAlign: TextAlign.center,
                    style: context.text.headlineMedium?.copyWith(color: Colors.white),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    t('summary.sub', {'name': s.coach.firstName}),
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 15),
                  ),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(16, 18, 16, bottom + 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: StatTile(label: t('summary.time'), value: Fmt.minutes(log.durationMin), icon: CupertinoIcons.time),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: StatTile(label: t('summary.sets'), value: Fmt.number(log.setCount), icon: CupertinoIcons.square_stack_3d_up_fill),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: StatTile(
                          label: t('summary.volume'),
                          value: Fmt.number(log.volume, digits: 0),
                          unit: t('unit.kg'),
                          icon: CupertinoIcons.chart_bar_fill,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: StatTile(label: t('summary.rpe'), value: Fmt.number(log.rpe), icon: CupertinoIcons.bolt_fill),
                      ),
                    ],
                  ),
                  if (prs.isNotEmpty) ...[
                    SectionHeader(tn('summary.prs', prs.length)),
                    for (final (name, set, v) in prs) ...[
                      AppCard(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            const Icon(CupertinoIcons.star_circle_fill, color: Color(0xFFF5B400), size: 30),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(name, style: context.text.titleSmall),
                                  Text(t('summary.prLine', {'set': setLabel(set), 'e1rm': Fmt.kg(v.roundToDouble())}), style: context.text.bodySmall),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                  ],
                  if (levels.isNotEmpty) ...[
                    SectionHeader(t('summary.muscles')),
                    AppCard(
                      child: Row(
                        children: [
                          Expanded(
                            child: MuscleMap(view: BodyView.front, levels: levels, height: 220),
                          ),
                          Expanded(
                            child: MuscleMap(view: BodyView.back, levels: levels, height: 220),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  PrimaryButton(t('common.done'), onPressed: () => Navigator.of(context).pop()),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A logged session, read-only.
class LogSheet extends StatelessWidget {
  const LogSheet({super.key, required this.log});
  final WorkoutLog log;

  static Future<void> open(BuildContext context, WorkoutLog log) => showAppSheet(context, (_) => LogSheet(log: log));

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      builder: (_, scroll) => ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
        children: [
          Text(log.dayName, style: context.text.headlineSmall),
          const SizedBox(height: 4),
          Text(
            t('log.sub', {'day': Fmt.relativeDay(log.date), 'min': Fmt.minutes(log.durationMin), 'rpe': log.rpe}),
            style: context.text.bodyMedium?.copyWith(color: c.muted),
          ),
          const SizedBox(height: 16),
          for (final e in log.entries) ...[
            AppCard(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text(e.exerciseName, style: context.text.titleSmall)),
                      if (e.pain == true) Pill(t('workout.pain'), icon: CupertinoIcons.bandage, color: c.error, background: c.errorSoft),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final s in e.sets) Pill(setLabel(s), background: c.surface2, color: c.text),
                      if (e.cardio != null) Pill(cardioLine(e.cardio!), icon: Sym.heart, background: c.successSoft, color: c.text),
                    ],
                  ),
                  if (e.note != null && e.note!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('“${e.note}”', style: context.text.bodySmall?.copyWith(fontStyle: FontStyle.italic)),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}
