// A muscle group's badge: the group's gradient tile with a close-up of the
// body map, the muscle itself lit in white. Same look as [Glyph], but it
// shows the actual muscle instead of a generic figure.

import 'package:material_ui/material_ui.dart';

import 'anatomy_shapes.dart';
import 'glyph.dart';
import 'muscle_map.dart';

class MuscleBadge extends StatelessWidget {
  const MuscleBadge(this.group, {super.key, required this.tone, this.size = 52});
  final MuscleGroup group;
  final Tone tone;
  final double size;

  @override
  Widget build(BuildContext context) {
    final r = BorderRadius.circular(size * 0.3);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: r,
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: tone.colors),
        boxShadow: [BoxShadow(color: tone.colors[1].withValues(alpha: 0.32), blurRadius: size * 0.28, offset: Offset(0, size * 0.1))],
      ),
      child: ClipRRect(
        borderRadius: r,
        child: CustomPaint(size: Size.square(size), painter: _BadgePainter(group)),
      ),
    );
  }
}

class _BadgePainter extends CustomPainter {
  _BadgePainter(this.group);
  final MuscleGroup group;

  // Back and glutes read best from behind; everything else from the front.
  BodyView get _view => group == MuscleGroup.back || group == MuscleGroup.glutes ? BodyView.back : BodyView.front;

  @override
  void paint(Canvas canvas, Size size) {
    final paths = AnatomyPaths.instance;
    final muscles = paths.muscles[_view]!;
    final target = muscles[group];
    if (target == null) return;

    // Frame the muscle with some body around it, so it's recognisable.
    final b = target.getBounds();
    final side = (b.width > b.height ? b.width : b.height) * 1.3 + 16;
    final frame = Rect.fromCenter(center: b.center, width: side, height: side);
    final s = size.width / frame.width;

    canvas.save();
    canvas.scale(s);
    canvas.translate(-frame.left, -frame.top);
    canvas.drawPath(paths.body, Paint()..color = Colors.white.withValues(alpha: 0.2));
    muscles.forEach((g, p) {
      if (g != group) canvas.drawPath(p, Paint()..color = Colors.white.withValues(alpha: 0.14));
    });
    canvas.drawPath(target, Paint()..color = Colors.white);
    canvas.restore();

    // The same faint top sheen as a Glyph tile.
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height * 0.5),
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.white.withValues(alpha: 0.18), Colors.white.withValues(alpha: 0)],
        ).createShader(Rect.fromLTWH(0, 0, size.width, size.height * 0.5)),
    );
  }

  @override
  bool shouldRepaint(_BadgePainter old) => old.group != group;
}
