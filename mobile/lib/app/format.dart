// Number and date formatting in the app's language. Days are local
// "YYYY-MM-DD" strings, as in the web app's data (web/src/lib/dates.ts).
// Arabic keeps Latin digits, as on the website.

import 'package:intl/intl.dart';

import 'l10n.dart';
import 'settings.dart';

const _arabicDigits = '٠١٢٣٤٥٦٧٨٩';
const _persianDigits = '۰۱۲۳۴۵۶۷۸۹';

/// Turns Arabic-Indic digits into 0-9 (as the website's latinDigits does).
String latinDigits(String s) {
  final b = StringBuffer();
  for (final ch in s.runes) {
    final c = String.fromCharCode(ch);
    final i = _arabicDigits.indexOf(c);
    final j = _persianDigits.indexOf(c);
    b.write(i >= 0 ? '$i' : (j >= 0 ? '$j' : c));
  }
  return b.toString().replaceAll('٫', '.').replaceAll('٬', ',');
}

class Fmt {
  static String get _loc => AppSettings.instance.lang.name;

  static String number(num v, {int digits = 1}) {
    final f = NumberFormat.decimalPattern(_loc)
      ..minimumFractionDigits = 0
      ..maximumFractionDigits = digits;
    return latinDigits(f.format(v));
  }

  static String kg(num v) => t('unit.kgValue', {'v': number(v)});
  static String percent(num v) => t('unit.pctValue', {'v': number(v, digits: 0)});

  static String money(num v, String currency) {
    final f = NumberFormat.simpleCurrency(locale: _loc, name: currency)..maximumFractionDigits = v == v.roundToDouble() ? 0 : 2;
    return latinDigits(f.format(v));
  }

  static String _d(String pattern, DateTime d) => latinDigits(DateFormat(pattern, _loc).format(d));

  /// "Thursday, 13 November"
  static String longDay(DateTime d) => _d(AppSettings.instance.isArabic ? 'EEEE d MMMM' : 'EEEE, d MMMM', d);

  /// "Thu 13 Nov"
  static String shortDay(DateTime d) => _d(AppSettings.instance.isArabic ? 'EEEE d MMM' : 'EEE d MMM', d);

  /// "13 Nov"
  static String dayMonth(DateTime d) => _d('d MMM', d);

  /// "Nov 2026"
  static String monthYear(DateTime d) => _d('MMM y', d);

  /// "Thu"
  static String weekdayShort(DateTime d) => _d(AppSettings.instance.isArabic ? 'EEEE' : 'EEE', d);

  /// One letter or short name for a week strip.
  static String weekdayTiny(DateTime d) => AppSettings.instance.isArabic ? _d('EEEE', d).replaceFirst('ال', '') : _d('EEE', d);

  /// "6:00 PM"
  static String time(DateTime d) => _d('jm', d);

  static String day(String iso) => shortDay(Day.date(iso));

  /// "Today", "Yesterday", "Tomorrow" or "Thu 13 Nov".
  static String relativeDay(String iso) {
    final today = Day.today;
    if (iso == today) return t('date.today');
    if (iso == Day.add(today, -1)) return t('date.yesterday');
    if (iso == Day.add(today, 1)) return t('date.tomorrow');
    return day(iso);
  }

  /// "just now", "5 min ago", "3 h ago", or a day.
  static String ago(DateTime d) {
    final s = DateTime.now().difference(d).inSeconds;
    if (s < 60) return t('date.justNow');
    if (s < 3600) return tn('date.minAgo', s ~/ 60);
    if (s < 86400) return tn('date.hAgo', s ~/ 3600);
    return relativeDay(Day.iso(d));
  }

  /// "54 min" or "1 h 05"
  static String minutes(num m) {
    final total = m.round();
    if (total < 60) return t('unit.minValue', {'v': total});
    if (total % 60 == 0) return t('unit.hValue', {'v': total ~/ 60});
    return t('unit.hMinValue', {'h': total ~/ 60, 'm': (total % 60).toString().padLeft(2, '0')});
  }

  /// "12:04" for a running clock.
  static String clock(int seconds) {
    final s = seconds < 0 ? 0 : seconds;
    String two(int n) => n.toString().padLeft(2, '0');
    return s >= 3600 ? '${s ~/ 3600}:${two((s ~/ 60) % 60)}:${two(s % 60)}' : '${s ~/ 60}:${two(s % 60)}';
  }
}

/// Local calendar days as "YYYY-MM-DD".
class Day {
  static String iso(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  static DateTime date(String iso) {
    final p = iso.substring(0, iso.length < 10 ? iso.length : 10).split('-').map(int.tryParse).toList();
    if (p.length != 3 || p.contains(null)) return DateTime.now();
    return DateTime(p[0]!, p[1]!, p[2]!, 12);
  }

  static String get today => iso(DateTime.now());

  static String add(String iso, int n) {
    final d = date(iso);
    return Day.iso(DateTime(d.year, d.month, d.day + n, 12));
  }

  static int between(String a, String b) {
    final x = date(a), y = date(b);
    return DateTime.utc(y.year, y.month, y.day).difference(DateTime.utc(x.year, x.month, x.day)).inDays;
  }

  /// 0 = Sunday, as JavaScript's getDay().
  static int dow(String iso) => date(iso).weekday % 7;

  /// Monday of the week containing [iso].
  static String startOfWeek(String iso) {
    final d = dow(iso);
    return add(iso, d == 0 ? -6 : 1 - d);
  }
}

/// Server timestamps: ISO with or without a zone.
class Stamp {
  static DateTime parse(String s) => (DateTime.tryParse(s) ?? Day.date(s)).toLocal();

  /// Millisecond precision, like JavaScript's toISOString().
  static String now() => DateTime.fromMillisecondsSinceEpoch(DateTime.now().millisecondsSinceEpoch, isUtc: true).toIso8601String();
}

/// Keeps a left-to-right fragment ("3 × 6–8", "2:30") in order inside Arabic text.
String ltr(String s) => '\u2066$s\u2069';
