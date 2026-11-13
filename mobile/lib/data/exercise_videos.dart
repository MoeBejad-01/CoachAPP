// Technique videos, by exercise name. Paste a video link (an .mp4 or .m3u8
// address the app can stream) next to an exercise and the trainee sees it in
// the technique sheet. A link the coach sets on the exercise in the dashboard
// (`video` on the exercise) wins over this list.
//
// Leave a value null to show "Video coming soon".

const exerciseVideos = <String, String?>{
  'Assault bike sprint': null,
  'Back squat': null,
  'Back squat back-off': null,
  'Band pull-apart': null,
  'Barbell bench press': null,
  'Barbell hip thrust': null,
  'Barbell row': null,
  'Belt squat': null,
  'Block pull': null,
  'Box jump': null,
  'Box squat': null,
  'Bulgarian split squat': null,
  'Cable lateral raise': null,
  'Chest-supported row': null,
  'Chin-up': null,
  'Close-grip bench press': null,
  'Conventional deadlift': null,
  'Copenhagen plank': null,
  'DB bench press': null,
  'Dead bug': null,
  'EZ-bar curl': null,
  'Front squat': null,
  'Goblet squat': null,
  'Hang power clean': null,
  'Incline DB press': null,
  'Incline push-up': null,
  'Incline walk': null,
  'Lat pulldown': null,
  'Leg press': null,
  'Lying leg curl': null,
  'Med-ball scoop toss': null,
  'Nordic curl': null,
  'Overhead press': null,
  'Paused bench press': null,
  'Push-up': null,
  'Reverse lunge': null,
  'Romanian deadlift': null,
  'Rower': null,
  'Seated DB shoulder press': null,
  'Seated cable row': null,
  'Seated calf raise': null,
  'Single-arm cable row': null,
  'Single-leg RDL': null,
  'Sled push': null,
  'Spanish squat hold': null,
  'Sprint': null,
  'Standing calf raise': null,
  'Step-up': null,
  'Trap-bar deadlift': null,
  'Walking lunge': null,
  'Weighted pull-up': null,
};

/// The video for an exercise: the coach's link first, then this list.
String? videoFor(String name, {String? coachLink}) {
  if (coachLink != null && coachLink.isNotEmpty) return coachLink;
  final direct = exerciseVideos[name];
  if (direct != null) return direct;
  final lower = name.toLowerCase();
  for (final e in exerciseVideos.entries) {
    if (e.value != null && e.key.toLowerCase() == lower) return e.value;
  }
  return null;
}
