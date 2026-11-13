// Train: the program the coach assigned, week by week, and each day's
// exercises with the coach's cues and what the trainee lifted last time.

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:material_ui/material_ui.dart';

import '../app/format.dart';
import '../app/l10n.dart';
import '../app/theme.dart';
import '../data/draft.dart';
import '../data/models.dart';
import '../data/schedule.dart';
import '../data/store.dart';
import '../widgets/muscle_map.dart';
import '../widgets/anatomy_shapes.dart';
import '../widgets/ui.dart';
import 'shell.dart';
import 'workout.dart';

class TrainScreen extends StatefulWidget {
  const TrainScreen({super.key});
  @override
  State<TrainScreen> createState() => _TrainScreenState();
}

class _TrainScreenState extends State<TrainScreen> {
  int? _week;
  final _weeks = ScrollController();

  @override
  void initState() {
    super.initState();
    // Start with this week's chip in view.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final p = context.store.s.trainee.program;
      if (p == null || !_weeks.hasClients) return;
      final target = (weekIndex(p, Day.today) * 98.0 - 60).clamp(0.0, _weeks.position.maxScrollExtent);
      _weeks.jumpTo(target);
    });
  }

  @override
  void dispose() {
    _weeks.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final s = context.store.s;
        final p = s.trainee.program;
        if (p == null || p.plan.isEmpty) {
          return TabPage(
            title: t('tab.train'),
            children: [
              AppCard(
                child: EmptyState(icon: CupertinoIcons.hammer, title: t('today.noProgram.title'), body: t('today.noProgram.body', {'name': s.coach.firstName})),
              ),
            ],
          );
        }
        final current = weekIndex(p, Day.today);
        final i = (_week ?? current).clamp(0, p.plan.length - 1);
        final week = p.plan[i];
        final start = Day.add(p.startDate, i * 7);
        final slots = slotsFor(s.trainee);
        final progress = ((Day.between(p.startDate, Day.today) + 1) / (p.weeks * 7)).clamp(0.0, 1.0);

        return TabPage(
          title: t('tab.train'),
          children: [
            const SizedBox(height: 8),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Eyebrow(t('train.program')),
                  const SizedBox(height: 6),
                  Text(p.name, style: context.text.headlineSmall),
                  const SizedBox(height: 4),
                  Text(
                    t('train.programSub', {'week': current + 1, 'total': p.weeks, 'name': s.coach.name}),
                    style: context.text.bodyMedium?.copyWith(color: context.c.muted),
                  ),
                  const SizedBox(height: 14),
                  ProgressBar(progress),
                ],
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              height: 40,
              child: ListView.separated(
                controller: _weeks,
                scrollDirection: Axis.horizontal,
                itemCount: p.plan.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (_, w) => Pressable(
                  onTap: () => setState(() => _week = w),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: w == i ? Tokens.fill : context.c.surface,
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(color: w == current && w != i ? context.c.primary : Colors.transparent, width: 1.5),
                    ),
                    child: Text(
                      t('train.weekShort', {'n': w + 1}),
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: w == i ? Colors.white : (w < current ? context.c.muted : context.c.text),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            SectionHeader(i == current ? t('train.thisWeek') : t('train.weekN', {'n': i + 1}), action: Fmt.dayMonth(Day.date(start))),
            if (week.targets.focus.isNotEmpty) ...[
              AppCard(
                color: context.c.tint,
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(CupertinoIcons.scope, size: 18, color: context.c.primary),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(week.targets.focus, style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w500)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            for (var d = 0; d < week.days.length; d++) ...[
              _DayCard(
                day: week.days[d],
                dates: [
                  for (var k = 0; k < 7; k++)
                    if (slots.contains(Day.dow(Day.add(start, k))) && slots.indexOf(Day.dow(Day.add(start, k))) % week.days.length == d) Day.add(start, k),
                ],
                logs: s.logs,
              ),
              const SizedBox(height: 10),
            ],
          ],
        );
      },
    );
  }
}

class _DayCard extends StatelessWidget {
  const _DayCard({required this.day, required this.dates, required this.logs});
  final ProgramDay day;
  final List<String> dates;
  final List<WorkoutLog> logs;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final date = dates.isEmpty ? null : dates.first;
    final log = date == null ? null : logs.where((l) => l.date == date).firstOrNull;
    final (label, color) = switch ((log, date)) {
      (WorkoutLog _, _) => (t('train.status.done'), c.success),
      (_, String d) when d == Day.today => (t('train.status.today'), c.primary),
      (_, String d) when d.compareTo(Day.today) < 0 => (t('train.status.missed'), c.faint),
      _ => (date == null ? t('train.status.flex') : Fmt.weekdayShort(Day.date(date)), c.muted),
    };
    final muscles = setsByMuscleForDay(day);
    return AppCard(
      onTap: () => DayScreen.open(context, day, date: date),
      child: Row(
        children: [
          SizedBox(
            width: 44,
            child: MuscleMap(view: BodyView.front, levels: muscles, height: 74),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(day.name, style: context.text.titleMedium),
                const SizedBox(height: 3),
                Text(t('train.daySub', {'n': day.exercises.length, 'min': estimateMinutes(day)}), style: context.text.bodySmall),
                const SizedBox(height: 8),
                Pill(label, color: color, background: color.withValues(alpha: 0.12), icon: log != null ? CupertinoIcons.checkmark : null),
              ],
            ),
          ),
          Icon(CupertinoIcons.chevron_forward, size: 18, color: c.faint),
        ],
      ),
    );
  }
}

/// Relative work per muscle for one program day (0..1), for the mini body map.
Map<MuscleGroup, double> setsByMuscleForDay(ProgramDay day) {
  final raw = <MuscleGroup, double>{};
  for (final e in day.exercises) {
    musclesFor(e.name).forEach((g, w) => raw[g] = (raw[g] ?? 0) + w * e.sets);
  }
  final hi = raw.values.fold(0.0, (a, b) => b > a ? b : a);
  return hi == 0 ? raw : raw.map((g, v) => MapEntry(g, v / hi));
}

class DayScreen extends StatelessWidget {
  const DayScreen({super.key, required this.day, this.date});
  final ProgramDay day;
  final String? date;

  static void open(BuildContext context, ProgramDay day, {String? date}) => Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => DayScreen(day: day, date: date),
    ),
  );

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final store = context.store;
        final s = store.s;
        final c = context.c;
        final levels = setsByMuscleForDay(day);
        final front =
            levels.keys.any((g) => [MuscleGroup.chest, MuscleGroup.core].contains(g)) ||
            !levels.keys.any((g) => [MuscleGroup.back, MuscleGroup.glutes].contains(g));
        final bottom = MediaQuery.paddingOf(context).bottom;
        return Scaffold(
          appBar: AppBar(title: Text(day.name)),
          body: ListView(
            padding: EdgeInsets.fromLTRB(16, 8, 16, bottom + 100),
            children: [
              AppCard(
                child: Row(
                  children: [
                    SizedBox(
                      width: 90,
                      child: MuscleMap(view: front ? BodyView.front : BodyView.back, levels: levels, height: 150),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (date != null) Eyebrow(Fmt.relativeDay(date!)),
                          const SizedBox(height: 4),
                          Text(day.name, style: context.text.headlineSmall),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              Pill(tn('train.exercises', day.exercises.length), icon: CupertinoIcons.list_bullet),
                              Pill(t('train.aboutMin', {'n': estimateMinutes(day)}), icon: CupertinoIcons.time),
                              for (final g in levels.entries.where((e) => e.value >= 0.5).map((e) => e.key))
                                Pill(t('muscle.${g.name}'), color: c.primary, background: c.primarySoft),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              SectionHeader(t('train.exercisesTitle')),
              for (var i = 0; i < day.exercises.length; i++) ...[
                _ExerciseCard(index: i + 1, e: day.exercises[i], last: lastEntryFor(s.logs, day.exercises[i].id, day.exercises[i].name)),
                const SizedBox(height: 10),
              ],
            ],
          ),
          bottomSheet: Container(
            color: c.bg,
            padding: EdgeInsets.fromLTRB(16, 12, 16, bottom + 12),
            child: PrimaryButton(
              store.draft != null ? t('today.resume') : t('train.startThis'),
              icon: CupertinoIcons.play_fill,
              onPressed: () {
                if (store.draft == null) store.startDraft(WorkoutDraft.fromDay(day, s.logs));
                WorkoutScreen.open(context);
              },
            ),
          ),
        );
      },
    );
  }
}

class _ExerciseCard extends StatelessWidget {
  const _ExerciseCard({required this.index, required this.e, required this.last});
  final int index;
  final Exercise e;
  final LogEntry? last;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final best = last == null ? null : bestSet(last!.sets);
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 30,
            height: 30,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: c.primarySoft, shape: BoxShape.circle),
            child: Text(
              '$index',
              style: TextStyle(fontWeight: FontWeight.w700, color: c.primary),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(e.name, style: context.text.titleSmall),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    Pill(ltr('${e.sets} × ${e.reps}'), color: c.text, background: c.surface2),
                    if (e.intensity.isNotEmpty) Pill(e.intensity, background: c.surface2),
                    if (e.rest.isNotEmpty) Pill(t('train.rest', {'v': ltr(e.rest)}), icon: CupertinoIcons.timer, background: c.surface2),
                  ],
                ),
                if (e.cue.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    '“${e.cue}”',
                    style: context.text.bodyMedium?.copyWith(color: c.text2, fontStyle: FontStyle.italic),
                  ),
                ],
                if (best != null) ...[
                  const SizedBox(height: 8),
                  Text(t('train.lastTime', {'set': setLabel(best)}), style: context.text.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

String setLabel(LoggedSet s) => s.weight > 0 ? t('set.label', {'w': Fmt.number(s.weight), 'r': s.reps}) : t('set.bodyweight', {'r': s.reps});
