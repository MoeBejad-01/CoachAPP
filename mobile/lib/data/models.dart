// The trainee's slice of the coach's workspace, as the sync API sends it.
// Field names match web/src/data/types.ts, so the same JSON goes both ways.

import 'dart:math';

typedef Json = Map<String, dynamic>;

double _d(Object? v, [double fallback = 0]) => v is num ? v.toDouble() : fallback;
double? _dn(Object? v) => v is num ? v.toDouble() : null;
int _i(Object? v, [int fallback = 0]) => v is num ? v.round() : fallback;
String _s(Object? v, [String fallback = '']) => v is String ? v : fallback;
List<T> _list<T>(Object? v, T Function(Json) f) => v is List ? v.whereType<Map>().map((e) => f(e.cast<String, dynamic>())).toList() : <T>[];

/// Drops null values so optional fields are left out, as in the web app.
Json _clean(Json j) => j..removeWhere((_, v) => v == null);

class Exercise {
  Exercise({
    required this.id,
    required this.name,
    required this.sets,
    required this.reps,
    required this.intensity,
    required this.rest,
    required this.cue,
    this.video,
  });
  final String id, name, reps, intensity, rest, cue;
  final int sets;

  /// Technique video link set by the coach (see also exercise_videos.dart).
  final String? video;

  factory Exercise.fromJson(Json j) => Exercise(
    id: _s(j['id']),
    name: _s(j['name']),
    sets: _i(j['sets'], 3),
    reps: _s(j['reps']),
    intensity: _s(j['intensity']),
    rest: _s(j['rest']),
    cue: _s(j['cue']),
    video: (j['video'] as String?)?.trim().isEmpty ?? true ? null : (j['video'] as String).trim(),
  );
}

class ProgramDay {
  ProgramDay({required this.id, required this.name, required this.exercises});
  final String id, name;
  final List<Exercise> exercises;

  factory ProgramDay.fromJson(Json j) => ProgramDay(id: _s(j['id']), name: _s(j['name']), exercises: _list(j['exercises'], Exercise.fromJson));
}

class WeekTargets {
  WeekTargets({this.bodyWeightKg, this.sleepH, this.calories, this.proteinG, this.steps, this.focus = ''});
  final double? bodyWeightKg, sleepH, calories, proteinG, steps;
  final String focus;

  factory WeekTargets.fromJson(Json j) => WeekTargets(
    bodyWeightKg: _dn(j['bodyWeightKg']),
    sleepH: _dn(j['sleepH']),
    calories: _dn(j['calories']),
    proteinG: _dn(j['proteinG']),
    steps: _dn(j['steps']),
    focus: _s(j['focus']),
  );
}

class ProgramWeek {
  ProgramWeek({required this.id, required this.targets, required this.days});
  final String id;
  final WeekTargets targets;
  final List<ProgramDay> days;

  factory ProgramWeek.fromJson(Json j) => ProgramWeek(
    id: _s(j['id']),
    targets: WeekTargets.fromJson((j['targets'] as Map?)?.cast<String, dynamic>() ?? {}),
    days: _list(j['days'], ProgramDay.fromJson),
  );
}

class AssignedProgram {
  AssignedProgram({required this.name, required this.startDate, required this.weeks, required this.plan});
  final String name, startDate;
  final int weeks;
  final List<ProgramWeek> plan;

  factory AssignedProgram.fromJson(Json j) {
    final plan = _list(j['plan'], ProgramWeek.fromJson);
    return AssignedProgram(name: _s(j['name']), startDate: _s(j['startDate']), weeks: plan.length, plan: plan);
  }
}

class Goal {
  Goal({required this.id, required this.label, required this.unit, required this.start, required this.current, required this.target});
  final String id, label, unit;
  final double start, current, target;

  /// 0..1 from start to target, whichever way the goal runs.
  double get progress {
    final span = target - start;
    if (span == 0) return current == target ? 1 : 0;
    return ((current - start) / span).clamp(0, 1).toDouble();
  }

  factory Goal.fromJson(Json j) =>
      Goal(id: _s(j['id']), label: _s(j['label']), unit: _s(j['unit']), start: _d(j['start']), current: _d(j['current']), target: _d(j['target']));
}

class Membership {
  Membership({required this.plan, required this.price, required this.cycle, required this.renewsOn, required this.paid});
  final String plan, cycle, renewsOn;
  final double price;
  final bool paid;

  factory Membership.fromJson(Json j) =>
      Membership(plan: _s(j['plan']), price: _d(j['price']), cycle: _s(j['cycle'], 'monthly'), renewsOn: _s(j['renewsOn']), paid: j['paid'] == true);
}

class Trainee {
  Trainee({
    required this.raw,
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.heightCm,
    required this.mode,
    required this.goalType,
    required this.goals,
    required this.injuries,
    required this.frequency,
    required this.checkinDay,
    required this.joinedAt,
    required this.lastSeenAt,
    required this.program,
    required this.membership,
  });

  /// The full record as received, so fields the app doesn't use survive caching.
  final Json raw;
  final String id, firstName, lastName, email, mode, goalType, injuries, joinedAt, lastSeenAt;
  final double? heightCm;
  final List<Goal> goals;
  final int frequency, checkinDay;
  final AssignedProgram? program;
  final Membership? membership;

  String get fullName => '$firstName $lastName';
  String get initials => '${firstName.isEmpty ? '' : firstName[0]}${lastName.isEmpty ? '' : lastName[0]}'.toUpperCase();

  factory Trainee.fromJson(Json j) => Trainee(
    raw: j,
    id: _s(j['id']),
    firstName: _s(j['firstName']),
    lastName: _s(j['lastName']),
    email: _s(j['email']),
    heightCm: _dn(j['heightCm']),
    mode: _s(j['mode'], 'online'),
    goalType: _s(j['goalType'], 'health'),
    goals: _list(j['goals'], Goal.fromJson),
    injuries: _s(j['injuries']),
    frequency: _i(j['frequency'], 3),
    checkinDay: _i(j['checkinDay']),
    joinedAt: _s(j['joinedAt']),
    lastSeenAt: _s(j['lastSeenAt']),
    program: j['program'] is Map ? AssignedProgram.fromJson((j['program'] as Map).cast<String, dynamic>()) : null,
    membership: j['membership'] is Map ? Membership.fromJson((j['membership'] as Map).cast<String, dynamic>()) : null,
  );

  Json toJson() => raw;
}

class LoggedSet {
  const LoggedSet(this.weight, this.reps);
  final double weight;
  final int reps;

  factory LoggedSet.fromJson(Json j) => LoggedSet(_d(j['weight']), _i(j['reps']));
  Json toJson() => {'weight': weight, 'reps': reps};
}

/// Time and distance for cardio, inside a workout or on its own.
class CardioDetail {
  const CardioDetail({required this.minutes, this.distanceKm, this.kcal, this.avgHr});
  final double minutes;
  final double? distanceKm, kcal, avgHr;

  factory CardioDetail.fromJson(Json j) =>
      CardioDetail(minutes: _d(j['minutes']), distanceKm: _dn(j['distanceKm']), kcal: _dn(j['kcal']), avgHr: _dn(j['avgHr']));
  Json toJson() => _clean({'minutes': minutes, 'distanceKm': distanceKm, 'kcal': kcal, 'avgHr': avgHr});
}

class LogEntry {
  LogEntry({required this.exerciseId, required this.exerciseName, required this.sets, this.cardio, this.note, this.pain});
  final String exerciseId, exerciseName;
  final List<LoggedSet> sets;
  final CardioDetail? cardio;
  final String? note;
  final bool? pain;

  factory LogEntry.fromJson(Json j) => LogEntry(
    exerciseId: _s(j['exerciseId']),
    exerciseName: _s(j['exerciseName']),
    sets: _list(j['sets'], LoggedSet.fromJson),
    cardio: j['cardio'] is Map ? CardioDetail.fromJson((j['cardio'] as Map).cast<String, dynamic>()) : null,
    note: j['note'] as String?,
    pain: j['pain'] as bool?,
  );
  Json toJson() => _clean({
    'exerciseId': exerciseId,
    'exerciseName': exerciseName,
    'sets': sets.map((s) => s.toJson()).toList(),
    'cardio': cardio?.toJson(),
    'note': (note?.trim().isEmpty ?? true) ? null : note!.trim(),
    'pain': pain == true ? true : null,
  });
}

class WorkoutLog {
  WorkoutLog({required this.id, required this.date, required this.dayName, required this.durationMin, required this.rpe, required this.entries, this.dayId});
  final String id, date, dayName;

  /// The program day this was for; it may be done on another date (flexible days).
  final String? dayId;
  final double durationMin, rpe;
  final List<LogEntry> entries;

  int get setCount => entries.fold(0, (a, e) => a + e.sets.length);
  double get volume => entries.fold(0.0, (a, e) => a + e.sets.fold(0.0, (b, s) => b + s.weight * s.reps));

  factory WorkoutLog.fromJson(Json j) => WorkoutLog(
    id: _s(j['id']),
    date: _s(j['date']),
    dayName: _s(j['dayName']),
    durationMin: _d(j['durationMin']),
    rpe: _d(j['rpe'], 8),
    entries: _list(j['entries'], LogEntry.fromJson),
    dayId: j['dayId'] as String?,
  );
  Json toJson() => {
    'id': id,
    'date': date,
    'dayName': dayName,
    'dayId': ?dayId,
    'durationMin': durationMin.round(),
    'rpe': rpe.round(),
    'entries': entries.map((e) => e.toJson()).toList(),
  };
}

class WeightEntry {
  WeightEntry(this.date, this.kg);
  final String date;
  final double kg;
  factory WeightEntry.fromJson(Json j) => WeightEntry(_s(j['date']), _d(j['kg']));
  Json toJson() => {'date': date, 'kg': kg};
}

class CheckIn {
  CheckIn({
    required this.id,
    required this.date,
    required this.weightKg,
    required this.sleepH,
    required this.energy,
    required this.stress,
    required this.soreness,
    required this.comment,
  });
  final String id, date, comment;
  final double weightKg, sleepH;
  final int energy, stress, soreness;

  factory CheckIn.fromJson(Json j) => CheckIn(
    id: _s(j['id']),
    date: _s(j['date']),
    weightKg: _d(j['weightKg']),
    sleepH: _d(j['sleepH']),
    energy: _i(j['energy'], 3),
    stress: _i(j['stress'], 3),
    soreness: _i(j['soreness'], 3),
    comment: _s(j['comment']),
  );
  Json toJson() => {
    'id': id,
    'date': date,
    'weightKg': weightKg,
    'sleepH': sleepH,
    'energy': energy,
    'stress': stress,
    'soreness': soreness,
    'comment': comment,
  };
}

class Note {
  Note({required this.id, required this.at, required this.text});
  final String id, at, text;
  factory Note.fromJson(Json j) => Note(id: _s(j['id']), at: _s(j['at']), text: _s(j['text']));
  Json toJson() => {'id': id, 'at': at, 'text': text, 'shared': true};
}

class Message {
  Message({required this.id, required this.from, required this.text, required this.at, required this.read, this.seen});
  final String id, from, text, at;
  final bool read;
  final bool? seen;

  bool get fromCoach => from == 'coach';

  Message copyWith({bool? read, bool? seen}) => Message(id: id, from: from, text: text, at: at, read: read ?? this.read, seen: seen ?? this.seen);

  factory Message.fromJson(Json j) =>
      Message(id: _s(j['id']), from: _s(j['from']), text: _s(j['text']), at: _s(j['at']), read: j['read'] == true, seen: j['seen'] as bool?);
  Json toJson() => _clean({'id': id, 'from': from, 'text': text, 'at': at, 'read': read, 'seen': seen});
}

class CoachSession {
  CoachSession({required this.id, required this.title, required this.start, required this.durationMin, required this.location});
  final String id, title, start, location;
  final double durationMin;

  /// Sessions are stored as local wall-clock time ("2026-11-10T12:00:00").
  DateTime get startDate => (DateTime.tryParse(start) ?? DateTime.now()).toLocal();

  factory CoachSession.fromJson(Json j) =>
      CoachSession(id: _s(j['id']), title: _s(j['title']), start: _s(j['start']), durationMin: _d(j['durationMin'], 30), location: _s(j['location']));
  Json toJson() => {'id': id, 'title': title, 'start': start, 'durationMin': durationMin, 'location': location};
}

class InBodyScan {
  InBodyScan({
    required this.id,
    required this.date,
    required this.weightKg,
    required this.muscleKg,
    required this.fatKg,
    required this.fatPct,
    required this.bmi,
    required this.visceral,
    required this.bmr,
    required this.waterL,
    required this.score,
    this.fileName,
    this.fileType,
    this.dataUrl,
    this.source = 'trainee',
  });
  final String id, date, source;
  final double weightKg, muscleKg, fatKg, fatPct, bmi, visceral, bmr, waterL, score;
  final String? fileName, fileType, dataUrl;

  factory InBodyScan.fromJson(Json j) {
    final f = (j['file'] as Map?)?.cast<String, dynamic>();
    return InBodyScan(
      id: _s(j['id']),
      date: _s(j['date']),
      weightKg: _d(j['weightKg']),
      muscleKg: _d(j['muscleKg']),
      fatKg: _d(j['fatKg']),
      fatPct: _d(j['fatPct']),
      bmi: _d(j['bmi']),
      visceral: _d(j['visceral']),
      bmr: _d(j['bmr']),
      waterL: _d(j['waterL']),
      score: _d(j['score']),
      fileName: f?['name'] as String?,
      fileType: f?['type'] as String?,
      source: _s(j['source'], 'coach'),
    );
  }

  /// For the server (with the report attached) or the cache (without it).
  Json toJson({bool withFile = true}) => _clean({
    'id': id,
    'date': date,
    'weightKg': weightKg,
    'muscleKg': muscleKg,
    'fatKg': fatKg,
    'fatPct': fatPct,
    'bmi': bmi,
    'visceral': visceral,
    'bmr': bmr,
    'waterL': waterL,
    'score': score,
    'source': source,
    'file': fileName == null ? null : _clean({'name': fileName, 'type': fileType ?? 'image/jpeg', 'dataUrl': withFile ? dataUrl : null}),
  });
}

class InBodyRequest {
  InBodyRequest({required this.id, required this.requestedAt, required this.note, required this.status});
  final String id, requestedAt, note, status;
  bool get pending => status == 'pending';

  factory InBodyRequest.fromJson(Json j) => InBodyRequest(id: _s(j['id']), requestedAt: _s(j['requestedAt']), note: _s(j['note']), status: _s(j['status']));
  Json toJson() => {'id': id, 'requestedAt': requestedAt, 'note': note, 'status': status};
}

const cardioActivities = ['walk', 'run', 'cycle', 'swim', 'row', 'elliptical', 'stairs', 'hiit', 'sport', 'other'];

/// A cardio session logged on its own (a walk, a run, a class...).
class CardioSession {
  CardioSession({required this.id, required this.date, required this.activity, required this.detail, required this.effort, this.note});
  final String id, date, activity;
  final CardioDetail detail;

  /// 1 easy, 2 moderate, 3 hard.
  final int effort;
  final String? note;

  factory CardioSession.fromJson(Json j) => CardioSession(
    id: _s(j['id']),
    date: _s(j['date']),
    activity: _s(j['activity'], 'other'),
    detail: CardioDetail.fromJson(j),
    effort: _i(j['effort'], 2),
    note: j['note'] as String?,
  );
  Json toJson() => _clean({
    'id': id,
    'date': date,
    'activity': activity,
    ...detail.toJson(),
    'effort': effort,
    'note': (note?.trim().isEmpty ?? true) ? null : note!.trim(),
  });
}

const skipReasons = ['sick', 'busy', 'travel', 'sore', 'motivation', 'other'];

/// A planned session the trainee chose to skip, and why (the coach sees it).
class SkippedSession {
  SkippedSession({
    required this.id,
    required this.weekStart,
    required this.date,
    required this.dayId,
    required this.dayName,
    required this.reason,
    required this.at,
    this.note,
  });
  final String id, weekStart, date, dayId, dayName, reason, at;
  final String? note;

  factory SkippedSession.fromJson(Json j) => SkippedSession(
    id: _s(j['id']),
    weekStart: _s(j['weekStart']),
    date: _s(j['date']),
    dayId: _s(j['dayId']),
    dayName: _s(j['dayName']),
    reason: _s(j['reason'], 'other'),
    at: _s(j['at']),
    note: j['note'] as String?,
  );
  Json toJson() => _clean({
    'id': id,
    'weekStart': weekStart,
    'date': date,
    'dayId': dayId,
    'dayName': dayName,
    'reason': reason,
    'at': at,
    'note': (note?.trim().isEmpty ?? true) ? null : note!.trim(),
  });
}

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

class Meal {
  Meal({required this.id, required this.type, required this.text, this.kcal, this.proteinG});
  final String id, type, text;
  final double? kcal, proteinG;

  factory Meal.fromJson(Json j) => Meal(id: _s(j['id']), type: _s(j['type'], 'snack'), text: _s(j['text']), kcal: _dn(j['kcal']), proteinG: _dn(j['proteinG']));
  Json toJson() => _clean({'id': id, 'type': type, 'text': text, 'kcal': kcal, 'proteinG': proteinG});
}

/// What the trainee tracks day to day (one per day): sleep, water, steps, stress, soreness, food.
class DailyLog {
  const DailyLog({required this.date, this.sleepH, this.waterMl, this.steps, this.stress, this.soreness, this.sorenessAreas = const [], this.meals = const []});
  final String date;
  final double? sleepH, waterMl, steps;
  final int? stress, soreness;
  final List<String> sorenessAreas;
  final List<Meal> meals;

  double get kcal => meals.fold(0.0, (a, m) => a + (m.kcal ?? 0));
  double get protein => meals.fold(0.0, (a, m) => a + (m.proteinG ?? 0));

  DailyLog copyWith({double? sleepH, double? waterMl, double? steps, int? stress, int? soreness, List<String>? sorenessAreas, List<Meal>? meals}) => DailyLog(
    date: date,
    sleepH: sleepH ?? this.sleepH,
    waterMl: waterMl ?? this.waterMl,
    steps: steps ?? this.steps,
    stress: stress ?? this.stress,
    soreness: soreness ?? this.soreness,
    sorenessAreas: sorenessAreas ?? this.sorenessAreas,
    meals: meals ?? this.meals,
  );

  factory DailyLog.fromJson(Json j) => DailyLog(
    date: _s(j['date']),
    sleepH: _dn(j['sleepH']),
    waterMl: _dn(j['waterMl']),
    steps: _dn(j['steps']),
    stress: (j['stress'] as num?)?.round(),
    soreness: (j['soreness'] as num?)?.round(),
    sorenessAreas: (j['sorenessAreas'] as List?)?.whereType<String>().toList() ?? const [],
    meals: _list(j['meals'], Meal.fromJson),
  );
  Json toJson() => _clean({
    'date': date,
    'sleepH': sleepH,
    'waterMl': waterMl,
    'steps': steps,
    'stress': stress,
    'soreness': soreness,
    'sorenessAreas': sorenessAreas.isEmpty ? null : sorenessAreas,
    'meals': meals.map((m) => m.toJson()).toList(),
  });
}

class CoachInfo {
  CoachInfo({required this.name, required this.title, required this.businessName, required this.currency});
  final String name, title, businessName, currency;

  String get firstName => name.split(' ').first;
  String get initials => name.split(' ').where((w) => w.isNotEmpty).take(2).map((w) => w[0]).join().toUpperCase();

  factory CoachInfo.fromJson(Json j) =>
      CoachInfo(name: _s(j['name'], 'Coach'), title: _s(j['title']), businessName: _s(j['businessName']), currency: _s(j['currency'], 'SAR'));
  Json toJson() => {'name': name, 'title': title, 'businessName': businessName, 'currency': currency};
}

/// Everything the app shows, from GET /api/app/me.
class Snapshot {
  Snapshot({
    required this.rev,
    required this.coach,
    required this.trainee,
    required this.logs,
    required this.weights,
    required this.checkins,
    required this.messages,
    required this.notes,
    required this.sessions,
    required this.inbody,
    required this.inbodyRequests,
    this.cardio = const [],
    this.dailyLogs = const [],
    this.skips = const [],
  });

  final int rev;
  final CoachInfo coach;
  final Trainee trainee;
  final List<WorkoutLog> logs;
  final List<WeightEntry> weights;
  final List<CheckIn> checkins;
  final List<Message> messages;
  final List<Note> notes;
  final List<CoachSession> sessions;
  final List<InBodyScan> inbody;
  final List<InBodyRequest> inbodyRequests;
  final List<CardioSession> cardio;
  final List<DailyLog> dailyLogs;
  final List<SkippedSession> skips;

  DailyLog dayLog(String date) => dailyLogs.where((d) => d.date == date).firstOrNull ?? DailyLog(date: date);

  Snapshot copyWith({
    Trainee? trainee,
    List<WorkoutLog>? logs,
    List<WeightEntry>? weights,
    List<CheckIn>? checkins,
    List<Message>? messages,
    List<InBodyScan>? inbody,
    List<InBodyRequest>? inbodyRequests,
    List<CardioSession>? cardio,
    List<DailyLog>? dailyLogs,
    List<SkippedSession>? skips,
  }) => Snapshot(
    rev: rev,
    coach: coach,
    trainee: trainee ?? this.trainee,
    logs: logs ?? this.logs,
    weights: weights ?? this.weights,
    checkins: checkins ?? this.checkins,
    messages: messages ?? this.messages,
    notes: notes,
    sessions: sessions,
    inbody: inbody ?? this.inbody,
    inbodyRequests: inbodyRequests ?? this.inbodyRequests,
    cardio: cardio ?? this.cardio,
    dailyLogs: dailyLogs ?? this.dailyLogs,
    skips: skips ?? this.skips,
  );

  factory Snapshot.fromJson(Json j) => Snapshot(
    rev: _i(j['rev']),
    coach: CoachInfo.fromJson((j['coach'] as Map).cast<String, dynamic>()),
    trainee: Trainee.fromJson((j['trainee'] as Map).cast<String, dynamic>()),
    logs: _list(j['logs'], WorkoutLog.fromJson)..sort((a, b) => a.date.compareTo(b.date)),
    weights: _list(j['weights'], WeightEntry.fromJson)..sort((a, b) => a.date.compareTo(b.date)),
    checkins: _list(j['checkins'], CheckIn.fromJson)..sort((a, b) => a.date.compareTo(b.date)),
    messages: _list(j['messages'], Message.fromJson)..sort((a, b) => a.at.compareTo(b.at)),
    notes: _list(j['notes'], Note.fromJson)..sort((a, b) => b.at.compareTo(a.at)),
    sessions: _list(j['sessions'], CoachSession.fromJson)..sort((a, b) => a.start.compareTo(b.start)),
    inbody: _list(j['inbody'], InBodyScan.fromJson)..sort((a, b) => a.date.compareTo(b.date)),
    inbodyRequests: _list(j['inbodyRequests'], InBodyRequest.fromJson),
    cardio: _list(j['cardio'], CardioSession.fromJson)..sort((a, b) => a.date.compareTo(b.date)),
    dailyLogs: _list(j['dailyLogs'], DailyLog.fromJson),
    skips: _list(j['skips'], SkippedSession.fromJson),
  );

  Json toJson() => {
    'rev': rev,
    'serverTime': Stamp0.now(),
    'coach': coach.toJson(),
    'trainee': trainee.toJson(),
    'logs': logs.map((e) => e.toJson()).toList(),
    'weights': weights.map((e) => e.toJson()).toList(),
    'checkins': checkins.map((e) => e.toJson()).toList(),
    'messages': messages.map((e) => e.toJson()).toList(),
    'notes': notes.map((e) => e.toJson()).toList(),
    'sessions': sessions.map((e) => e.toJson()).toList(),
    'inbody': inbody.map((e) => e.toJson(withFile: false)).toList(),
    'inbodyRequests': inbodyRequests.map((e) => e.toJson()).toList(),
    'cardio': cardio.map((e) => e.toJson()).toList(),
    'dailyLogs': dailyLogs.map((e) => e.toJson()).toList(),
    'skips': skips.map((e) => e.toJson()).toList(),
  };
}

/// Avoids importing format.dart (and Flutter) into the model layer.
class Stamp0 {
  static String now() => DateTime.fromMillisecondsSinceEpoch(DateTime.now().millisecondsSinceEpoch, isUtc: true).toIso8601String();
}

/// A change made in the app, queued until the server confirms it.
/// Mirrors AppOp in web/server/appOps.ts.
class AppOp {
  AppOp(this.kind, this.body, {String? id}) : id = id ?? newId('op-');
  final String id, kind;
  final Json body;

  Json toJson() => {'id': id, 'kind': kind, ...body};
  factory AppOp.fromJson(Json j) {
    final body = Map<String, dynamic>.from(j)
      ..remove('id')
      ..remove('kind');
    return AppOp(_s(j['kind']), body, id: _s(j['id']));
  }
}

final _rand = Random.secure();

/// New record ids, in the style of the web app's uid().
String newId(String prefix) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return prefix + List.generate(12, (_) => chars[_rand.nextInt(chars.length)]).join();
}
