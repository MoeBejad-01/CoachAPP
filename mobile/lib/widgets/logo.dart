// The Coach HQ mark from the website: a white barbell with a mint dot.

import 'package:material_ui/material_ui.dart';

import '../app/theme.dart';

/// The website's logo: a white barbell on a frosted tile with a mint dot.
class LogoMark extends StatelessWidget {
  const LogoMark({super.key, this.size = 36});
  final double size;
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(size * 0.28)),
    child: CustomPaint(painter: _MarkPainter()),
  );
}

class _MarkPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 32;
    final p = Paint()..color = Colors.white;
    void rr(double x, double y, double w, double h, double r) =>
        canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(x * s, y * s, w * s, h * s), Radius.circular(r * s)), p);
    rr(6, 15, 20, 2, 1);
    rr(8, 10, 3, 12, 1.5);
    rr(21, 10, 3, 12, 1.5);
    rr(4.5, 12.5, 2.5, 7, 1.25);
    rr(25, 12.5, 2.5, 7, 1.25);
    canvas.drawCircle(Offset(26 * s, 7 * s), 2.2 * s, Paint()..color = Tokens.glow);
  }

  @override
  bool shouldRepaint(_MarkPainter old) => false;
}
