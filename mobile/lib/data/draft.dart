// A workout in progress. Saved to disk as the trainee logs, so closing the app
// mid-session doesn't lose anything. Strength exercises log weight × reps per
// set; cardio exercises (bike, rower, incline walk...) log minutes and distance.

import 'models.dart';
import 'schedule.dart';

class DraftSet {
  DraftSet({this.weight, this.reps, this.done = false});
  double? weight;
  int? reps;
  bool done;

  factory DraftSet.fromJson(Json j) => DraftSet(weight: (j['weight'] as num?)?.toDouble(), reps: (j['reps'] as num?)?.toInt(), done: j['done'] == true);
  Json toJson() => {'weight': weight, 'reps': reps, 'done': done};
}

class DraftExercise {
  DraftExercise({
    required this.exerciseId,
    required this.name,
    required this.target,
    required this.sets,
    this.note = '',
    this.pain = false,
    this.cardio = false,
    this.minutes,
    this.distanceKm,
    this.cardioDone = false,
  });
  final String exerciseId, name;

  /// What the coach prescribed: "4 × 6–8 · RPE 8 · 2:30".
  final Exercise? target;
  final List<DraftSet> sets;
  String note;
  bool pain;

  /// Cardio: time and distance instead of sets.
  final bool cardio;
  double? minutes, distanceKm;
  bool cardioDone;

  int get done => cardio ? (cardioDone ? 1 : 0) : sets.where((s) => s.done).length;
  int get total => cardio ? 1 : sets.length;

  factory DraftExercise.fromJson(Json j) => DraftExercise(
    exerciseId: j['exerciseId'] as String,
    name: j['name'] as String,
    target: j['target'] is Map ? Exercise.fromJson((j['target'] as Map).cast<String, dynamic>()) : null,
    sets: (j['sets'] as List).map((e) => DraftSet.fromJson((e as Map).cast<String, dynamic>())).toList(),
    note: (j['note'] as String?) ?? '',
    pain: j['pain'] == true,
    cardio: j['cardio'] == true,
    minutes: (j['minutes'] as num?)?.toDouble(),
    distanceKm: (j['distanceKm'] as num?)?.toDouble(),
    cardioDone: j['cardioDone'] == true,
  );
  Json toJson() => {
    'exerciseId': exerciseId,
    'name': name,
    'target': target == null
        ? null
        : {
            'id': target!.id,
            'name': target!.name,
            'sets': target!.sets,
            'reps': target!.reps,
            'intensity': target!.intensity,
            'rest': target!.rest,
            'cue': target!.cue,
            'video': target!.video,
          },
    'sets': sets.map((s) => s.toJson()).toList(),
    'note': note,
    'pain': pain,
    'cardio': cardio,
    'minutes': minutes,
    'distanceKm': distanceKm,
    'cardioDone': cardioDone,
  };
}

class WorkoutDraft {
  WorkoutDraft({required this.id, required this.date, required this.dayName, required this.startedAt, required this.exercises, this.dayId});
  final String id, date, dayName;
  final String? dayId;
  final DateTime startedAt;
  final List<DraftExercise> exercises;

  int get doneSets => exercises.fold(0, (a, e) => a + e.done);
  int get totalSets => exercises.fold(0, (a, e) => a + e.total);
  int get elapsedMinutes => DateTime.now().difference(startedAt).inMinutes;

  /// A fresh session from the program day, pre-filled with last time's numbers.
  factory WorkoutDraft.fromDay(ProgramDay day, List<WorkoutLog> logs) => WorkoutDraft(
    id: newId('l'),
    date: _today(),
    dayName: day.name,
    dayId: day.id,
    startedAt: DateTime.now(),
    exercises: [
      for (final e in day.exercises)
        () {
          final last = lastEntryFor(logs, e.id, e.name);
          if (isCardioExercise(e.name)) {
            return DraftExercise(
              exerciseId: e.id,
              name: e.name,
              target: e,
              sets: [],
              cardio: true,
              minutes: last?.cardio?.minutes ?? cardioMinutes(e),
              distanceKm: last?.cardio?.distanceKm,
            );
          }
          final target = repTarget(e.reps);
          return DraftExercise(
            exerciseId: e.id,
            name: e.name,
            target: e,
            sets: List.generate(e.sets < 1 ? 1 : e.sets, (i) {
              final prev = last == null || last.sets.isEmpty ? null : last.sets[i < last.sets.length ? i : last.sets.length - 1];
              return DraftSet(weight: prev?.weight, reps: prev?.reps ?? target);
            }),
          );
        }(),
    ],
  );

  /// Only what's marked done is saved; exercises with nothing done are left out.
  WorkoutLog toLog({required int minutes, required int rpe}) => WorkoutLog(
    id: id,
    date: date,
    dayName: dayName,
    dayId: dayId,
    durationMin: minutes.toDouble(),
    rpe: rpe.toDouble(),
    entries: [
      for (final e in exercises)
        if (e.done > 0)
          LogEntry(
            exerciseId: e.exerciseId,
            exerciseName: e.name,
            sets: e.cardio
                ? const []
                : [
                    for (final s in e.sets)
                      if (s.done) LoggedSet(s.weight ?? 0, s.reps ?? 0),
                  ],
            cardio: e.cardio ? CardioDetail(minutes: e.minutes ?? 0, distanceKm: e.distanceKm) : null,
            note: e.note,
            pain: e.pain,
          ),
    ],
  );

  factory WorkoutDraft.fromJson(Json j) => WorkoutDraft(
    id: j['id'] as String,
    date: j['date'] as String,
    dayName: j['dayName'] as String,
    dayId: j['dayId'] as String?,
    startedAt: DateTime.parse(j['startedAt'] as String),
    exercises: (j['exercises'] as List).map((e) => DraftExercise.fromJson((e as Map).cast<String, dynamic>())).toList(),
  );
  Json toJson() => {
    'id': id,
    'date': date,
    'dayName': dayName,
    'dayId': dayId,
    'startedAt': startedAt.toIso8601String(),
    'exercises': exercises.map((e) => e.toJson()).toList(),
  };
}

String _today() {
  final d = DateTime.now();
  return '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}
