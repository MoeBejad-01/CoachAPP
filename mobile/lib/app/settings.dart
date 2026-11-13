// App-wide preferences: language (English / Arabic, right to left), light or
// dark appearance, and which sync server to talk to during development.

import 'dart:convert';
import 'dart:io';

import 'package:material_ui/material_ui.dart';
import 'package:path_provider/path_provider.dart';

enum Lang {
  en('English'),
  ar('العربية');

  const Lang(this.nativeName);
  final String nativeName;

  Locale get locale => Locale(name);
  TextDirection get direction => this == Lang.ar ? TextDirection.rtl : TextDirection.ltr;
}

enum Appearance { system, light, dark }

class AppSettings extends ChangeNotifier {
  AppSettings._(this._file, this._lang, this._appearance, this._server);

  /// The current settings, for code outside the widget tree (string lookup).
  static late AppSettings instance;

  static Future<AppSettings> load() async {
    final file = File('${(await getApplicationSupportDirectory()).path}/settings.json');
    var saved = <String, dynamic>{};
    try {
      if (await file.exists()) saved = (jsonDecode(await file.readAsString()) as Map).cast<String, dynamic>();
    } catch (_) {
      // Unreadable settings: start from the defaults.
    }
    final device = WidgetsBinding.instance.platformDispatcher.locale.languageCode;
    final lang = Lang.values.asNameMap()[saved['lang']] ?? (device == 'ar' ? Lang.ar : Lang.en);
    final appearance = Appearance.values.asNameMap()[saved['appearance']] ?? Appearance.system;
    final server = saved['server'] is String ? saved['server'] as String : defaultServer;
    return instance = AppSettings._(file, lang, appearance, server);
  }

  /// The web dev server (`npm run dev` in web/) hosts the sync API. The Android
  /// emulator reaches the Mac at 10.0.2.2; the iOS simulator at localhost.
  static String get defaultServer => Platform.isAndroid ? 'http://10.0.2.2:5173' : 'http://localhost:5173';

  final File _file;
  Lang _lang;
  Appearance _appearance;
  String _server;

  Lang get lang => _lang;
  Appearance get appearance => _appearance;
  String get server => _server;
  bool get isArabic => _lang == Lang.ar;

  ThemeMode get themeMode => switch (_appearance) {
    Appearance.system => ThemeMode.system,
    Appearance.light => ThemeMode.light,
    Appearance.dark => ThemeMode.dark,
  };

  set lang(Lang v) {
    if (v == _lang) return;
    _lang = v;
    _save();
    notifyListeners();
  }

  set appearance(Appearance v) {
    if (v == _appearance) return;
    _appearance = v;
    _save();
    notifyListeners();
  }

  set server(String v) {
    final clean = v.trim().replaceAll(RegExp(r'/+$'), '');
    if (clean.isEmpty || clean == _server) return;
    _server = clean;
    _save();
    notifyListeners();
  }

  void _save() {
    _file.writeAsString(jsonEncode({'lang': _lang.name, 'appearance': _appearance.name, 'server': _server})).ignore();
  }
}
