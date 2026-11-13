// The website's body map (hero section), coloured by how much each muscle
// group worked. Shapes come from anatomy_shapes.dart, generated from the site.

import 'dart:typed_data';

import 'package:material_ui/material_ui.dart';
import 'package:path_drawing/path_drawing.dart';

import '../app/theme.dart';
import 'anatomy_shapes.dart';

class _Shapes {
  _Shapes._() {
    // Mirror across x = 100 (the site's matrix(-1 0 0 1 200 0)), column-major.
    final m = Float64List.fromList([-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 200, 0, 0, 1]);
    final half = parseSvgPathData(anatomySilhouette);
    body = Path()
      ..addPath(half, Offset.zero)
      ..addPath(half.transform(m), Offset.zero)
      ..addOval(anatomyHead);
    for (final view in BodyView.values) {
      muscles[view] = {
        for (final e in anatomyMuscles[view]!.entries)
          e.key: () {
            final p = Path();
            for (final d in e.value) {
              final part = parseSvgPathData(d);
              p.addPath(part, Offset.zero);
              p.addPath(part.transform(m), Offset.zero);
            }
            return p;
          }(),
      };
    }
  }
  static final instance = _Shapes._();
  late final Path body;
  final muscles = <BodyView, Map<MuscleGroup, Path>>{};
}

class MuscleMap extends StatelessWidget {
  const MuscleMap({super.key, required this.view, required this.levels, this.selected, this.onSelect, this.height = 300});
  final BodyView view;

  /// 0..1 per group.
  final Map<MuscleGroup, double> levels;
  final MuscleGroup? selected;
  final ValueChanged<MuscleGroup?>? onSelect;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return SizedBox(
      height: height,
      child: LayoutBuilder(
        builder: (context, box) {
          final size = Size(box.maxWidth, height);
          return GestureDetector(
            onTapUp: onSelect == null
                ? null
                : (d) {
                    final p = _toViewBox(d.localPosition, size);
                    MuscleGroup? hit;
                    _Shapes.instance.muscles[view]!.forEach((g, path) {
                      if (path.contains(p)) hit = g;
                    });
                    onSelect!(hit == selected ? null : hit);
                  },
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: const Duration(milliseconds: 900),
              curve: Curves.easeOutCubic,
              builder: (_, t, _) => CustomPaint(
                size: size,
                painter: _MapPainter(
                  view: view,
                  levels: levels,
                  selected: selected,
                  t: t,
                  body: c.anatBody,
                  muscle: c.anatMuscle,
                  hot: c.primary,
                  outline: c.surface,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  static (double, Offset) _fit(Size size) {
    const vb = anatomyViewBox;
    final s = (size.width / vb.width) < (size.height / vb.height) ? size.width / vb.width : size.height / vb.height;
    final dx = (size.width - vb.width * s) / 2 - vb.left * s;
    final dy = (size.height - vb.height * s) / 2 - vb.top * s;
    return (s, Offset(dx, dy));
  }

  static Offset _toViewBox(Offset p, Size size) {
    final (s, o) = _fit(size);
    return (p - o) / s;
  }
}

class _MapPainter extends CustomPainter {
  _MapPainter({
    required this.view,
    required this.levels,
    required this.selected,
    required this.t,
    required this.body,
    required this.muscle,
    required this.hot,
    required this.outline,
  });
  final BodyView view;
  final Map<MuscleGroup, double> levels;
  final MuscleGroup? selected;
  final double t;
  final Color body, muscle, hot, outline;

  @override
  void paint(Canvas canvas, Size size) {
    final (s, o) = MuscleMap._fit(size);
    canvas.save();
    canvas.translate(o.dx, o.dy);
    canvas.scale(s);
    canvas.drawPath(_Shapes.instance.body, Paint()..color = body);
    _Shapes.instance.muscles[view]!.forEach((g, path) {
      final v = ((levels[g] ?? 0) * t).clamp(0.0, 1.0);
      final color = Color.lerp(muscle, hot, v == 0 ? 0 : 0.25 + v * 0.75)!;
      canvas.drawPath(path, Paint()..color = color);
      if (g == selected) {
        canvas.drawPath(
          path,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2.2 / s * 1.6
            ..color = Tokens.glow,
        );
      }
      // Thin separation lines between neighbouring muscles.
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.1
          ..color = outline.withValues(alpha: 0.55),
      );
    });
    canvas.restore();
  }

  @override
  bool shouldRepaint(_MapPainter old) => old.t != t || old.selected != selected || old.levels != levels || old.view != view || old.hot != hot;
}
