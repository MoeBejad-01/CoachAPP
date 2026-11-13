// Reads an InBody result sheet (a photo or a PDF) and finds the numbers next
// to its labels: "Skeletal Muscle Mass 26.4", "PBF 24.1", "InBody Score 78/100".
// Text recognition runs on the phone (Apple Vision on iOS, ML Kit on Android,
// see AppDelegate.swift / MainActivity.kt); no AI service and no upload. The
// trainee checks the filled-in numbers before sending them to the coach.

import 'package:flutter/services.dart';

import '../app/format.dart';

class ReportLine {
  ReportLine(this.text, this.x, this.y, this.w, this.h);
  final String text;
  final double x, y, w, h;
  double get cy => y + h / 2;
}

class ReportReader {
  static const _channel = MethodChannel('coachhq/report_reader');

  static Future<List<ReportLine>> _read(String method, String path) async {
    final raw = await _channel.invokeListMethod<Map>(method, {'path': path}) ?? const [];
    return [
      for (final m in raw)
        ReportLine(
          m['text'] as String? ?? '',
          (m['x'] as num?)?.toDouble() ?? 0,
          (m['y'] as num?)?.toDouble() ?? 0,
          (m['w'] as num?)?.toDouble() ?? 0,
          (m['h'] as num?)?.toDouble() ?? 0,
        ),
    ];
  }

  static Future<Map<String, double>> readImage(String path) async => parse(await _read('readImage', path));
  static Future<Map<String, double>> readPdf(String path) async => parse(await _read('readPdf', path));

  /// Labels as printed on InBody sheets, most specific first.
  static const _labels = <String, List<String>>{
    'muscleKg': ['skeletal muscle mass', 'smm'],
    'fatKg': ['body fat mass'],
    'fatPct': ['percent body fat', 'body fat percentage', 'pbf'],
    'bmi': ['body mass index', 'bmi'],
    'visceral': ['visceral fat level', 'visceral fat'],
    'bmr': ['basal metabolic rate', 'bmr'],
    'waterL': ['total body water', 'tbw'],
    'score': ['inbody score'],
    'weightKg': ['weight'],
  };

  /// Plausible values, so a page number or a normal range isn't picked by mistake.
  static const _range = <String, (double, double)>{
    'weightKg': (20, 300),
    'muscleKg': (5, 120),
    'fatKg': (1, 200),
    'fatPct': (2, 75),
    'bmi': (10, 80),
    'visceral': (1, 30),
    'bmr': (500, 4500),
    'waterL': (10, 120),
    'score': (20, 120),
  };

  /// "Weight" also appears in "Weight Control", "Ideal Weight" and so on.
  static const _notWeight = ['control', 'ideal', 'target', 'lean', 'fat', 'muscle', 'free', 'segment'];

  static final _number = RegExp(r'\d{1,4}(?:[.,]\d{1,2})?');

  static List<double> _numbers(String s) => [for (final m in _number.allMatches(latinDigits(s))) double.parse(m.group(0)!.replaceAll(',', '.'))];

  static Map<String, double> parse(List<ReportLine> input) {
    final lines = [...input]..sort((a, b) => (a.cy - b.cy).abs() < 0.008 ? a.x.compareTo(b.x) : a.cy.compareTo(b.cy));
    final out = <String, double>{};
    final used = <ReportLine>{};

    for (final field in _labels.keys) {
      final (lo, hi) = _range[field]!;
      bool ok(double v) => v >= lo && v <= hi;
      for (var i = 0; i < lines.length && !out.containsKey(field); i++) {
        final line = lines[i];
        final text = line.text.toLowerCase();
        final label = _labels[field]!.where(text.contains).firstOrNull;
        if (label == null) continue;
        if (field == 'weightKg' && _notWeight.any(text.contains)) continue;
        if (field == 'bmi' && text.contains('bmr')) continue;

        // 1. A number after the label in the same line ("Weight 59.4 kg").
        final after = text.substring(text.indexOf(label) + label.length);
        final candidates = [..._numbers(after)];
        // 2. Then lines on the same row to the right, nearest first.
        final row = lines.where((o) => o != line && !used.contains(o) && (o.cy - line.cy).abs() < (line.h > 0 ? line.h * 0.8 : 0.01) && o.x > line.x).toList()
          ..sort((a, b) => a.x.compareTo(b.x));
        for (final o in row) {
          candidates.addAll(_numbers(o.text));
        }
        // 3. Then the next few lines in reading order (PDF text, stacked layouts).
        for (final o in lines.skip(i + 1).take(3)) {
          candidates.addAll(_numbers(o.text));
        }
        final v = candidates.where(ok).firstOrNull;
        if (v != null) {
          out[field] = v;
          used.add(line);
        }
      }
    }
    return out;
  }
}
