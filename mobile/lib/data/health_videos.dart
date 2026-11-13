// "Watch & learn" on the Body tab: short general health and training videos.
// Paste a video link (an .mp4 or .m3u8 the app can stream) into `url` and it
// plays in the app; leave it null to show "Coming soon".

import 'package:material_ui/material_ui.dart';

import '../app/settings.dart';
import '../widgets/glyph.dart';

class HealthVideo {
  const HealthVideo({required this.id, required this.title, required this.minutes, required this.category, required this.icon, required this.tone, this.url});
  final String id, category;
  final Map<Lang, String> title;
  final int minutes;
  final IconData icon;
  final Tone tone;
  final String? url;

  String get localTitle => title[AppSettings.instance.lang] ?? title[Lang.en]!;
}

/// Categories: technique, mobility, recovery, nutrition, mindset.
const healthVideos = <HealthVideo>[
  HealthVideo(
    id: 'squat',
    title: {Lang.en: 'Squat basics in 3 minutes', Lang.ar: 'أساسيات القرفصاء في 3 دقائق'},
    minutes: 3,
    category: 'technique',
    icon: Icons.fitness_center_rounded,
    tone: Tone.blue,
    url: null,
  ),
  HealthVideo(
    id: 'warmup',
    title: {Lang.en: 'A 5-minute warm-up for any workout', Lang.ar: 'إحماء 5 دقائق لأي تمرين'},
    minutes: 5,
    category: 'mobility',
    icon: Icons.local_fire_department_rounded,
    tone: Tone.red,
    url: null,
  ),
  HealthVideo(
    id: 'brace',
    title: {Lang.en: 'How to brace your core', Lang.ar: 'كيف تشدّ جذعك'},
    minutes: 3,
    category: 'technique',
    icon: Icons.self_improvement_rounded,
    tone: Tone.orange,
    url: null,
  ),
  HealthVideo(
    id: 'posture',
    title: {Lang.en: 'Desk posture reset', Lang.ar: 'إعادة ضبط وضعية الجلوس على المكتب'},
    minutes: 4,
    category: 'mobility',
    icon: Icons.chair_rounded,
    tone: Tone.teal,
    url: null,
  ),
  HealthVideo(
    id: 'plate',
    title: {Lang.en: 'Build a high-protein plate', Lang.ar: 'كيف تُعدّ طبقًا غنيًا بالبروتين'},
    minutes: 3,
    category: 'nutrition',
    icon: Icons.restaurant_rounded,
    tone: Tone.green,
    url: null,
  ),
  HealthVideo(
    id: 'foam',
    title: {Lang.en: 'Foam rolling 101', Lang.ar: 'أساسيات أسطوانة التدليك'},
    minutes: 6,
    category: 'recovery',
    icon: Icons.spa_rounded,
    tone: Tone.purple,
    url: null,
  ),
  HealthVideo(
    id: 'bedtime',
    title: {Lang.en: 'Wind-down stretch before bed', Lang.ar: 'إطالات هادئة قبل النوم'},
    minutes: 7,
    category: 'recovery',
    icon: Icons.bedtime_rounded,
    tone: Tone.indigo,
    url: null,
  ),
  HealthVideo(
    id: 'calm',
    title: {Lang.en: 'Breathe to calm down fast', Lang.ar: 'تنفّس لتهدأ بسرعة'},
    minutes: 2,
    category: 'mindset',
    icon: Icons.air_rounded,
    tone: Tone.sky,
    url: null,
  ),
];
