// The app's data: the trainee's snapshot from the server, plus an outbox of
// changes made on the phone. Changes show up in the app straight away, are
// saved to disk, and are sent to the sync API; the coach's dashboard picks
// them up a moment later. Without a connection the app keeps working and the
// outbox is sent once the server is back.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:material_ui/material_ui.dart';
import 'package:path_provider/path_provider.dart';

import '../app/format.dart';
import '../app/settings.dart';
import 'api.dart';
import 'draft.dart';
import 'models.dart';

enum Phase { booting, signedOut, loading, ready }

enum SyncState { synced, syncing, offline }

class AuthSession {
  AuthSession(this.token, this.traineeId, this.email);
  final String token, traineeId, email;
  Json toJson() => {'token': token, 'traineeId': traineeId, 'email': email};
  factory AuthSession.fromJson(Json j) => AuthSession(j['token'] as String, j['traineeId'] as String, j['email'] as String);
}

class TraineeStore extends ChangeNotifier with WidgetsBindingObserver {
  TraineeStore(this.settings);
  final AppSettings settings;

  Phase phase = Phase.booting;
  AuthSession? session;
  SyncState sync = SyncState.synced;
  DateTime? lastSynced;

  /// Shown on the sign-in screen after the app signed itself out.
  String? notice;

  /// A workout in progress, if any.
  WorkoutDraft? draft;

  Snapshot? _server;
  Snapshot? _view;
  final List<AppOp> _outbox = [];
  Timer? _poll;
  Timer? _draftSave;
  bool _flushing = false;
  bool _again = false;
  DateTime? _touched;
  Directory? _dir;

  /// What the app shows: the server's copy with unsent changes applied.
  Snapshot get s => _view!;
  int get pending => _outbox.length;
  bool isPending(String recordId) => _outbox.any((o) => jsonEncode(o.body).contains('"$recordId"'));

  // ---------- Start-up & persistence ----------

  Future<void> init() async {
    _dir = await getApplicationSupportDirectory();
    final saved = await _read('session.json');
    session = saved == null ? null : AuthSession.fromJson(saved);
    final snap = await _read('snapshot.json');
    try {
      _server = snap == null ? null : Snapshot.fromJson(snap);
    } catch (_) {
      _server = null;
    }
    final out = await _read('outbox.json');
    if (out?['ops'] is List) {
      _outbox.addAll((out!['ops'] as List).map((e) => AppOp.fromJson((e as Map).cast<String, dynamic>())));
    }
    final sk = await _read('skipped.json');
    if (sk?['days'] is List) skipped.addAll((sk!['days'] as List).whereType<String>().where((d) => d.compareTo(Day.add(Day.today, -14)) >= 0));
    final d = await _read('draft.json');
    try {
      draft = d == null ? null : WorkoutDraft.fromJson(d);
    } catch (_) {
      draft = null;
    }
    WidgetsBinding.instance.addObserver(this);
    if (session == null) {
      phase = Phase.signedOut;
    } else if (_server != null && _server!.trainee.id == session!.traineeId) {
      _rebuild();
      phase = Phase.ready;
    } else {
      phase = Phase.loading;
    }
    notifyListeners();
    if (session != null) {
      _touch();
      unawaited(_flush());
      _startPolling();
    }
  }

  File _file(String name) => File('${_dir!.path}/$name');

  Future<Json?> _read(String name) async {
    try {
      final f = _file(name);
      if (!await f.exists()) return null;
      return (jsonDecode(await f.readAsString()) as Map).cast<String, dynamic>();
    } catch (_) {
      return null;
    }
  }

  Future<void> _write(String name, Json? data) async {
    final f = _file(name);
    if (data == null) {
      if (await f.exists()) await f.delete();
      return;
    }
    final tmp = File('${f.path}.tmp');
    await tmp.writeAsString(jsonEncode(data), flush: true);
    await tmp.rename(f.path);
  }

  void _saveOutbox() => unawaited(_write('outbox.json', {'ops': _outbox.map((o) => o.toJson()).toList()}));

  // ---------- Sign in / out ----------

  /// Returns a string key for the error to show, or null on success.
  Future<String?> signIn(String email, String password) async {
    try {
      final api = Api(settings.server);
      final r = await api.login(email.trim(), password);
      final snap = await Api(settings.server, token: r.token).me();
      session = AuthSession(r.token, r.traineeId, email.trim().toLowerCase());
      _server = snap;
      _outbox.clear();
      notice = null;
      lastSynced = DateTime.now();
      sync = SyncState.synced;
      await _write('session.json', session!.toJson());
      await _write('snapshot.json', snap.toJson());
      _saveOutbox();
      _rebuild();
      phase = Phase.ready;
      notifyListeners();
      _touch();
      _startPolling();
      return null;
    } on ApiException catch (e) {
      return switch (e.error) {
        ApiError.badCredentials => 'signIn.error.credentials',
        ApiError.noWorkspace => 'signIn.error.noWorkspace',
        ApiError.offline => 'signIn.error.offline',
        _ => 'signIn.error.server',
      };
    }
  }

  Future<void> signOut({String? notice}) async {
    final s = session;
    if (s != null) unawaited(Api(settings.server, token: s.token).logout());
    _poll?.cancel();
    session = null;
    _server = null;
    _view = null;
    _outbox.clear();
    draft = null;
    this.notice = notice;
    phase = Phase.signedOut;
    skipped.clear();
    for (final f in ['session.json', 'snapshot.json', 'outbox.json', 'draft.json', 'skipped.json']) {
      await _write(f, null);
    }
    notifyListeners();
  }

  // ---------- Sync ----------

  void _startPolling() {
    _poll?.cancel();
    _poll = Timer.periodic(const Duration(seconds: 5), (_) => _flush());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (session == null) return;
    if (state == AppLifecycleState.resumed) {
      _touch();
      unawaited(_flush());
      _startPolling();
    } else if (state == AppLifecycleState.paused) {
      _poll?.cancel();
    }
  }

  /// Pull to refresh.
  Future<void> refresh() => _flush(force: true);

  Future<void> _flush({bool force = false}) async {
    final s = session;
    if (s == null) return;
    if (_flushing) {
      _again = true;
      return;
    }
    _flushing = true;
    if (force || _outbox.isNotEmpty) {
      sync = SyncState.syncing;
      notifyListeners();
    }
    try {
      final api = Api(settings.server, token: s.token);
      final sending = List.of(_outbox);
      final result = sending.isEmpty ? (snapshot: await api.me(), rejected: const <String>[]) : await api.send(sending);
      if (session?.token != s.token) return;
      final sent = sending.map((o) => o.id).toSet();
      _outbox.removeWhere((o) => sent.contains(o.id));
      if (sending.isNotEmpty) _saveOutbox();
      final changed = _server == null || result.snapshot.rev != _server!.rev || sending.isNotEmpty;
      _server = result.snapshot;
      lastSynced = DateTime.now();
      sync = SyncState.synced;
      if (changed) unawaited(_write('snapshot.json', _server!.toJson()));
      _rebuild();
      if (phase != Phase.ready) phase = Phase.ready;
      notifyListeners();
    } on ApiException catch (e) {
      if (e.error == ApiError.signedOut) {
        await signOut(notice: 'signIn.notice.ended');
      } else {
        sync = SyncState.offline;
        notifyListeners();
      }
    } finally {
      _flushing = false;
      if (_again) {
        _again = false;
        unawaited(_flush());
      }
    }
  }

  void _enqueue(AppOp op) {
    _outbox.add(op);
    _saveOutbox();
    _rebuild();
    notifyListeners();
    unawaited(_flush());
  }

  void _rebuild() {
    var v = _server;
    if (v == null) return;
    for (final op in _outbox) {
      v = _apply(v!, op);
    }
    _view = v;
  }

  /// Applies a queued change locally, the same way web/server/appOps.ts does.
  Snapshot _apply(Snapshot s, AppOp op) {
    final b = op.body;
    switch (op.kind) {
      case 'log':
        final log = WorkoutLog.fromJson((b['log'] as Map).cast<String, dynamic>());
        return s.copyWith(logs: [...s.logs.where((l) => l.id != log.id), log]..sort((a, c) => a.date.compareTo(c.date)));
      case 'weight':
        final w = WeightEntry(b['date'] as String, (b['kg'] as num).toDouble());
        return s.copyWith(weights: [...s.weights.where((x) => x.date != w.date), w]..sort((a, c) => a.date.compareTo(c.date)));
      case 'checkin':
        final c = CheckIn.fromJson((b['checkin'] as Map).cast<String, dynamic>());
        return s.copyWith(
          checkins: [...s.checkins.where((x) => x.id != c.id && x.date != c.date), c]..sort((a, d) => a.date.compareTo(d.date)),
          weights: [...s.weights.where((x) => x.date != c.date), WeightEntry(c.date, c.weightKg)]..sort((a, d) => a.date.compareTo(d.date)),
        );
      case 'message':
        final m = (b['message'] as Map).cast<String, dynamic>();
        if (s.messages.any((x) => x.id == m['id'])) return s;
        return s.copyWith(
          messages: [
            ...s.messages,
            Message(id: m['id'] as String, from: 'trainee', text: m['text'] as String, at: m['at'] as String, read: false),
          ],
        );
      case 'seen':
        return s.copyWith(messages: [for (final m in s.messages) m.fromCoach && m.seen == false ? m.copyWith(seen: true) : m]);
      case 'daily':
        final d = DailyLog.fromJson((b['log'] as Map).cast<String, dynamic>());
        return s.copyWith(dailyLogs: [...s.dailyLogs.where((x) => x.date != d.date), d]);
      case 'cardio':
        final c = CardioSession.fromJson((b['session'] as Map).cast<String, dynamic>());
        return s.copyWith(cardio: [...s.cardio.where((x) => x.id != c.id), c]..sort((a, d) => a.date.compareTo(d.date)));
      case 'skip':
        final k = SkippedSession.fromJson((b['skip'] as Map).cast<String, dynamic>());
        return s.copyWith(skips: [...s.skips.where((x) => x.id != k.id && !(x.weekStart == k.weekStart && x.dayId == k.dayId)), k]);
      case 'unskip':
        return s.copyWith(skips: s.skips.where((x) => x.id != b['skipId']).toList());
      case 'inbody':
        final scan = InBodyScan.fromJson((b['scan'] as Map).cast<String, dynamic>());
        if (s.inbody.any((x) => x.id == scan.id)) return s;
        return s.copyWith(
          inbody: [...s.inbody, scan]..sort((a, c) => a.date.compareTo(c.date)),
          inbodyRequests: [for (final r in s.inbodyRequests) r.pending ? InBodyRequest(id: r.id, requestedAt: r.requestedAt, note: r.note, status: 'done') : r],
        );
      default:
        return s;
    }
  }

  void _touch() {
    final now = DateTime.now();
    if (_touched != null && now.difference(_touched!) < const Duration(minutes: 5)) return;
    _touched = now;
    _outbox.add(AppOp('touch', {'at': Stamp.now()}));
    _saveOutbox();
  }

  // ---------- What the trainee can do ----------

  void logWorkout(WorkoutLog log) {
    _enqueue(AppOp('log', {'log': log.toJson()}));
    discardDraft();
  }

  void logWeight(double kg, {String? date}) => _enqueue(AppOp('weight', {'date': date ?? Day.today, 'kg': kg}));

  void submitCheckin(CheckIn c) => _enqueue(AppOp('checkin', {'checkin': c.toJson()}));

  void sendMessage(String text) {
    final clean = text.trim();
    if (clean.isEmpty) return;
    _enqueue(
      AppOp('message', {
        'message': {'id': newId('m'), 'text': clean, 'at': Stamp.now()},
      }),
    );
  }

  /// Opening the chat marks the coach's messages as seen on the dashboard.
  void markSeen() {
    if (_view == null || !_view!.messages.any((m) => m.fromCoach && m.seen == false)) return;
    _enqueue(AppOp('seen', {}));
  }

  void addInBody(InBodyScan scan) => _enqueue(AppOp('inbody', {'scan': scan.toJson()}));

  /// Changes one day's habits (sleep, water, steps, stress, soreness, food).
  /// Each op carries the whole day, so only the latest unsent one is kept.
  void updateDay(DailyLog Function(DailyLog) change, {String? date}) {
    final day = date ?? Day.today;
    final next = change(s.dayLog(day));
    _outbox.removeWhere((o) => o.kind == 'daily' && (o.body['log'] as Map)['date'] == day && !_flushing);
    _enqueue(AppOp('daily', {'log': next.toJson()}));
  }

  void logCardio(CardioSession c) => _enqueue(AppOp('cardio', {'session': c.toJson()}));

  /// Skips a planned session for this week; the coach sees the reason.
  SkippedSession skipSession({required ProgramDay day, required String plannedFor, required String reason, String? note}) {
    final k = SkippedSession(
      id: newId('sk'),
      weekStart: Day.startOfWeek(plannedFor),
      date: plannedFor,
      dayId: day.id,
      dayName: day.name,
      reason: reason,
      note: note,
      at: Stamp.now(),
    );
    _enqueue(AppOp('skip', {'skip': k.toJson()}));
    return k;
  }

  void unskip(String id) => _enqueue(AppOp('unskip', {'skipId': id}));

  // ---------- Flexible days ----------

  /// Days the trainee said "not today" for a planned session (kept on this phone only).
  final Set<String> skipped = {};

  void skipToday() {
    skipped.add(Day.today);
    unawaited(_write('skipped.json', {'days': skipped.toList()}));
    notifyListeners();
  }

  void undoSkip() {
    skipped.remove(Day.today);
    unawaited(_write('skipped.json', {'days': skipped.toList()}));
    notifyListeners();
  }

  // ---------- Workout in progress ----------

  void startDraft(WorkoutDraft d) {
    draft = d;
    saveDraft();
    notifyListeners();
  }

  /// Call after editing the draft in place.
  void saveDraft() {
    _draftSave?.cancel();
    _draftSave = Timer(const Duration(milliseconds: 300), () {
      final d = draft;
      unawaited(_write('draft.json', d?.toJson()));
    });
  }

  void discardDraft() {
    draft = null;
    _draftSave?.cancel();
    unawaited(_write('draft.json', null));
    notifyListeners();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _poll?.cancel();
    super.dispose();
  }
}

/// Makes the store and settings available below the app.
class Scope extends InheritedWidget {
  const Scope({super.key, required this.store, required this.settings, required super.child});
  final TraineeStore store;
  final AppSettings settings;

  static Scope _of(BuildContext context) => context.getInheritedWidgetOfExactType<Scope>()!;
  @override
  bool updateShouldNotify(Scope old) => false;
}

extension ScopeX on BuildContext {
  TraineeStore get store => Scope._of(this).store;
  AppSettings get settings => Scope._of(this).settings;
}
