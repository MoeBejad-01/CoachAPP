// A workout in progress. Saved to disk as the trainee logs, so closing the app
// mid-session doesn't lose anything.

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
  DraftExercise({required this.exerciseId, required this.name, required this.target, required this.sets, this.note = '', this.pain = false});
  final String exerciseId, name;

  /// What the coach prescribed: "4 × 6–8 · RPE 8 · 2:30".
  final Exercise? target;
  final List<DraftSet> sets;
  String note;
  bool pain;

  int get done => sets.where((s) => s.done).length;

  factory DraftExercise.fromJson(Json j) => DraftExercise(
    exerciseId: j['exerciseId'] as String,
    name: j['name'] as String,
    target: j['target'] is Map ? Exercise.fromJson((j['target'] as Map).cast<String, dynamic>()) : null,
    sets: (j['sets'] as List).map((e) => DraftSet.fromJson((e as Map).cast<String, dynamic>())).toList(),
    note: (j['note'] as String?) ?? '',
    pain: j['pain'] == true,
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
          },
    'sets': sets.map((s) => s.toJson()).toList(),
    'note': note,
    'pain': pain,
  };
}

class WorkoutDraft {
  WorkoutDraft({required this.id, required this.date, required this.dayName, required this.startedAt, required this.exercises});
  final String id, date, dayName;
  final DateTime startedAt;
  final List<DraftExercise> exercises;

  int get doneSets => exercises.fold(0, (a, e) => a + e.done);
  int get totalSets => exercises.fold(0, (a, e) => a + e.sets.length);
  int get elapsedMinutes => DateTime.now().difference(startedAt).inMinutes;

  /// A fresh session from the program day, pre-filled with last time's numbers.
  factory WorkoutDraft.fromDay(ProgramDay day, List<WorkoutLog> logs) => WorkoutDraft(
    id: newId('l'),
    date: _today(),
    dayName: day.name,
    startedAt: DateTime.now(),
    exercises: [
      for (final e in day.exercises)
        () {
          final last = lastEntryFor(logs, e.id, e.name);
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

  /// Only sets marked done are saved; exercises with none are left out.
  WorkoutLog toLog({required int minutes, required int rpe}) => WorkoutLog(
    id: id,
    date: date,
    dayName: dayName,
    durationMin: minutes.toDouble(),
    rpe: rpe.toDouble(),
    entries: [
      for (final e in exercises)
        if (e.done > 0)
          LogEntry(
            exerciseId: e.exerciseId,
            exerciseName: e.name,
            sets: [
              for (final s in e.sets)
                if (s.done) LoggedSet(s.weight ?? 0, s.reps ?? 0),
            ],
            note: e.note,
            pain: e.pain,
          ),
    ],
  );

  factory WorkoutDraft.fromJson(Json j) => WorkoutDraft(
    id: j['id'] as String,
    date: j['date'] as String,
    dayName: j['dayName'] as String,
    startedAt: DateTime.parse(j['startedAt'] as String),
    exercises: (j['exercises'] as List).map((e) => DraftExercise.fromJson((e as Map).cast<String, dynamic>())).toList(),
  );
  Json toJson() => {
    'id': id,
    'date': date,
    'dayName': dayName,
    'startedAt': startedAt.toIso8601String(),
    'exercises': exercises.map((e) => e.toJson()).toList(),
  };
}

String _today() {
  final d = DateTime.now();
  return '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}
