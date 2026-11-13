// Progress: muscles worked (the site's body map), strength trends and new
// bests, body weight and InBody scans, and weekly check-ins.

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:material_ui/material_ui.dart';

import '../app/format.dart';
import '../app/l10n.dart';
import '../app/theme.dart';
import '../data/models.dart';
import '../data/schedule.dart';
import '../data/store.dart';
import '../widgets/anatomy_shapes.dart';
import '../widgets/charts.dart';
import '../widgets/muscle_map.dart';
import '../widgets/ui.dart';
import 'checkin.dart';
import 'inbody.dart';
import 'shell.dart';
import 'train.dart';
import 'workout.dart';

enum _Section { strength, body, checkins }

class ProgressScreen extends StatefulWidget {
  const ProgressScreen({super.key});
  @override
  State<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends State<ProgressScreen> {
  _Section _section = _Section.strength;

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final s = context.store.s;
        return TabPage(
          title: t('tab.progress'),
          children: [
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: CupertinoSlidingSegmentedControl<_Section>(
                groupValue: _section,
                backgroundColor: context.c.dark ? context.c.surface2 : const Color(0x14767680),
                thumbColor: context.c.dark ? const Color(0xFF636366) : Colors.white,
                onValueChanged: (v) => setState(() => _section = v ?? _section),
                children: {
                  for (final v in _Section.values)
                    v: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 7),
                      child: Text(
                        t('progress.${v.name}'),
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: context.c.text),
                      ),
                    ),
                },
              ),
            ),
            const SizedBox(height: 8),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: KeyedSubtree(
                key: ValueKey(_section),
                child: switch (_section) {
                  _Section.strength => _Strength(s: s),
                  _Section.body => _Body(s: s),
                  _Section.checkins => _CheckIns(s: s),
                },
              ),
            ),
          ],
        );
      },
    );
  }
}

// ---------- Strength ----------

class _Strength extends StatefulWidget {
  const _Strength({required this.s});
  final Snapshot s;
  @override
  State<_Strength> createState() => _StrengthState();
}

class _StrengthState extends State<_Strength> {
  BodyView _view = BodyView.front;
  MuscleGroup? _picked;
  int _days = 7;

  @override
  Widget build(BuildContext context) {
    final s = widget.s;
    final c = context.c;
    if (s.logs.isEmpty) {
      return AppCard(
        child: EmptyState(icon: CupertinoIcons.chart_bar_alt_fill, title: t('progress.empty.title'), body: t('progress.empty.body')),
      );
    }
    final from = Day.add(Day.today, -_days + 1);
    final recent = s.logs.where((l) => l.date.compareTo(from) >= 0);
    final sets = setsByMuscle(recent);
    final hi = sets.values.fold(0.0, (a, b) => b > a ? b : a);
    final levels = hi == 0 ? sets : sets.map((g, v) => MapEntry(g, v / hi));
    final lifts = liftTrends(s.logs);
    final prs = prEvents(s.logs).reversed.take(6).toList();
    final vol = volumeByWeek(s.logs);
    final visible = anatomyMuscles[_view]!.keys.toList()..sort((a, b) => (sets[b] ?? 0).compareTo(sets[a] ?? 0));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(t('progress.muscles')),
        AppCard(
          child: Column(
            children: [
              Row(
                children: [
                  for (final d in [7, 28])
                    Padding(
                      padding: const EdgeInsetsDirectional.only(end: 6),
                      child: ChoiceChip(
                        label: Text(tn('progress.lastDays', d)),
                        selected: _days == d,
                        showCheckmark: false,
                        onSelected: (_) => setState(() => _days = d),
                        shape: const StadiumBorder(),
                        side: BorderSide.none,
                        selectedColor: c.primarySoft,
                        backgroundColor: c.surface2,
                        labelStyle: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: _days == d ? c.primary : c.text2),
                      ),
                    ),
                  const Spacer(),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(32, 32),
                    onPressed: () => setState(() {
                      _view = _view == BodyView.front ? BodyView.back : BodyView.front;
                      _picked = null;
                    }),
                    child: Row(
                      children: [
                        Icon(CupertinoIcons.arrow_2_circlepath, size: 16, color: c.link),
                        const SizedBox(width: 4),
                        Text(
                          t(_view == BodyView.front ? 'progress.showBack' : 'progress.showFront'),
                          style: TextStyle(color: c.link, fontSize: 14, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    flex: 5,
                    child: MuscleMap(
                      key: ValueKey(_view),
                      view: _view,
                      levels: levels,
                      selected: _picked,
                      height: 300,
                      onSelect: (g) => setState(() => _picked = g),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 4,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        for (final g in visible)
                          Pressable(
                            onTap: () => setState(() => _picked = _picked == g ? null : g),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 180),
                              margin: const EdgeInsets.only(bottom: 6),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              decoration: BoxDecoration(color: g == _picked ? c.primarySoft : Colors.transparent, borderRadius: BorderRadius.circular(10)),
                              child: Row(
                                children: [
                                  Container(
                                    width: 10,
                                    height: 10,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Color.lerp(c.anatMuscle, c.primary, (levels[g] ?? 0) == 0 ? 0 : 0.25 + (levels[g] ?? 0) * 0.75),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      t('muscle.${g.name}'),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
                                    ),
                                  ),
                                  Text(
                                    Fmt.number(sets[g] ?? 0, digits: 0),
                                    style: context.text.bodySmall?.copyWith(fontWeight: FontWeight.w700, color: c.text2),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        const SizedBox(height: 4),
                        Text(t('progress.setsHint'), style: context.text.bodySmall?.copyWith(fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (lifts.isNotEmpty) ...[
          SectionHeader(t('progress.lifts')),
          for (final l in lifts) ...[
            AppCard(
              padding: const EdgeInsets.all(16),
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LiftScreen(name: l.name))),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.titleSmall),
                        const SizedBox(height: 3),
                        Text(t('progress.liftSub', {'best': Fmt.kg(l.best.roundToDouble()), 'n': l.points.length}), style: context.text.bodySmall),
                      ],
                    ),
                  ),
                  Sparkline(l.points.map((p) => p.value).toList()),
                  const SizedBox(width: 10),
                  _Delta(from: l.first, to: l.latest),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
        ],
        SectionHeader(t('progress.volume')),
        AppCard(
          child: BarChart(
            points: [for (final w in vol) ChartPoint(w.volume, Fmt.dayMonth(Day.date(w.weekStart)).split(' ').first)],
            format: (v) => '${Fmt.number(v / 1000, digits: 1)}t',
          ),
        ),
        if (prs.isNotEmpty) ...[
          SectionHeader(t('progress.prs')),
          GroupCard(
            children: [
              for (final p in prs)
                RowTile(
                  icon: CupertinoIcons.star_fill,
                  iconColor: const Color(0xFFF5B400),
                  title: p.exercise,
                  subtitle: t('progress.prLine', {'set': setLabel(p.set), 'day': Fmt.relativeDay(p.date)}),
                  trailing: Text(
                    '+${Fmt.kg((p.e1rm - p.prev).roundToDouble())}',
                    style: TextStyle(color: c.success, fontWeight: FontWeight.w700),
                  ),
                ),
            ],
          ),
        ],
        SectionHeader(t('progress.history')),
        GroupCard(
          children: [
            for (final l in s.logs.reversed.take(8))
              RowTile(
                icon: CupertinoIcons.flame_fill,
                title: l.dayName,
                subtitle: t('progress.historyLine', {'day': Fmt.relativeDay(l.date), 'min': Fmt.minutes(l.durationMin), 'sets': l.setCount}),
                onTap: () => LogSheet.open(context, l),
              ),
          ],
        ),
      ],
    );
  }
}

class _Delta extends StatelessWidget {
  const _Delta({required this.from, required this.to});
  final double from, to;
  @override
  Widget build(BuildContext context) {
    final diff = to - from;
    final up = diff >= 0;
    final color = diff.abs() < 0.5 ? context.c.muted : (up ? context.c.success : context.c.warn);
    return Container(
      width: 64,
      alignment: AlignmentDirectional.centerEnd,
      child: Text(
        '${up ? '+' : '−'}${Fmt.number(diff.abs(), digits: 0)}',
        style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 15),
      ),
    );
  }
}

class LiftScreen extends StatelessWidget {
  const LiftScreen({super.key, required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final s = context.store.s;
        final l = liftTrends(s.logs, limit: 999).where((x) => x.name == name).firstOrNull;
        final c = context.c;
        final bottom = MediaQuery.paddingOf(context).bottom + 24;
        return Scaffold(
          appBar: AppBar(title: Text(name)),
          body: l == null
              ? const SizedBox.shrink()
              : ListView(
                  padding: EdgeInsets.fromLTRB(16, 8, 16, bottom),
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: StatTile(
                            label: t('lift.best'),
                            value: Fmt.number(l.best, digits: 0),
                            unit: t('unit.kg'),
                            icon: CupertinoIcons.star_fill,
                            tone: const Color(0xFFF5B400),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: StatTile(
                            label: t('lift.change'),
                            value: '${l.latest >= l.first ? '+' : '−'}${Fmt.number((l.latest - l.first).abs(), digits: 0)}',
                            unit: t('unit.kg'),
                            icon: CupertinoIcons.arrow_up_right,
                          ),
                        ),
                      ],
                    ),
                    SectionHeader(t('lift.chart')),
                    AppCard(
                      child: LineChart(
                        points: [for (final p in l.points) ChartPoint(p.value, Fmt.dayMonth(Day.date(p.date)))],
                        format: (v) => Fmt.number(v, digits: 0),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(t('lift.e1rmHint'), style: context.text.bodySmall),
                    SectionHeader(t('lift.sessions')),
                    GroupCard(
                      children: [
                        for (final p in l.points.reversed)
                          RowTile(
                            title: setLabel(p.set),
                            subtitle: Fmt.relativeDay(p.date),
                            trailing: Text(
                              Fmt.kg(p.value.roundToDouble()),
                              style: TextStyle(color: c.text2, fontWeight: FontWeight.w600),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
        );
      },
    );
  }
}

// ---------- Body ----------

class _Body extends StatelessWidget {
  const _Body({required this.s});
  final Snapshot s;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final w = s.weights;
    final goal =
        s.trainee.goals.where((g) => g.unit == 'kg' && g.label.toLowerCase().contains('weight')).firstOrNull ??
        s.trainee.goals.where((g) => g.unit == 'kg').firstOrNull;
    final target = weekOf(s.trainee, Day.today)?.targets.bodyWeightKg ?? goal?.target;
    final latest = w.isEmpty ? null : w.last;
    final monthAgo = w.where((x) => x.date.compareTo(Day.add(Day.today, -28)) <= 0).lastOrNull ?? (w.isEmpty ? null : w.first);
    final scans = s.inbody;
    final scan = scans.isEmpty ? null : scans.last;
    final prevScan = scans.length < 2 ? null : scans[scans.length - 2];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(t('body.weight'), action: t('body.logWeight'), onAction: () => WeightSheet.open(context)),
        if (latest == null)
          AppCard(
            child: EmptyState(icon: CupertinoIcons.gauge, title: t('body.noWeight'), action: t('body.logWeight'), onAction: () => WeightSheet.open(context)),
          )
        else
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(Fmt.number(latest.kg), style: context.text.displaySmall),
                    const SizedBox(width: 4),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(t('unit.kg'), style: context.text.titleSmall?.copyWith(color: c.muted)),
                    ),
                    const Spacer(),
                    if (monthAgo != null && monthAgo.date != latest.date)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${latest.kg >= monthAgo.kg ? '+' : '−'}${Fmt.kg((latest.kg - monthAgo.kg).abs())}',
                            style: context.text.titleSmall?.copyWith(color: c.primary),
                          ),
                          Text(t('body.since', {'day': Fmt.dayMonth(Day.date(monthAgo.date))}), style: context.text.bodySmall),
                        ],
                      ),
                  ],
                ),
                Text(t('body.lastWeighIn', {'day': Fmt.relativeDay(latest.date)}), style: context.text.bodySmall),
                const SizedBox(height: 12),
                LineChart(
                  points: [for (final x in w.length > 30 ? w.sublist(w.length - 30) : w) ChartPoint(x.kg, Fmt.dayMonth(Day.date(x.date)))],
                  goal: target,
                  format: (v) => Fmt.number(v),
                ),
                if (target != null) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Container(width: 14, height: 3, color: Tokens.glow),
                      const SizedBox(width: 6),
                      Text(t('body.target', {'v': Fmt.kg(target)}), style: context.text.bodySmall),
                    ],
                  ),
                ],
              ],
            ),
          ),
        SectionHeader(
          t('body.inbody'),
          action: t('body.addScan'),
          onAction: () => InBodySheet.open(context, request: pendingInBody(s)),
        ),
        if (scan == null)
          AppCard(
            child: EmptyState(
              icon: CupertinoIcons.waveform_path_ecg,
              title: t('body.noScan.title'),
              body: t('body.noScan.body'),
              action: t('body.addScan'),
              onAction: () => InBodySheet.open(context, request: pendingInBody(s)),
            ),
          )
        else ...[
          GridView.count(
            padding: EdgeInsets.zero,
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.55,
            children: [
              StatTile(
                label: t('inbody.muscle'),
                value: Fmt.number(scan.muscleKg),
                unit: t('unit.kg'),
                icon: CupertinoIcons.bolt_fill,
                caption: _change(prevScan?.muscleKg, scan.muscleKg),
              ),
              StatTile(
                label: t('inbody.fatPct'),
                value: Fmt.number(scan.fatPct),
                unit: '%',
                icon: CupertinoIcons.drop_fill,
                tone: Tokens.accent,
                caption: _change(prevScan?.fatPct, scan.fatPct),
              ),
              StatTile(
                label: t('inbody.score'),
                value: Fmt.number(scan.score, digits: 0),
                icon: CupertinoIcons.rosette,
                tone: c.success,
                caption: _change(prevScan?.score, scan.score),
              ),
              StatTile(
                label: t('inbody.visceral'),
                value: Fmt.number(scan.visceral, digits: 0),
                icon: CupertinoIcons.heart_fill,
                tone: c.error,
                caption: _change(prevScan?.visceral, scan.visceral),
              ),
            ],
          ),
          if (scans.length > 1) ...[
            const SizedBox(height: 10),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(t('inbody.trend'), style: context.text.titleSmall),
                  LineChart(height: 150, points: [for (final x in scans) ChartPoint(x.muscleKg, Fmt.dayMonth(Day.date(x.date)))], format: (v) => Fmt.number(v)),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),
          GroupCard(
            children: [
              for (final x in scans.reversed.take(5))
                RowTile(
                  icon: CupertinoIcons.doc_chart_fill,
                  title: Fmt.relativeDay(x.date),
                  subtitle: t('inbody.line', {'w': Fmt.kg(x.weightKg), 'm': Fmt.kg(x.muscleKg), 'f': Fmt.percent(x.fatPct)}),
                  trailing: x.fileName != null ? Icon(CupertinoIcons.paperclip, size: 16, color: c.faint) : null,
                ),
            ],
          ),
        ],
      ],
    );
  }

  String? _change(double? before, double now) {
    if (before == null) return null;
    final d = now - before;
    if (d.abs() < 0.05) return t('inbody.same');
    return t('inbody.vsLast', {'v': '${d > 0 ? '+' : '−'}${Fmt.number(d.abs())}'});
  }
}

// ---------- Check-ins ----------

class _CheckIns extends StatelessWidget {
  const _CheckIns({required this.s});
  final Snapshot s;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final list = s.checkins;
    final status = checkinStatus(s);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 18),
        AppCard(
          gradient: status != null && status.due ? Tokens.brandGradient : null,
          child: Row(
            children: [
              Icon(
                status != null && status.due ? CupertinoIcons.square_list : CupertinoIcons.checkmark_seal_fill,
                color: status != null && status.due ? Colors.white : c.success,
                size: 28,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      status != null && status.due ? t('task.checkin.title') : t('checkins.done'),
                      style: context.text.titleMedium?.copyWith(color: status != null && status.due ? Colors.white : null),
                    ),
                    Text(
                      t('checkins.day', {'day': Fmt.weekdayShort(Day.date(Day.add(Day.startOfWeek(Day.today), (s.trainee.checkinDay + 6) % 7)))}),
                      style: TextStyle(fontSize: 14, color: status != null && status.due ? Colors.white.withValues(alpha: 0.85) : c.muted),
                    ),
                  ],
                ),
              ),
              if (status != null && status.due)
                PrimaryButton(t('task.checkin.action'), light: true, expand: false, onPressed: () => CheckInSheet.open(context)),
            ],
          ),
        ),
        if (list.isEmpty)
          AppCard(
            child: EmptyState(icon: CupertinoIcons.square_list, title: t('checkins.empty')),
          )
        else ...[
          SectionHeader(t('checkins.trends')),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _Legend(items: [(t('checkin.sleep'), c.primary)]),
                LineChart(
                  height: 130,
                  color: c.primary,
                  points: [for (final x in list.length > 12 ? list.sublist(list.length - 12) : list) ChartPoint(x.sleepH, Fmt.dayMonth(Day.date(x.date)))],
                  format: (v) => t('unit.hValue', {'v': Fmt.number(v)}),
                ),
                const SizedBox(height: 10),
                for (final (key, color, pick) in <(String, Color, int Function(CheckIn))>[
                  ('checkin.energy', c.success, (x) => x.energy),
                  ('checkin.stress', c.warn, (x) => x.stress),
                  ('checkin.soreness', c.error, (x) => x.soreness),
                ]) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      SizedBox(
                        width: 90,
                        child: Text(t(key), style: context.text.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                      ),
                      Expanded(
                        child: _Dots(values: [for (final x in list.length > 12 ? list.sublist(list.length - 12) : list) pick(x)], color: color),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          SectionHeader(t('checkins.history')),
          for (final x in list.reversed.take(10)) ...[
            AppCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text(Fmt.relativeDay(x.date), style: context.text.titleSmall)),
                      Text(Fmt.kg(x.weightKg), style: context.text.titleSmall?.copyWith(color: c.primary)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      Pill(t('checkins.sleepPill', {'v': Fmt.number(x.sleepH)}), icon: CupertinoIcons.moon_fill),
                      Pill(t('checkins.scorePill', {'label': t('checkin.energy'), 'v': x.energy})),
                      Pill(t('checkins.scorePill', {'label': t('checkin.stress'), 'v': x.stress})),
                      Pill(t('checkins.scorePill', {'label': t('checkin.soreness'), 'v': x.soreness})),
                    ],
                  ),
                  if (x.comment.isNotEmpty) ...[const SizedBox(height: 8), Text('“${x.comment}”', style: context.text.bodyMedium?.copyWith(color: c.text2))],
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
        ],
      ],
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.items});
  final List<(String, Color)> items;
  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    children: [
      for (final (label, color) in items)
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            Text(label, style: context.text.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
          ],
        ),
    ],
  );
}

/// 1–5 scores as a row of dots, one per check-in, oldest first.
class _Dots extends StatelessWidget {
  const _Dots({required this.values, required this.color});
  final List<int> values;
  final Color color;
  @override
  Widget build(BuildContext context) => Directionality(
    textDirection: TextDirection.ltr,
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        for (final v in values)
          Container(
            width: 8 + v * 2.4,
            height: 8 + v * 2.4,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withValues(alpha: 0.2 + v * 0.16),
            ),
          ),
      ],
    ),
  );
}
