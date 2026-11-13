// String lookup. Like the website, every string lives in one table
// (strings.dart) in English and Arabic, with {placeholders} and plural forms
// as key.zero / .one / .two / .few / .many / .other.

import 'format.dart';
import 'settings.dart';
import 'strings.dart';

/// The string for [key] in the current language, with {placeholders} filled in.
String t(String key, [Map<String, Object> args = const {}]) {
  final lang = AppSettings.instance.lang;
  final raw = strings[lang]?[key] ?? strings[Lang.en]?[key];
  assert(raw != null, 'Missing string: $key');
  return _fill(raw ?? key, args);
}

/// Plural-aware lookup: picks the form of [key] for [n] and sets {n}.
String tn(String key, num n, [Map<String, Object> args = const {}]) {
  final lang = AppSettings.instance.lang;
  final table = strings[lang] ?? const {};
  final form = _form(n, lang);
  final raw = table['$key.$form'] ?? table['$key.other'] ?? strings[Lang.en]?['$key.other'];
  assert(raw != null, 'Missing plural string: $key');
  return _fill(raw ?? key, {...args, 'n': n});
}

String _form(num value, Lang lang) {
  if (value != value.roundToDouble()) return 'other';
  final n = value.toInt().abs();
  if (lang == Lang.en) return n == 1 ? 'one' : 'other';
  final m = n % 100;
  if (n == 0) return 'zero';
  if (n == 1) return 'one';
  if (n == 2) return 'two';
  if (m >= 3 && m <= 10) return 'few';
  if (m >= 11 && m <= 99) return 'many';
  return 'other';
}

String _fill(String s, Map<String, Object> args) {
  if (args.isEmpty || !s.contains('{')) return s;
  var out = s;
  args.forEach((k, v) {
    out = out.replaceAll('{$k}', v is num ? Fmt.number(v) : '$v');
  });
  return out;
}
