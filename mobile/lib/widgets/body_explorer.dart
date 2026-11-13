// The Body tab's figure: the website's body map, tappable. The selected
// muscle glows and pulses; recently trained muscles carry a soft blue tint.

import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../app/theme.dart';
import 'anatomy_shapes.dart';
import 'muscle_map.dart';

class BodyExplorer extends StatefulWidget {
  const BodyExplorer({super.key, required this.view, this.muscle, this.onMuscle, this.levels = const {}, this.height = 420, this.highlight});
  final BodyView view;
  final MuscleGroup? muscle;
  final ValueChanged<MuscleGroup?>? onMuscle;

  /// 0..1 per muscle group: a soft tint showing what was trained recently.
  final Map<MuscleGroup, double> levels;
  final double height;

  /// Briefly colours a group (quiz feedback).
  final ({MuscleGroup group, Color color})? highlight;

  @override
  State<BodyExplorer> createState() => _BodyExplorerState();
}

class _BodyExplorerState extends State<BodyExplorer> with SingleTickerProviderStateMixin {
  late final _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))..repeat(reverse: true);

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  void _tap(Offset local, Size size) {
    final (s, o) = MuscleMap.fit(size);
    final p = (local - o) / s;
    MuscleGroup? hit;
    AnatomyPaths.instance.muscles[widget.view]!.forEach((g, path) {
      if (path.contains(p)) hit = g;
    });
    if (hit != null) HapticFeedback.selectionClick();
    widget.onMuscle?.call(hit == widget.muscle ? null : hit);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return SizedBox(
      height: widget.height,
      child: LayoutBuilder(
        builder: (context, box) {
          final size = Size(box.maxWidth, widget.height);
          return Directionality(
            textDirection: TextDirection.ltr,
            child: GestureDetector(
              onTapUp: (d) => _tap(d.localPosition, size),
              child: AnimatedBuilder(
                animation: _pulse,
                builder: (context, _) => CustomPaint(
                  size: size,
                  painter: _ExplorerPainter(
                    view: widget.view,
                    muscle: widget.muscle,
                    levels: widget.levels,
                    pulse: _pulse.value,
                    highlight: widget.highlight,
                    body: c.anatBody,
                    base: c.anatMuscle,
                    hot: c.primary,
                    line: c.surface,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ExplorerPainter extends CustomPainter {
  _ExplorerPainter({
    required this.view,
    required this.muscle,
    required this.levels,
    required this.pulse,
    required this.highlight,
    required this.body,
    required this.base,
    required this.hot,
    required this.line,
  });
  final BodyView view;
  final MuscleGroup? muscle;
  final Map<MuscleGroup, double> levels;
  final double pulse;
  final ({MuscleGroup group, Color color})? highlight;
  final Color body, base, hot, line;

  @override
  void paint(Canvas canvas, Size size) {
    final (s, o) = MuscleMap.fit(size);
    final paths = AnatomyPaths.instance;
    canvas.save();
    canvas.translate(o.dx, o.dy);
    canvas.scale(s);
    canvas.drawPath(paths.body, Paint()..color = body);
    paths.muscles[view]!.forEach((g, path) {
      final level = (levels[g] ?? 0).clamp(0.0, 1.0);
      var color = Color.lerp(base, hot, level == 0 ? 0 : 0.15 + level * 0.45)!;
      if (g == muscle) color = Color.lerp(hot, Tokens.accent, pulse * 0.5)!;
      if (highlight?.group == g) color = highlight!.color;
      if (g == muscle || highlight?.group == g) {
        canvas.drawPath(
          path,
          Paint()
            ..color = color.withValues(alpha: 0.4)
            ..maskFilter = MaskFilter.blur(BlurStyle.normal, 4 + pulse * 3),
        );
      }
      canvas.drawPath(path, Paint()..color = color);
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = line.withValues(alpha: 0.6),
      );
    });
    canvas.restore();
  }

  @override
  bool shouldRepaint(_ExplorerPainter old) => true;
}
