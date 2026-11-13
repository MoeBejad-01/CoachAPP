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
import '../widgets/ui.dart';
import 'checkin.dart';
import 'inbody.dart';
import 'shell.dart';
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
          trailing: const SyncDot(),
          children: [
            const SizedBox(height: 12),
            _WeekStrip(week: week, selected: selected.date, onSelect: (d) => setState(() => _day = d)),
            const SizedBox(height: 14),
            _SessionCard(plan: selected),
            const SizedBox(height: 14),
            _WeekBarbell(week: week),
            ..._tasks(context, s),
            _Targets(s: s),
            if (s.trainee.goals.isNotEmpty) _Goals(goals: s.trainee.goals),
          ],
        );
      },
    );
  }

  List<Widget> _tasks(BuildContext context, Snapshot s) {
    final c = context.c;
    final items = <Widget>[];
    final ci = checkinStatus(s);
    if (ci != null && ci.due) {
      final today = ci.since == Day.today;
      items.add(
        _Task(
          icon: CupertinoIcons.square_list,
          color: c.primary,
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
          icon: CupertinoIcons.waveform_path_ecg,
          color: Tokens.accent,
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
          icon: CupertinoIcons.chat_bubble_text_fill,
          color: c.success,
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
          icon: next.location == 'Video call' ? CupertinoIcons.video_camera_solid : CupertinoIcons.person_2_fill,
          color: Tokens.brand,
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
                decoration: BoxDecoration(
                  color: d.date == selected ? (d.isToday ? Tokens.fill : c.text) : c.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: d.isToday && d.date != selected ? c.primary : Colors.transparent, width: 1.5),
                ),
                child: Column(
                  children: [
                    Text(
                      Fmt.weekdayTiny(Day.date(d.date)),
                      maxLines: 1,
                      overflow: TextOverflow.clip,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: d.date == selected ? Colors.white.withValues(alpha: 0.8) : c.muted),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${Day.date(d.date).day}',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: d.date == selected ? (c.dark && !d.isToday ? c.bg : Colors.white) : c.text,
                      ),
                    ),
                    const SizedBox(height: 6),
                    _DayMark(d: d, onDark: d.date == selected),
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
    if (d.log != null) {
      return Icon(CupertinoIcons.checkmark_circle_fill, size: 14, color: onDark ? Tokens.glow : c.success);
    }
    if (d.planned != null) {
      return Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: d.missed ? (onDark ? Colors.white38 : c.line) : null,
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

class _SessionCard extends StatelessWidget {
  const _SessionCard({required this.plan});
  final DayPlan plan;

  @override
  Widget build(BuildContext context) {
    final store = context.store;
    final s = store.s;
    final t0 = s.trainee;
    final day = plan.planned;
    final wk = programWeek(t0, plan.date);
    final eyebrow = [
      Fmt.relativeDay(plan.date),
      if (wk != null && t0.program != null) t('today.weekOf', {'n': wk, 'total': t0.program!.weeks}),
    ].join(' · ');

    if (t0.program == null) {
      return AppCard(
        child: EmptyState(icon: CupertinoIcons.hammer, title: t('today.noProgram.title'), body: t('today.noProgram.body', {'name': s.coach.firstName})),
      );
    }

    // Rest day.
    if (day == null) {
      final next = nextSession(s);
      return AppCard(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(color: context.c.tint, borderRadius: BorderRadius.circular(16)),
              child: Icon(CupertinoIcons.moon_stars_fill, color: context.c.primary, size: 26),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Eyebrow(eyebrow),
                  const SizedBox(height: 4),
                  Text(t('today.rest.title'), style: context.text.titleLarge),
                  const SizedBox(height: 4),
                  Text(
                    next == null ? t('today.rest.body') : t('today.rest.next', {'day': next.day.name, 'when': Fmt.relativeDay(next.date)}),
                    style: context.text.bodyMedium?.copyWith(color: context.c.muted),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final log = plan.log;
    final draft = store.draft;
    final mins = estimateMinutes(day);
    final sets = day.exercises.fold(0, (a, e) => a + e.sets);
    final canStart = plan.isToday || plan.missed;

    return AppCard(
      gradient: log == null ? Tokens.brandGradient : null,
      padding: EdgeInsets.zero,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Tokens.r),
        child: Stack(
          children: [
            if (log == null)
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
                  Eyebrow(
                    log != null ? t('today.done') : (plan.missed ? t('today.missed') : eyebrow),
                    color: log == null ? Colors.white.withValues(alpha: 0.85) : context.c.success,
                  ),
                  const SizedBox(height: 6),
                  Text(day.name, style: context.text.headlineMedium?.copyWith(color: log == null ? Colors.white : null)),
                  const SizedBox(height: 6),
                  Text(
                    log != null
                        ? t('today.loggedSub', {'min': Fmt.minutes(log.durationMin), 'rpe': log.rpe, 'sets': log.setCount})
                        : t('today.sessionSub', {'n': day.exercises.length, 'sets': sets, 'min': mins}),
                    style: TextStyle(color: log == null ? Colors.white.withValues(alpha: 0.85) : context.c.muted, fontSize: 15),
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
                            decoration: BoxDecoration(shape: BoxShape.circle, color: log == null ? Tokens.glow : context.c.primary),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              e.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(color: log == null ? Colors.white : context.c.text, fontSize: 15, fontWeight: FontWeight.w500),
                            ),
                          ),
                          Text(
                            ltr('${e.sets} × ${e.reps}'),
                            style: TextStyle(color: log == null ? Colors.white.withValues(alpha: 0.75) : context.c.muted, fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                  if (day.exercises.length > 4)
                    Text(
                      tn('today.more', day.exercises.length - 4),
                      style: TextStyle(color: log == null ? Colors.white.withValues(alpha: 0.7) : context.c.muted, fontSize: 13),
                    ),
                  const SizedBox(height: 16),
                  if (log != null)
                    SecondaryButton(t('today.viewLog'), icon: CupertinoIcons.doc_text, onPressed: () => LogSheet.open(context, log))
                  else if (canStart)
                    PrimaryButton(
                      draft != null ? t('today.resume') : t('today.start'),
                      light: true,
                      icon: CupertinoIcons.play_fill,
                      onPressed: () {
                        if (draft == null) store.startDraft(WorkoutDraft.fromDay(day, s.logs));
                        WorkoutScreen.open(context);
                      },
                    )
                  else
                    PrimaryButton(
                      t('today.preview'),
                      light: true,
                      icon: CupertinoIcons.eye,
                      onPressed: () => DayScreen.open(context, day, date: plan.date),
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t('today.week.title'), style: context.text.titleMedium),
                    const SizedBox(height: 2),
                    Text(tn('today.week.sub', done, {'total': planned}), style: context.text.bodySmall),
                  ],
                ),
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
  const _Task({required this.icon, required this.color, required this.title, required this.body, this.action, this.onTap});
  final IconData icon;
  final Color color;
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
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: context.text.titleSmall),
              const SizedBox(height: 3),
              Text(
                body,
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
