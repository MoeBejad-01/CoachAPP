// The app's icon style: a rounded tile with a soft gradient and a white
// symbol (like the iOS Health and Fitness apps), or a "soft" version with a
// tinted background and a coloured symbol for dense lists. Symbols are
// Material's rounded set, so they look the same on iPhone and Android.

import 'package:material_ui/material_ui.dart';

enum Tone {
  blue([Color(0xFF3B9BFF), Color(0xFF0058D6)]),
  sky([Color(0xFF6CD3FF), Color(0xFF2F9BEA)]),
  indigo([Color(0xFF8E8BFF), Color(0xFF5149D6)]),
  teal([Color(0xFF3FD8C2), Color(0xFF0E9384)]),
  green([Color(0xFF4CD964), Color(0xFF1F9D45)]),
  orange([Color(0xFFFFB547), Color(0xFFF57C00)]),
  pink([Color(0xFFFF7A9A), Color(0xFFE8335A)]),
  red([Color(0xFFFF7B72), Color(0xFFD70015)]),
  purple([Color(0xFFD29BFF), Color(0xFF9B4BDB)]),
  gold([Color(0xFFFFD45C), Color(0xFFF2A100)]),
  navy([Color(0xFF2E8BEA), Color(0xFF0B3D91)]);

  const Tone(this.colors);
  final List<Color> colors;

  /// The middle of the gradient, for text and rings in this tone.
  Color get color => Color.lerp(colors[0], colors[1], 0.55)!;
}

class Glyph extends StatelessWidget {
  const Glyph(this.icon, {super.key, this.tone = Tone.blue, this.size = 40, this.soft = false});

  /// Tinted background, coloured symbol: quieter, for lists and rows.
  const Glyph.soft(this.icon, {super.key, this.tone = Tone.blue, this.size = 32}) : soft = true;

  final IconData icon;
  final Tone tone;
  final double size;
  final bool soft;

  @override
  Widget build(BuildContext context) {
    final r = BorderRadius.circular(size * 0.3);
    if (soft) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: tone.color.withValues(alpha: 0.14), borderRadius: r),
        child: Icon(icon, size: size * 0.56, color: tone.color),
      );
    }
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: r,
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: tone.colors),
        boxShadow: size >= 36 ? [BoxShadow(color: tone.colors[1].withValues(alpha: 0.32), blurRadius: size * 0.28, offset: Offset(0, size * 0.1))] : null,
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // A faint sheen across the top, for depth.
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: size * 0.5,
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.vertical(top: Radius.circular(size * 0.3)),
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.white.withValues(alpha: 0.22), Colors.white.withValues(alpha: 0)],
                ),
              ),
            ),
          ),
          Icon(icon, size: size * 0.54, color: Colors.white),
        ],
      ),
    );
  }
}

/// A 1–5 (or 1–3) level shown as rising bars, coloured from calm to intense.
class LevelBars extends StatelessWidget {
  const LevelBars({super.key, required this.level, this.max = 5, this.height = 22, this.color});
  final int level, max;
  final double height;
  final Color? color;

  static const _scale = [Color(0xFF34C759), Color(0xFF9BD34A), Color(0xFFFFC23D), Color(0xFFFF8A3D), Color(0xFFFF3B30)];

  /// Green for 1 through red for [max].
  static Color colorFor(int level, int max) {
    final i = ((level - 1) / (max - 1).clamp(1, 10) * (_scale.length - 1)).round().clamp(0, _scale.length - 1);
    return _scale[i];
  }

  Color _tone() => color ?? colorFor(level, max);

  @override
  Widget build(BuildContext context) {
    final on = _tone();
    final off = Theme.of(context).brightness == Brightness.dark ? const Color(0xFF3A3A3C) : const Color(0xFFDADDE3);
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (var i = 1; i <= max; i++) ...[
            if (i > 1) SizedBox(width: height * 0.14),
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: height * 0.26,
              height: height * (0.36 + 0.64 * i / max),
              decoration: BoxDecoration(color: i <= level ? on : off, borderRadius: BorderRadius.circular(height * 0.13)),
            ),
          ],
        ],
      ),
    );
  }
}

/// Icons used across the app, in one place so they stay consistent.
abstract final class Sym {
  static const water = Icons.water_drop_rounded;
  static const sleep = Icons.bedtime_rounded;
  static const steps = Icons.directions_walk_rounded;
  static const food = Icons.restaurant_rounded;
  static const stress = Icons.self_improvement_rounded;
  static const soreness = Icons.healing_rounded;
  static const heart = Icons.favorite_rounded;
  static const cardio = Icons.monitor_heart_rounded;
  static const strength = Icons.fitness_center_rounded;
  static const rest = Icons.nights_stay_rounded;
  static const done = Icons.check_circle_rounded;
  static const trophy = Icons.emoji_events_rounded;
  static const calendar = Icons.event_repeat_rounded;
  static const skip = Icons.event_busy_rounded;
  static const idea = Icons.lightbulb_rounded;
  static const touch = Icons.touch_app_rounded;
  static const quiz = Icons.psychology_rounded;
  static const scan = Icons.document_scanner_rounded;
  static const play = Icons.play_arrow_rounded;
  static const ai = Icons.auto_awesome_rounded;
  static const protein = Icons.egg_alt_rounded;
  static const warmup = Icons.local_fire_department_rounded;
  static const breathe = Icons.air_rounded;
  static const recover = Icons.spa_rounded;
  static const checkin = Icons.fact_check_rounded;
  static const inbody = Icons.monitor_weight_rounded;
  static const chat = Icons.forum_rounded;
  static const video = Icons.videocam_rounded;
  static const session = Icons.groups_rounded;
  static const pain = Icons.personal_injury_rounded;

  static const meal = {
    'breakfast': Icons.free_breakfast_rounded,
    'lunch': Icons.lunch_dining_rounded,
    'dinner': Icons.dinner_dining_rounded,
    'snack': Icons.cookie_rounded,
  };

  static const activity = {
    'walk': Icons.directions_walk_rounded,
    'run': Icons.directions_run_rounded,
    'cycle': Icons.directions_bike_rounded,
    'swim': Icons.pool_rounded,
    'row': Icons.rowing_rounded,
    'elliptical': Icons.all_inclusive_rounded,
    'stairs': Icons.stairs_rounded,
    'hiit': Icons.bolt_rounded,
    'sport': Icons.sports_soccer_rounded,
    'other': Icons.sports_gymnastics_rounded,
  };

  /// Stress 1 (very calm) … 5 (very stressed).
  static const moods = [
    Icons.sentiment_very_satisfied_rounded,
    Icons.sentiment_satisfied_rounded,
    Icons.sentiment_neutral_rounded,
    Icons.sentiment_dissatisfied_rounded,
    Icons.sentiment_very_dissatisfied_rounded,
  ];
  static const moodColors = [Color(0xFF34C759), Color(0xFF8ACB3F), Color(0xFFFFB400), Color(0xFFFF8A3D), Color(0xFFFF3B30)];
}
