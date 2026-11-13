// Small hand-drawn charts (the dashboard draws its own too): a line chart you
// can scrub with a finger, a bar chart and a sparkline. Time runs left to right
// in both languages, as on the dashboard.

import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';

import '../app/theme.dart';

class ChartPoint {
  const ChartPoint(this.value, this.label);
  final double value;
  final String label;
}

class LineChart extends StatefulWidget {
  const LineChart({super.key, required this.points, this.height = 180, this.color, this.goal, this.format, this.goalLabel});
  final List<ChartPoint> points;
  final double height;
  final Color? color;
  final double? goal;
  final String? goalLabel;
  final String Function(double)? format;

  @override
  State<LineChart> createState() => _LineChartState();
}

class _LineChartState extends State<LineChart> {
  int? _touch;

  void _scrub(Offset p, double width) {
    final n = widget.points.length;
    if (n == 0) return;
    final i = n == 1 ? 0 : ((p.dx - _ChartGeom.padL) / (width - _ChartGeom.padL - _ChartGeom.padR) * (n - 1)).round().clamp(0, n - 1);
    if (i != _touch) {
      HapticFeedback.selectionClick();
      setState(() => _touch = i);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final color = widget.color ?? c.primary;
    final fmt = widget.format ?? (v) => v.toStringAsFixed(1);
    final i = _touch;
    final pts = widget.points;
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 22,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 150),
              child: i == null || pts.isEmpty
                  ? const SizedBox.shrink()
                  : Text(
                      '${fmt(pts[i].value)} · ${pts[i].label}',
                      key: ValueKey(i),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: c.text2),
                    ),
            ),
          ),
          LayoutBuilder(
            builder: (_, box) => GestureDetector(
              onHorizontalDragStart: (d) => _scrub(d.localPosition, box.maxWidth),
              onHorizontalDragUpdate: (d) => _scrub(d.localPosition, box.maxWidth),
              onHorizontalDragEnd: (_) => setState(() => _touch = null),
              onTapDown: (d) => _scrub(d.localPosition, box.maxWidth),
              onTapUp: (_) => Future.delayed(const Duration(milliseconds: 900), () {
                if (mounted) setState(() => _touch = null);
              }),
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: const Duration(milliseconds: 800),
                curve: Curves.easeOutCubic,
                builder: (_, t, _) => CustomPaint(
                  size: Size(box.maxWidth, widget.height),
                  painter: _LinePainter(
                    points: pts,
                    color: color,
                    goal: widget.goal,
                    grid: c.hairline,
                    text: c.faint,
                    dot: c.surface,
                    touch: i,
                    t: t,
                    format: fmt,
                    goalColor: Tokens.glow,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChartGeom {
  static const padL = 8.0, padR = 40.0, padT = 10.0, padB = 22.0;
}

class _LinePainter extends CustomPainter {
  _LinePainter({
    required this.points,
    required this.color,
    required this.goal,
    required this.grid,
    required this.text,
    required this.dot,
    required this.touch,
    required this.t,
    required this.format,
    required this.goalColor,
  });
  final List<ChartPoint> points;
  final Color color, grid, text, dot, goalColor;
  final double? goal;
  final int? touch;
  final double t;
  final String Function(double) format;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;
    final vals = [...points.map((p) => p.value), ?goal];
    var lo = vals.reduce(math.min), hi = vals.reduce(math.max);
    final pad = (hi - lo) == 0 ? (hi.abs() * 0.05 + 1) : (hi - lo) * 0.18;
    lo -= pad;
    hi += pad;
    final w = size.width - _ChartGeom.padL - _ChartGeom.padR;
    final h = size.height - _ChartGeom.padT - _ChartGeom.padB;
    Offset at(int i, double v) =>
        Offset(_ChartGeom.padL + (points.length == 1 ? w / 2 : w * i / (points.length - 1)), _ChartGeom.padT + h * (1 - (v - lo) / (hi - lo)));

    // Grid lines with value labels on the right.
    final tp = TextPainter(textDirection: TextDirection.ltr);
    for (var k = 0; k <= 2; k++) {
      final v = lo + (hi - lo) * (0.15 + k * 0.35);
      final y = at(0, v).dy;
      canvas.drawLine(Offset(_ChartGeom.padL, y), Offset(size.width - _ChartGeom.padR + 6, y), Paint()..color = grid);
      tp.text = TextSpan(
        text: format(v),
        style: TextStyle(fontSize: 11, color: text),
      );
      tp.layout();
      tp.paint(canvas, Offset(size.width - _ChartGeom.padR + 10, y - tp.height / 2));
    }
    // First and last labels under the axis.
    for (final i in {0, points.length - 1}) {
      tp.text = TextSpan(
        text: points[i].label,
        style: TextStyle(fontSize: 11, color: text),
      );
      tp.layout();
      final x = at(i, 0).dx;
      final left = i == 0 ? _ChartGeom.padL : x - tp.width;
      tp.paint(canvas, Offset(left.clamp(0, size.width - tp.width).toDouble(), size.height - tp.height));
    }

    if (goal != null) {
      final y = at(0, goal!).dy;
      final dash = Paint()
        ..color = goalColor
        ..strokeWidth = 1.6;
      for (var x = _ChartGeom.padL; x < size.width - _ChartGeom.padR; x += 9) {
        canvas.drawLine(Offset(x, y), Offset(math.min(x + 5, size.width - _ChartGeom.padR), y), dash);
      }
    }

    // Smooth line through the points, revealed left to right.
    final pts = [for (var i = 0; i < points.length; i++) at(i, points[i].value)];
    final line = monotonePath(pts);
    canvas.save();
    canvas.clipRect(Rect.fromLTWH(0, 0, _ChartGeom.padL + w * t + 4, size.height));
    final area = Path.from(line)
      ..lineTo(pts.last.dx, _ChartGeom.padT + h)
      ..lineTo(pts.first.dx, _ChartGeom.padT + h)
      ..close();
    canvas.drawPath(
      area,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [color.withValues(alpha: 0.22), color.withValues(alpha: 0)],
        ).createShader(Rect.fromLTWH(0, _ChartGeom.padT, size.width, h)),
    );
    canvas.drawPath(
      line,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.6
        ..strokeCap = StrokeCap.round
        ..color = color,
    );
    canvas.restore();

    final focus = touch ?? (t >= 1 ? pts.length - 1 : null);
    if (focus != null) {
      final p = pts[focus];
      if (touch != null) {
        canvas.drawLine(
          Offset(p.dx, _ChartGeom.padT),
          Offset(p.dx, _ChartGeom.padT + h),
          Paint()
            ..color = grid
            ..strokeWidth = 1.5,
        );
      }
      canvas.drawCircle(p, 6, Paint()..color = dot);
      canvas.drawCircle(p, 4, Paint()..color = color);
    }
  }

  @override
  bool shouldRepaint(_LinePainter old) => old.t != t || old.touch != touch || old.points != points || old.color != color;
}

class BarChart extends StatelessWidget {
  const BarChart({super.key, required this.points, this.height = 140, this.color, this.format});
  final List<ChartPoint> points;
  final double height;
  final Color? color;
  final String Function(double)? format;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final hi = points.isEmpty ? 1.0 : math.max(1.0, points.map((p) => p.value).reduce(math.max));
    return Directionality(
      textDirection: TextDirection.ltr,
      child: SizedBox(
        height: height,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            for (var i = 0; i < points.length; i++)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      if (i == points.length - 1 && format != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text(
                            format!(points[i].value),
                            maxLines: 1,
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: c.text2),
                          ),
                        ),
                      TweenAnimationBuilder<double>(
                        tween: Tween(begin: 0, end: points[i].value / hi),
                        duration: Duration(milliseconds: 500 + i * 60),
                        curve: Curves.easeOutCubic,
                        builder: (_, v, _) => Container(
                          height: math.max(3, (height - 40) * v),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(6),
                            color: i == points.length - 1 ? null : (color ?? c.primary).withValues(alpha: 0.28),
                            gradient: i == points.length - 1 ? Tokens.brandGradient : null,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        points[i].label,
                        maxLines: 1,
                        overflow: TextOverflow.clip,
                        style: TextStyle(fontSize: 10.5, color: c.faint),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class Sparkline extends StatelessWidget {
  const Sparkline(this.values, {super.key, this.color, this.width = 72, this.height = 28});
  final List<double> values;
  final Color? color;
  final double width, height;

  @override
  Widget build(BuildContext context) => CustomPaint(size: Size(width, height), painter: _SparkPainter(values, color ?? context.c.primary));
}

class _SparkPainter extends CustomPainter {
  _SparkPainter(this.values, this.color);
  final List<double> values;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (values.length < 2) return;
    final lo = values.reduce(math.min), hi = values.reduce(math.max);
    final span = hi - lo == 0 ? 1 : hi - lo;
    final path = Path();
    for (var i = 0; i < values.length; i++) {
      final p = Offset(size.width * i / (values.length - 1), size.height - 3 - (size.height - 6) * (values[i] - lo) / span);
      i == 0 ? path.moveTo(p.dx, p.dy) : path.lineTo(p.dx, p.dy);
    }
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeJoin = StrokeJoin.round
        ..strokeCap = StrokeCap.round
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(_SparkPainter old) => old.values != values || old.color != color;
}

/// A smooth line through [pts] (left to right) that never bulges above or
/// below the real values between two points (monotone cubic, Steffen's
/// method), so a flat week doesn't look like it dipped.
Path monotonePath(List<Offset> pts) {
  final path = Path()..moveTo(pts.first.dx, pts.first.dy);
  final n = pts.length;
  if (n < 3) {
    for (final p in pts.skip(1)) {
      path.lineTo(p.dx, p.dy);
    }
    return path;
  }
  double slope(int i) {
    final h = pts[i + 1].dx - pts[i].dx;
    return h == 0 ? 0 : (pts[i + 1].dy - pts[i].dy) / h;
  }

  final m = List<double>.filled(n, 0);
  for (var i = 1; i < n - 1; i++) {
    final h0 = pts[i].dx - pts[i - 1].dx, h1 = pts[i + 1].dx - pts[i].dx;
    final s0 = slope(i - 1), s1 = slope(i);
    if (s0 * s1 <= 0 || h0 + h1 == 0) continue;
    final p = (s0 * h1 + s1 * h0) / (h0 + h1);
    m[i] = s0.sign * math.min(math.min(s0.abs(), s1.abs()), 0.5 * p.abs()) * 2;
  }
  m[0] = (3 * slope(0) - m[1]) / 2;
  m[n - 1] = (3 * slope(n - 2) - m[n - 2]) / 2;
  // Keep the end tangents from pointing past the next point.
  if (m[0] * slope(0) < 0) m[0] = 0;
  if (m[n - 1] * slope(n - 2) < 0) m[n - 1] = 0;

  for (var i = 0; i < n - 1; i++) {
    final a = pts[i], b = pts[i + 1];
    final dx = (b.dx - a.dx) / 3;
    path.cubicTo(a.dx + dx, a.dy + dx * m[i], b.dx - dx, b.dy - dx * m[i + 1], b.dx, b.dy);
  }
  return path;
}
