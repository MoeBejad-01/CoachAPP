// The website's barbell motif (web/src/site/components/Barbell.tsx): each
// session this week loads a plate on both ends of the bar. Same plate sizes
// and colours as the site: 25 navy, 20 blue, 15 sky, 10 mint, 5 silver.

import 'package:material_ui/material_ui.dart';

import '../app/theme.dart';

class _Plate {
  const _Plate(this.kg, this.h, this.w, this.color);
  final int kg;
  final double h, w;
  final Color color;
}

const _plates = {
  25: _Plate(25, 168, 26, Color(0xFF0B3D91)),
  20: _Plate(20, 150, 24, Color(0xFF007AFF)),
  15: _Plate(15, 128, 21, Color(0xFF3BA7F2)),
  10: _Plate(10, 106, 18, Color(0xFF7FE7D6)),
  5: _Plate(5, 86, 15, Color(0xFFC9D3E1)),
};

const barKg = 20;

/// Plates for [count] slots, biggest first.
List<int> platesFor(int count) {
  const order = [25, 20, 15, 10, 5];
  return List.generate(count.clamp(1, 7), (i) => order[i < order.length ? i : order.length - 1]);
}

int barbellTotal(List<int> plates, int loaded) => barKg + 2 * plates.take(loaded).fold(0, (a, b) => a + b);

class Barbell extends StatelessWidget {
  const Barbell({super.key, required this.plates, required this.loaded, this.height = 92, this.onDark = false});
  final List<int> plates;
  final int loaded;
  final double height;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Directionality(
      textDirection: TextDirection.ltr,
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: loaded.toDouble()),
        duration: const Duration(milliseconds: 900),
        curve: Curves.easeOutBack,
        builder: (_, v, _) => CustomPaint(
          size: Size.fromHeight(height),
          painter: _BarbellPainter(
            plates: plates,
            loaded: v,
            bar: onDark ? Colors.white.withValues(alpha: 0.9) : (c.dark ? const Color(0xFF8E8E93) : const Color(0xFF9AA3B2)),
            ghost: onDark ? Colors.white.withValues(alpha: 0.35) : c.line,
          ),
        ),
      ),
    );
  }
}

class _BarbellPainter extends CustomPainter {
  _BarbellPainter({required this.plates, required this.loaded, required this.bar, required this.ghost});
  final List<int> plates;
  final double loaded;
  final Color bar, ghost;

  @override
  void paint(Canvas canvas, Size size) {
    final cy = size.height / 2;
    final scale = size.height / 168;
    final barH = 7 * scale;
    final sleeveH = 15 * scale;
    final collarW = 9 * scale;
    final gap = 3 * scale;
    final sideW = plates.fold(0.0, (a, kg) => a + _plates[kg]!.w * scale + gap) + collarW + 14 * scale;
    final shaft = Paint()..color = bar;

    // Shaft and sleeves.
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTRB(0, cy - barH / 2, size.width, cy + barH / 2), Radius.circular(barH)), shaft);
    for (final left in [true, false]) {
      final x0 = left ? 0.0 : size.width - sideW;
      canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(x0, cy - sleeveH / 2, sideW, sleeveH), Radius.circular(4 * scale)), shaft);
      // Collar.
      final cx = left ? sideW : size.width - sideW - collarW;
      canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(cx, cy - 26 * scale, collarW, 52 * scale), Radius.circular(3 * scale)), shaft);
    }

    // Plates, from the collar outwards.
    for (var i = 0; i < plates.length; i++) {
      final p = _plates[plates[i]]!;
      final t = (loaded - i).clamp(0.0, 1.0);
      final w = p.w * scale, h = p.h * scale;
      var offset = collarW;
      for (var j = 0; j < i; j++) {
        offset += _plates[plates[j]]!.w * scale + gap;
      }
      for (final left in [true, false]) {
        final x = left ? sideW - offset - w : size.width - sideW + offset;
        final slide = (1 - t) * 18 * scale * (left ? -1 : 1);
        final r = RRect.fromRectAndRadius(Rect.fromLTWH(x + slide, cy - h / 2, w, h), Radius.circular(4 * scale));
        if (t < 1) {
          canvas.drawRRect(
            r.shift(-Offset(slide, 0)),
            Paint()
              ..style = PaintingStyle.stroke
              ..strokeWidth = 1.4
              ..color = ghost,
          );
        }
        if (t > 0) {
          canvas.drawRRect(r, Paint()..color = p.color.withValues(alpha: t));
          // A soft highlight down the plate's face.
          canvas.drawRRect(
            RRect.fromRectAndRadius(Rect.fromLTWH(r.left + w * 0.18, r.top + 6 * scale, w * 0.16, h - 12 * scale), Radius.circular(2 * scale)),
            Paint()..color = Colors.white.withValues(alpha: 0.22 * t),
          );
        }
      }
    }
  }

  @override
  bool shouldRepaint(_BarbellPainter old) => old.loaded != loaded || old.bar != bar || old.plates != plates;
}

/// Small legend dot in a plate's colour.
Color plateColor(int kg) => _plates[kg]?.color ?? Tokens.accent;
