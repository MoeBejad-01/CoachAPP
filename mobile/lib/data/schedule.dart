// What's planned when, and what the logs add up to. Mirrors the dashboard's
// selectors (web/src/data/selectors.ts, plan.ts, progress.ts) so both sides
// agree on "today's session", adherence and PRs.

import '../app/format.dart';
import 'models.dart';
import '../widgets/anatomy_shapes.dart';

/// Training weekdays for each weekly frequency (0 = Sunday), as WEEKDAY_SLOTS.
const weekdaySlots = <int, List<int>>{
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
};

List<int> slotsFor(Trainee t) => weekdaySlots[t.frequency] ?? weekdaySlots[3]!;

/// Index of the program week a day falls in, clamped to the plan.
int weekIndex(AssignedProgram p, String date) {
  if (p.plan.isEmpty) return 0;
  final i = (Day.between(p.startDate, date) / 7).floor();
  return i.clamp(0, p.plan.length - 1);
}

/// 1-based week number, or null before the program starts.
int? programWeek(Trainee t, [String? day]) {
  final p = t.program;
  final today = day ?? Day.today;
  if (p == null || p.startDate.compareTo(today) > 0) return null;
  return (Day.between(p.startDate, today) ~/ 7 + 1).clamp(1, p.weeks);
}

ProgramWeek? weekOf(Trainee t, String date) {
  final p = t.program;
  if (p == null || p.plan.isEmpty) return null;
  return p.plan[weekIndex(p, date)];
}

/// The session planned for [date], if any.
ProgramDay? plannedOn(Trainee t, String date) {
  final p = t.program;
  if (p == null || p.startDate.compareTo(date) > 0) return null;
  final slot = slotsFor(t).indexOf(Day.dow(date));
  if (slot == -1) return null;
  final days = weekOf(t, date)?.days ?? const [];
  return days.isEmpty ? null : days[slot % days.length];
}

class DayPlan {
  DayPlan(this.date, this.planned, this.log, this.isCheckin, this.checkinDone);
  final String date;
  final ProgramDay? planned;
  final WorkoutLog? log;
  final bool isCheckin, checkinDone;

  /// The planned session was trained on another day this week.
  String? doneOn;

  /// The trainee skipped this session (with a reason for the coach).
  SkippedSession? skip;

  bool get isToday => date == Day.today;
  bool get isPast => date.compareTo(Day.today) < 0;
  bool get done => doneOn != null || (log != null && planned != null && sameSession(log!, planned!));

  /// Planned, in the past and not trained yet: still to catch up this week.
  bool get missed => isPast && planned != null && !done && skip == null;
}

bool sameSession(WorkoutLog l, ProgramDay d) => l.dayId != null ? l.dayId == d.id : l.dayName == d.name;

/// The week, Monday first. Training days are flexible: a session trained on
/// another day (the day after, say) counts for the day it was planned.
List<DayPlan> weekPlan(Snapshot s, [String? weekStart]) {
  final start = weekStart ?? Day.startOfWeek(Day.today);
  final t = s.trainee;
  final days = List.generate(7, (i) {
    final date = Day.add(start, i);
    WorkoutLog? log;
    for (final l in s.logs) {
      if (l.date == date) log = l;
    }
    return DayPlan(date, plannedOn(t, date), log, Day.dow(date) == t.checkinDay, s.checkins.any((c) => c.date == date));
  });
  final claimed = {
    for (final d in days)
      if (d.log != null && d.planned != null && sameSession(d.log!, d.planned!)) d.log!.id,
  };
  for (final d in days) {
    if (d.planned == null || d.done) continue;
    for (final other in days) {
      final l = other.log;
      if (l != null && !claimed.contains(l.id) && sameSession(l, d.planned!)) {
        claimed.add(l.id);
        d.doneOn = l.date;
        break;
      }
    }
    if (!d.done) d.skip = s.skips.where((k) => k.weekStart == start && k.dayId == d.planned!.id).firstOrNull;
  }
  return days;
}

/// What to train next this week: the first planned session not done yet,
/// whatever day it was planned for. Null when the week is complete.
({String plannedFor, ProgramDay day, bool overdue})? upNext(Snapshot s) {
  for (final d in weekPlan(s)) {
    if (d.planned != null && !d.done && d.skip == null && d.log?.date != Day.today) {
      return (plannedFor: d.date, day: d.planned!, overdue: d.isPast);
    }
  }
  return null;
}

/// The next planned session after today.
({String date, ProgramDay day})? nextSession(Snapshot s) {
  for (var i = 1; i <= 14; i++) {
    final date = Day.add(Day.today, i);
    final d = plannedOn(s.trainee, date);
    if (d != null) return (date: date, day: d);
  }
  return null;
}

// ---------- Cardio ----------

final _cardioWords = RegExp(
  r'\b(bike|sprint|sprints|rower|rowing|run|running|jog|walk|sled|treadmill|elliptical|stairs?|stepper|swim|cycling|erg|skipping|jump rope)\b',
);

/// Cardio exercises log time and distance instead of weight × reps.
bool isCardioExercise(String name) {
  final n = name.toLowerCase();
  if (n.contains('lunge') || n.contains('row ') && !n.contains('rower')) return false;
  return _cardioWords.hasMatch(n);
}

/// Minutes from a prescription like "20 min", "6 × 20 s" or "2 km" (best guess).
double cardioMinutes(Exercise e) {
  final r = e.reps.toLowerCase();
  final m = RegExp(r'(\d+(?:\.\d+)?)\s*(min|m\b)').firstMatch(r);
  if (m != null) return double.parse(m.group(1)!);
  final sec = RegExp(r'(\d+)\s*s').firstMatch(r);
  if (sec != null) return ((int.parse(sec.group(1)!) * e.sets) / 60).clamp(1, 120).ceilToDouble();
  return 10;
}

/// Cardio minutes per day of this week (sessions plus cardio inside workouts).
double cardioMinutesBetween(Snapshot s, String from, String to) {
  bool inside(String d) => d.compareTo(from) >= 0 && d.compareTo(to) <= 0;
  final own = s.cardio.where((c) => inside(c.date)).fold(0.0, (a, c) => a + c.detail.minutes);
  final inWorkouts = s.logs.where((l) => inside(l.date)).expand((l) => l.entries).fold(0.0, (a, e) => a + (e.cardio?.minutes ?? 0));
  return own + inWorkouts;
}

/// The WHO's guideline for adults: 150 minutes of moderate activity a week.
const weeklyCardioGoal = 150.0;

/// Sessions logged ÷ sessions expected over the last four weeks.
int? adherence(Snapshot s, {int windowDays = 28}) {
  final t = s.trainee;
  final p = t.program;
  if (p == null) return null;
  final end = Day.today;
  final from = [Day.add(end, -windowDays + 1), p.startDate]..sort();
  final start = from.last;
  final span = Day.between(start, end) + 1;
  if (span < 7) return null;
  final expected = t.frequency * span / 7;
  final done = s.logs.where((l) => l.date.compareTo(start) >= 0 && l.date.compareTo(end) <= 0).length;
  return (done / expected * 100).round().clamp(0, 100);
}

/// Weekly check-in: due on the trainee's check-in day, until one is sent.
({bool due, String since})? checkinStatus(Snapshot s) {
  final today = Day.today;
  var last = today;
  while (Day.dow(last) != s.trainee.checkinDay) {
    last = Day.add(last, -1);
  }
  final done = s.checkins.any((c) => c.date.compareTo(last) >= 0);
  return (due: !done, since: last);
}

InBodyRequest? pendingInBody(Snapshot s) {
  for (final r in s.inbodyRequests.reversed) {
    if (r.pending) return r;
  }
  return null;
}

int unseenFromCoach(Snapshot s) => s.messages.where((m) => m.fromCoach && m.seen == false).length;

double? latestWeight(Snapshot s) => s.weights.isEmpty ? null : s.weights.last.kg;

// ---------- Strength ----------

/// Epley estimated one-rep max, as the dashboard computes it.
double e1rm(double weight, int reps) {
  if (weight <= 0) return 0;
  return reps <= 1 ? weight : weight * (1 + reps / 30);
}

LoggedSet? bestSet(List<LoggedSet> sets) {
  LoggedSet? best;
  for (final s in sets) {
    if (best == null || e1rm(s.weight, s.reps) > e1rm(best.weight, best.reps)) best = s;
  }
  return best;
}

class PrEvent {
  PrEvent(this.date, this.exercise, this.set, this.e1rm, this.prev);
  final String date, exercise;
  final LoggedSet set;
  final double e1rm, prev;
}

/// Every time a lift beat its previous best e1RM (first appearances don't count).
List<PrEvent> prEvents(List<WorkoutLog> logs) {
  final best = <String, double>{};
  final out = <PrEvent>[];
  for (final l in logs) {
    for (final e in l.entries) {
      final b = bestSet(e.sets);
      if (b == null) continue;
      final v = e1rm(b.weight, b.reps);
      if (v <= 0) continue;
      final prev = best[e.exerciseName];
      if (prev != null && v > prev + 0.01) out.add(PrEvent(l.date, e.exerciseName, b, v, prev));
      best[e.exerciseName] = prev == null || v > prev ? v : prev;
    }
  }
  return out;
}

class LiftTrend {
  LiftTrend(this.name, this.points);
  final String name;

  /// Best e1RM per session, oldest first.
  final List<({String date, double value, LoggedSet set})> points;

  double get best => points.fold(0.0, (a, p) => p.value > a ? p.value : a);
  double get latest => points.isEmpty ? 0 : points.last.value;
  double get first => points.isEmpty ? 0 : points.first.value;
}

/// The lifts trained most often, with their e1RM history.
List<LiftTrend> liftTrends(List<WorkoutLog> logs, {int limit = 6}) {
  final map = <String, List<({String date, double value, LoggedSet set})>>{};
  for (final l in logs) {
    for (final e in l.entries) {
      final b = bestSet(e.sets);
      if (b == null || b.weight <= 0) continue;
      (map[e.exerciseName] ??= []).add((date: l.date, value: e1rm(b.weight, b.reps), set: b));
    }
  }
  final list = map.entries.map((e) => LiftTrend(e.key, e.value)).toList()
    ..sort((a, b) => b.points.length != a.points.length ? b.points.length - a.points.length : b.best.compareTo(a.best));
  return list.take(limit).toList();
}

/// What the trainee did last time for this exercise (by id, then by name).
LogEntry? lastEntryFor(List<WorkoutLog> logs, String exerciseId, String name) {
  for (final l in logs.reversed) {
    for (final e in l.entries) {
      if (e.exerciseId == exerciseId && e.sets.isNotEmpty) return e;
    }
  }
  for (final l in logs.reversed) {
    for (final e in l.entries) {
      if (e.exerciseName == name && e.sets.isNotEmpty) return e;
    }
  }
  return null;
}

/// Total kg lifted per week (Monday start), oldest first.
List<({String weekStart, double volume, int sessions})> volumeByWeek(List<WorkoutLog> logs, {int weeks = 8}) {
  final thisWeek = Day.startOfWeek(Day.today);
  return List.generate(weeks, (i) {
    final start = Day.add(thisWeek, -7 * (weeks - 1 - i));
    final end = Day.add(start, 6);
    final inWeek = logs.where((l) => l.date.compareTo(start) >= 0 && l.date.compareTo(end) <= 0);
    return (weekStart: start, volume: inWeek.fold(0.0, (a, l) => a + l.volume), sessions: inWeek.length);
  });
}

/// Seconds of rest from "2:30", "90s", "2 min" or "2–3 min".
int restSeconds(String rest) {
  final s = rest.trim().toLowerCase();
  final clock = RegExp(r'^(\d+):(\d{2})').firstMatch(s);
  if (clock != null) return int.parse(clock.group(1)!) * 60 + int.parse(clock.group(2)!);
  final n = RegExp(r'(\d+(?:\.\d+)?)').firstMatch(s);
  if (n == null) return 90;
  final v = double.parse(n.group(1)!);
  if (s.contains('min') || s.contains("'")) return (v * 60).round();
  return v.round().clamp(10, 900);
}

/// Rough session length: each set plus its rest.
int estimateMinutes(ProgramDay d) {
  final secs = d.exercises.fold(0, (a, e) => a + e.sets * (restSeconds(e.rest) + 45));
  return (secs / 60).round();
}

/// Lower end of a rep range like "6–8" or "8-10 / side".
int? repTarget(String reps) {
  final m = RegExp(r'\d+').firstMatch(reps);
  return m == null ? null : int.parse(m.group(0)!);
}

// ---------- Muscles ----------

/// Which muscle groups an exercise works (1 = main mover, 0.5 = helper).
/// Exercises are free text on the dashboard, so this goes by name.
Map<MuscleGroup, double> musclesFor(String exercise) {
  final n = exercise.toLowerCase();
  bool has(List<String> words) => words.any(n.contains);
  const g = MuscleGroup.glutes, l = MuscleGroup.legs, b = MuscleGroup.back, c = MuscleGroup.chest;
  const sh = MuscleGroup.shoulders, a = MuscleGroup.arms, co = MuscleGroup.core;
  if (has(['hip thrust', 'glute', 'bridge', 'kickback', 'abduct'])) return {g: 1, l: 0.3};
  if (has(['nordic', 'leg curl', 'hamstring'])) return {l: 1, g: 0.3};
  if (has(['romanian', 'rdl', 'good morning'])) return {l: 0.8, g: 0.8, b: 0.4};
  if (has(['deadlift', 'block pull', 'rack pull'])) return {b: 0.8, l: 0.8, g: 0.8};
  if (has(['clean', 'snatch'])) return {l: 0.7, g: 0.6, b: 0.6, sh: 0.4};
  if (has(['calf'])) return {l: 0.6};
  if (has(['copenhagen'])) return {co: 0.8, l: 0.4};
  if (has(['squat', 'leg press', 'lunge', 'step-up', 'step up', 'box jump', 'sled', 'leg extension'])) return {l: 1, g: 0.6};
  if (has(['sprint', 'bike', 'incline walk', 'run'])) return {l: 0.5};
  if (has(['rower'])) return {l: 0.4, b: 0.4};
  // Rows before chest: "Chest-supported row" is a back exercise.
  if (has(['pull-up', 'pull up', 'chin-up', 'chin up', 'pulldown', 'row', 'pullover', 'shrug'])) return {b: 1, a: 0.5};
  if (has(['close-grip', 'close grip', 'dip'])) return {c: 0.7, a: 0.8, sh: 0.3};
  if (has(['bench', 'push-up', 'push up', 'chest', 'fly', 'incline db press', 'incline press'])) return {c: 1, a: 0.5, sh: 0.4};
  if (has(['lateral raise', 'rear delt'])) return {sh: 1};
  if (has(['overhead', 'shoulder press', 'military', 'arnold', 'landmine press'])) return {sh: 1, a: 0.4};
  if (has(['pull-apart', 'pull apart', 'face pull'])) return {sh: 0.7, b: 0.5};
  if (has(['curl', 'tricep', 'pushdown', 'skull', 'extension'])) return {a: 1};
  if (has(['plank', 'dead bug', 'crunch', 'pallof', 'ball', 'toss', 'core', 'carry', 'hollow', 'sit-up', 'twist', 'leg raise', ' ab'])) return {co: 1};
  return const {};
}

/// Hard sets per muscle group (helpers count half).
Map<MuscleGroup, double> setsByMuscle(Iterable<WorkoutLog> logs) {
  final out = <MuscleGroup, double>{};
  for (final l in logs) {
    for (final e in l.entries) {
      musclesFor(e.exerciseName).forEach((g, w) => out[g] = (out[g] ?? 0) + w * e.sets.length);
    }
  }
  return out;
}
