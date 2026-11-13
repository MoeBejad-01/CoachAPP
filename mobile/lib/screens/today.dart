// Today: the week at a glance, today's session, what the coach is waiting
// for (check-in, InBody scan, replies) and this week's targets.

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:material_ui/material_ui.dart';

import '../app/format.dart';
import '../app/l10n.dart';
import '../app/theme.dart';
import '../data/draft.dart';
import '../data/models.dart';
import '../data/schedule.dart';
import '../data/store.dart';
import '../widgets/barbell.dart';
import '../widgets/glyph.dart';
import '../widgets/ui.dart';
import 'cardio.dart';
import 'checkin.dart';
import 'habits.dart';
import 'inbody.dart';
import 'shell.dart';
import 'skip.dart';
import 'train.dart';
import 'workout.dart';

class TodayScreen extends StatefulWidget {
  const TodayScreen({super.key});
  @override
  State<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends State<TodayScreen> {
  String _day = Day.today;

  String _greeting() {
    final h = DateTime.now().hour;
    return h < 12 ? 'today.morning' : (h < 17 ? 'today.afternoon' : 'today.evening');
  }

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final s = context.store.s;
        final week = weekPlan(s);
        final selected = week.firstWhere((d) => d.date == _day, orElse: () => week.firstWhere((d) => d.isToday));
        return TabPage(
          subtitle: Fmt.longDay(DateTime.now()),
          title: t(_greeting(), {'name': s.trainee.firstName}),
          children: [
            const SizedBox(height: 12),
            _WeekStrip(week: week, selected: selected.date, onSelect: (d) => setState(() => _day = d)),
            const SizedBox(height: 14),
            _SessionCard(plan: selected),
            const HabitsCard(),
            ..._tasks(context, s),
            SectionHeader(t('today.week.title')),
            _WeekBarbell(week: week),
            const SizedBox(height: 10),
            const CardioWeekCard(showList: false),
            _Targets(s: s),
            if (s.trainee.goals.isNotEmpty) _Goals(goals: s.trainee.goals),
          ],
        );
      },
    );
  }

  List<Widget> _tasks(BuildContext context, Snapshot s) {
    final items = <Widget>[];
    final ci = checkinStatus(s);
    if (ci != null && ci.due) {
      final today = ci.since == Day.today;
      items.add(
        _Task(
          icon: Sym.checkin,
          tone: Tone.blue,
          title: t('task.checkin.title'),
          body: today ? t('task.checkin.today', {'name': s.coach.firstName}) : t('task.checkin.late', {'day': Fmt.weekdayShort(Day.date(ci.since))}),
          action: t('task.checkin.action'),
          onTap: () => CheckInSheet.open(context),
        ),
      );
    }
    final ib = pendingInBody(s);
    if (ib != null) {
      items.add(
        _Task(
          icon: Sym.inbody,
          tone: Tone.sky,
          title: t('task.inbody.title', {'name': s.coach.firstName}),
          body: ib.note.isEmpty ? t('task.inbody.body') : '“${ib.note}”',
          action: t('task.inbody.action'),
          onTap: () => InBodySheet.open(context, request: ib),
        ),
      );
    }
    final unread = unseenFromCoach(s);
    if (unread > 0) {
      final last = s.messages.lastWhere((m) => m.fromCoach);
      items.add(
        _Task(
          icon: Sym.chat,
          tone: Tone.green,
          title: tn('task.messages.title', unread, {'name': s.coach.firstName}),
          body: last.text,
          action: t('task.messages.action'),
          onTap: () => AppShell.go(context, AppTab.coach),
        ),
      );
    }
    final now = DateTime.now();
    final upcoming = s.sessions.where((x) => x.startDate.isAfter(now) && x.startDate.difference(now).inDays < 14).toList();
    if (upcoming.isNotEmpty) {
      final next = upcoming.first;
      items.add(
        _Task(
          icon: next.location == 'Video call' ? Sym.video : Sym.session,
          tone: Tone.navy,
          title: next.title,
          body: t('task.session.body', {
            'day': Fmt.relativeDay(Day.iso(next.startDate)),
            'time': Fmt.time(next.startDate),
            'where': t('location.${next.location.replaceAll(' ', '').toLowerCase()}'),
          }),
        ),
      );
    }
    if (items.isEmpty) return [];
    return [
      SectionHeader(t('today.todo')),
      ...items.expand((w) => [w, const SizedBox(height: 10)]),
    ];
  }
}

class _WeekStrip extends StatelessWidget {
  const _WeekStrip({required this.week, required this.selected, required this.onSelect});
  final List<DayPlan> week;
  final String selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Row(
      children: [
        for (final d in week)
          Expanded(
            child: Pressable(
              onTap: () => onSelect(d.date),
              semanticLabel: Fmt.day(d.date),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                margin: const EdgeInsets.symmetric(horizontal: 2.5),
                padding: const EdgeInsets.symmetric(vertical: 10),
                // Today is filled blue when selected; another selected day gets a soft blue outline.
                decoration: BoxDecoration(
                  color: d.date == selected ? (d.isToday ? Tokens.fill : c.primarySoft) : c.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: d.date == selected && !d.isToday ? c.primary : (d.isToday && d.date != selected ? c.primary.withValues(alpha: 0.6) : Colors.transparent),
                    width: d.date == selected && !d.isToday ? 2 : 1.5,
                  ),
                ),
                child: Column(
                  children: [
                    Text(
                      Fmt.weekdayTiny(Day.date(d.date)),
                      maxLines: 1,
                      overflow: TextOverflow.clip,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: d.date == selected && d.isToday ? Colors.white.withValues(alpha: 0.85) : (d.date == selected ? c.primary : c.muted)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${Day.date(d.date).day}',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: d.date == selected && d.isToday ? Colors.white : (d.date == selected ? c.primary : c.text),
                      ),
                    ),
                    const SizedBox(height: 6),
                    _DayMark(d: d, onDark: d.date == selected && d.isToday),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _DayMark extends StatelessWidget {
  const _DayMark({required this.d, required this.onDark});
  final DayPlan d;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    if (d.skip != null && d.log == null) {
      return Icon(Icons.remove_circle_rounded, size: 14, color: onDark ? Colors.white70 : c.faint);
    }
    if (d.log != null || d.done) {
      return Icon(CupertinoIcons.checkmark_circle_fill, size: 14, color: onDark ? Tokens.glow : c.success);
    }
    if (d.planned != null) {
      // Missed sessions aren't failures: they're still to do this week.
      return Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: d.missed ? c.warn : null,
          border: d.missed ? null : Border.all(color: onDark ? Colors.white : c.primary, width: 1.8),
        ),
      );
    }
    if (d.isCheckin) {
      return Container(
        width: 6,
        height: 6,
        decoration: const BoxDecoration(shape: BoxShape.circle, color: Tokens.glow),
      );
    }
    return const SizedBox(height: 8);
  }
}

void _start(BuildContext context, ProgramDay day) {
  final store = context.store;
  if (store.draft == null) store.startDraft(WorkoutDraft.fromDay(day, store.s.logs));
  WorkoutScreen.open(context);
}

/// The big card under the week strip. Training days are flexible: a session
/// that wasn't done on its day stays "up next" until it's done.
class _SessionCard extends StatelessWidget {
  const _SessionCard({required this.plan});
  final DayPlan plan;

  @override
  Widget build(BuildContext context) {
    final store = context.store;
    final s = store.s;
    final tr = s.trainee;
    if (tr.program == null) {
      return AppCard(
        child: EmptyState(icon: CupertinoIcons.hammer, title: t('today.noProgram.title'), body: t('today.noProgram.body', {'name': s.coach.firstName})),
      );
    }
    final wk = programWeek(tr, plan.date);
    final weekLabel = wk == null ? null : t('today.weekOf', {'n': wk, 'total': tr.program!.weeks});

    // Another day picked in the strip.
    if (!plan.isToday) {
      final day = plan.planned;
      if (plan.log != null) return _LogCard(log: plan.log!);
      if (day == null) {
        return _Note(icon: Sym.rest, tone: Tone.indigo, eyebrow: Fmt.relativeDay(plan.date), title: t('today.rest.title'), body: t('today.rest.body'));
      }
      if (plan.skip != null) {
        final k = plan.skip!;
        return _Note(
          icon: Sym.skip,
          tone: Tone.orange,
          eyebrow: Fmt.relativeDay(plan.date),
          title: day.name,
          body: [skipLabel(k), if (k.note != null && k.note!.isNotEmpty) '“${k.note}”'].join('\n'),
          action: t('skip.undo'),
          actionIcon: CupertinoIcons.arrow_uturn_left,
          onAction: () => store.unskip(k.id),
        );
      }
      if (plan.doneOn != null) {
        return _Note(
          icon: Sym.done,
          tone: Tone.green,
          eyebrow: Fmt.relativeDay(plan.date),
          title: day.name,
          body: t('today.movedDone', {'day': Fmt.weekdayShort(Day.date(plan.doneOn!))}),
        );
      }
      if (plan.isPast) {
        return _Hero(
          day: day,
          eyebrow: t('today.catchUp', {'day': Fmt.weekdayShort(Day.date(plan.date))}),
          action: t('today.doNow'),
          onAction: () => _start(context, day),
          onSkip: store.draft != null ? null : () => SkipSheet.open(context, day: day, plannedFor: plan.date, canMove: false),
          skipLabel: t('skip.skip'),
        );
      }
      return _Hero(
        day: day,
        eyebrow: [Fmt.relativeDay(plan.date), ?weekLabel].join(' · '),
        action: t('today.preview'),
        icon: CupertinoIcons.eye,
        onAction: () => DayScreen.open(context, day, date: plan.date),
      );
    }

    // Today.
    final todayLog = s.logs.where((l) => l.date == Day.today).lastOrNull;
    if (todayLog != null) return _LogCard(log: todayLog);
    final next = upNext(s);
    if (next == null) return _Note(icon: Sym.trophy, tone: Tone.gold, eyebrow: weekLabel ?? '', title: t('today.weekDone'), body: t('today.weekDoneBody'));
    final due = next.plannedFor.compareTo(Day.today) <= 0;
    final resume = store.draft != null;
    if (due && store.skipped.contains(Day.today)) {
      return _Note(
        icon: Sym.calendar,
        tone: Tone.blue,
        eyebrow: t('date.today'),
        title: t('today.skipped'),
        body: t('today.skippedBody', {'day': next.day.name}),
        action: t('today.trainAnyway'),
        onAction: store.undoSkip,
      );
    }
    if (due) {
      return _Hero(
        day: next.day,
        eyebrow: next.overdue ? t('today.catchUp', {'day': Fmt.weekdayShort(Day.date(next.plannedFor))}) : [t('date.today'), ?weekLabel].join(' · '),
        action: resume ? t('today.resume') : t('today.start'),
        onAction: () => _start(context, next.day),
        onSkip: resume ? null : () => SkipSheet.open(context, day: next.day, plannedFor: next.plannedFor),
      );
    }
    return _Note(
      icon: Sym.rest,
      tone: Tone.indigo,
      eyebrow: [t('date.today'), ?weekLabel].join(' · '),
      title: t('today.rest.title'),
      body: t('today.rest.next', {'day': next.day.name, 'when': Fmt.relativeDay(next.plannedFor)}),
      action: t('today.trainInstead', {'day': next.day.name}),
      onAction: () => _start(context, next.day),
    );
  }
}

/// A session to do (gradient card).
class _Hero extends StatelessWidget {
  const _Hero({required this.day, required this.eyebrow, required this.action, required this.onAction, this.icon = CupertinoIcons.play_fill, this.onSkip, this.skipLabel});
  final ProgramDay day;
  final String eyebrow, action;
  final IconData icon;
  final VoidCallback onAction;
  final VoidCallback? onSkip;

  /// Label for the skip link ("Can't make it?" by default).
  final String? skipLabel;

  @override
  Widget build(BuildContext context) {
    final sets = day.exercises.fold(0, (a, e) => a + e.sets);
    return AppCard(
      gradient: Tokens.brandGradient,
      padding: EdgeInsets.zero,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Tokens.r),
        child: Stack(
          children: [
            Positioned(
              right: -30,
              top: -10,
              child: Opacity(
                opacity: 0.16,
                child: SizedBox(width: 200, child: Barbell(plates: platesFor(4), loaded: 4, height: 110, onDark: true)),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Eyebrow(eyebrow, color: Colors.white.withValues(alpha: 0.85)),
                  const SizedBox(height: 6),
                  Text(day.name, style: context.text.headlineMedium?.copyWith(color: Colors.white)),
                  const SizedBox(height: 6),
                  Text(
                    t('today.sessionSub', {'n': day.exercises.length, 'sets': sets, 'min': estimateMinutes(day)}),
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 15),
                  ),
                  const SizedBox(height: 14),
                  for (final e in day.exercises.take(4))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(shape: BoxShape.circle, color: Tokens.glow),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              e.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w500),
                            ),
                          ),
                          Text(
                            isCardioExercise(e.name) ? ltr(e.reps) : ltr('${e.sets} × ${e.reps}'),
                            style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                  if (day.exercises.length > 4)
                    Text(tn('today.more', day.exercises.length - 4), style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 13)),
                  const SizedBox(height: 16),
                  PrimaryButton(action, light: true, icon: icon, onPressed: onAction),
                  if (onSkip != null)
                    Center(
                      child: TextButton(
                        onPressed: onSkip,
                        style: TextButton.styleFrom(foregroundColor: Colors.white),
                        child: Text(skipLabel ?? t('today.cantMake'), style: const TextStyle(fontWeight: FontWeight.w600)),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A session already logged.
class _LogCard extends StatelessWidget {
  const _LogCard({required this.log});
  final WorkoutLog log;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Eyebrow('${t('today.done')} · ${Fmt.relativeDay(log.date)}', color: c.success),
          const SizedBox(height: 6),
          Text(log.dayName, style: context.text.headlineMedium),
          const SizedBox(height: 6),
          Text(
            t('today.loggedSub', {'min': Fmt.minutes(log.durationMin), 'rpe': log.rpe, 'sets': log.setCount}),
            style: TextStyle(color: c.muted, fontSize: 15),
          ),
          const SizedBox(height: 12),
          for (final e in log.entries.take(4))
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Icon(CupertinoIcons.checkmark_alt, size: 15, color: c.success),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(e.exerciseName, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.bodyLarge),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 8),
          SecondaryButton(t('today.viewLog'), icon: CupertinoIcons.doc_text, onPressed: () => LogSheet.open(context, log)),
        ],
      ),
    );
  }
}

/// Rest day, week complete, "not today" and other quiet states.
class _Note extends StatelessWidget {
  const _Note({
    required this.icon,
    required this.tone,
    required this.eyebrow,
    required this.title,
    required this.body,
    this.action,
    this.onAction,
    this.actionIcon = CupertinoIcons.play_fill,
  });
  final IconData icon;
  final Tone tone;
  final IconData actionIcon;
  final String eyebrow, title, body;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => AppCard(
    padding: const EdgeInsets.all(20),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Glyph(icon, tone: tone, size: 52),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (eyebrow.isNotEmpty) Eyebrow(eyebrow),
                  const SizedBox(height: 4),
                  Text(title, style: context.text.titleLarge),
                  const SizedBox(height: 4),
                  Text(body, style: context.text.bodyMedium?.copyWith(color: context.c.muted)),
                ],
              ),
            ),
          ],
        ),
        if (action != null) ...[const SizedBox(height: 14), SecondaryButton(action!, icon: actionIcon, onPressed: onAction)],
      ],
    ),
  );
}

class _WeekBarbell extends StatelessWidget {
  const _WeekBarbell({required this.week});
  final List<DayPlan> week;

  @override
  Widget build(BuildContext context) {
    final planned = week.where((d) => d.planned != null).length;
    final done = week.where((d) => d.log != null).length;
    final plates = platesFor(planned == 0 ? context.store.s.trainee.frequency : planned);
    final loaded = done.clamp(0, plates.length);
    final adh = adherence(context.store.s);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                // The section header above already says "This week".
                child: Text(tn('today.week.sub', done, {'total': planned}), style: context.text.titleMedium),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(Fmt.kg(barbellTotal(plates, loaded)), style: context.text.titleLarge?.copyWith(color: context.c.primary)),
                  Text(t('today.week.onBar'), style: context.text.bodySmall),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          Barbell(plates: plates, loaded: loaded, height: 84),
          const SizedBox(height: 12),
          Text(done >= planned && planned > 0 ? t('today.week.full') : t('today.week.hint'), style: context.text.bodySmall),
          if (adh != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: ProgressBar(adh / 100, height: 6)),
                const SizedBox(width: 10),
                Text(t('today.adherence', {'n': adh}), style: context.text.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _Task extends StatelessWidget {
  const _Task({required this.icon, required this.tone, required this.title, required this.body, this.action, this.onTap});
  final IconData icon;
  final Tone tone;
  final String title, body;
  final String? action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => AppCard(
    padding: const EdgeInsets.all(16),
    onTap: onTap,
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Glyph(icon, tone: tone, size: 42),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: context.text.titleSmall),
              const SizedBox(height: 3),
              // Often the coach's own words (a request note, a message).
              FreeText(
                body,
                alignToScreen: true,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: context.text.bodyMedium?.copyWith(color: context.c.muted),
              ),
              if (action != null) ...[
                const SizedBox(height: 8),
                Text(
                  action!,
                  style: TextStyle(color: context.c.link, fontWeight: FontWeight.w600, fontSize: 14),
                ),
              ],
            ],
          ),
        ),
      ],
    ),
  );
}

class _Targets extends StatelessWidget {
  const _Targets({required this.s});
  final Snapshot s;

  @override
  Widget build(BuildContext context) {
    final w = weekOf(s.trainee, Day.today);
    if (w == null) return const SizedBox.shrink();
    final k = w.targets;
    final chips = <(IconData, String, String)>[
      if (k.bodyWeightKg != null) (CupertinoIcons.gauge, t('target.weight'), Fmt.kg(k.bodyWeightKg!)),
      if (k.sleepH != null) (CupertinoIcons.moon_fill, t('target.sleep'), t('unit.hValue', {'v': k.sleepH!})),
      if (k.proteinG != null) (CupertinoIcons.circle_grid_hex_fill, t('target.protein'), t('unit.gValue', {'v': k.proteinG!})),
      if (k.calories != null) (CupertinoIcons.flame_fill, t('target.calories'), t('unit.kcalValue', {'v': k.calories!})),
      if (k.steps != null) (CupertinoIcons.person_crop_circle_badge_checkmark, t('target.steps'), Fmt.number(k.steps!)),
    ];
    if (k.focus.isEmpty && chips.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(t('today.targets')),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (k.focus.isNotEmpty) ...[
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(CupertinoIcons.scope, size: 18, color: context.c.primary),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(k.focus, style: context.text.bodyLarge?.copyWith(fontWeight: FontWeight.w500)),
                    ),
                  ],
                ),
                if (chips.isNotEmpty) const SizedBox(height: 16),
              ],
              GridView.count(
                padding: EdgeInsets.zero,
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 2.6,
                children: [
                  for (final (icon, label, value) in chips)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(color: context.c.surface2, borderRadius: BorderRadius.circular(Tokens.rSmall)),
                      child: Row(
                        children: [
                          Icon(icon, size: 16, color: context.c.muted),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.bodySmall?.copyWith(fontSize: 12)),
                                Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.titleSmall),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Goals extends StatelessWidget {
  const _Goals({required this.goals});
  final List<Goal> goals;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      SectionHeader(t('today.goals')),
      AppCard(
        child: Column(
          children: [
            for (var i = 0; i < goals.length; i++) ...[if (i > 0) const SizedBox(height: 18), GoalRow(goal: goals[i])],
          ],
        ),
      ),
    ],
  );
}

class GoalRow extends StatelessWidget {
  const GoalRow({super.key, required this.goal});
  final Goal goal;

  @override
  Widget build(BuildContext context) {
    String v(double x) => '${Fmt.number(x)} ${goal.unit}';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text(goal.label, style: context.text.titleSmall)),
            Text(Fmt.percent(goal.progress * 100), style: context.text.titleSmall?.copyWith(color: context.c.primary)),
          ],
        ),
        const SizedBox(height: 8),
        ProgressBar(goal.progress),
        const SizedBox(height: 6),
        Row(
          children: [
            Text(v(goal.start), style: context.text.bodySmall),
            const Spacer(),
            Text(
              t('goal.now', {'v': v(goal.current)}),
              style: context.text.bodySmall?.copyWith(fontWeight: FontWeight.w600, color: context.c.text2),
            ),
            const Spacer(),
            Text(v(goal.target), style: context.text.bodySmall),
          ],
        ),
      ],
    );
  }
}
