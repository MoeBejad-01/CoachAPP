// Talks to the local sync API (web/server/syncApi.ts). It runs inside the web
// app's dev server, so `npm run dev` in web/ is all the backend there is for now.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'models.dart';

enum ApiError {
  /// Server unreachable: keep working offline and retry.
  offline,

  /// Token unknown or the account was removed.
  signedOut,
  badCredentials,

  /// The coach dashboard hasn't been opened yet, so there's no workspace.
  noWorkspace,
  server,
}

class ApiException implements Exception {
  ApiException(this.error);
  final ApiError error;
  @override
  String toString() => 'ApiException($error)';
}

class Api {
  Api(this.base, {this.token});
  final String base;
  final String? token;

  static const _timeout = Duration(seconds: 8);

  Future<Json> _call(String method, String path, [Object? body]) async {
    final uri = Uri.parse('$base$path');
    final headers = {'Content-Type': 'application/json', 'Accept': 'application/json', if (token != null) 'Authorization': 'Bearer $token'};
    http.Response res;
    try {
      res = await (method == 'GET' ? http.get(uri, headers: headers) : http.post(uri, headers: headers, body: body == null ? null : jsonEncode(body))).timeout(
        _timeout,
      );
    } on TimeoutException {
      throw ApiException(ApiError.offline);
    } on SocketException {
      throw ApiException(ApiError.offline);
    } on http.ClientException {
      throw ApiException(ApiError.offline);
    } on HandshakeException {
      throw ApiException(ApiError.offline);
    }
    Json data = {};
    try {
      final decoded = jsonDecode(utf8.decode(res.bodyBytes));
      if (decoded is Map<String, dynamic>) data = decoded;
    } catch (_) {
      // A page that isn't the API (wrong address): treat as unreachable.
      throw ApiException(ApiError.offline);
    }
    if (res.statusCode >= 200 && res.statusCode < 300) return data;
    final code = data['error'];
    throw ApiException(switch (code) {
      'bad-credentials' => ApiError.badCredentials,
      'no-workspace' => ApiError.noWorkspace,
      'signed-out' || 'account-gone' => ApiError.signedOut,
      _ => res.statusCode == 404 ? ApiError.offline : ApiError.server,
    });
  }

  Future<({String token, String traineeId})> login(String email, String password) async {
    final j = await _call('POST', '/api/app/login', {'email': email, 'password': password});
    return (token: j['token'] as String, traineeId: j['traineeId'] as String);
  }

  Future<Snapshot> me() async => Snapshot.fromJson(await _call('GET', '/api/app/me'));

  /// Sends queued changes; returns the fresh snapshot and any ops the server refused.
  Future<({Snapshot snapshot, List<String> rejected})> send(List<AppOp> ops) async {
    final j = await _call('POST', '/api/app/ops', {'ops': ops.map((o) => o.toJson()).toList()});
    return (snapshot: Snapshot.fromJson(j), rejected: (j['rejected'] as List?)?.cast<String>() ?? const <String>[]);
  }

  Future<void> logout() async {
    try {
      await _call('POST', '/api/app/logout');
    } catch (_) {}
  }

  /// Is there a Coach HQ sync API at [base]?
  static Future<bool> reachable(String base) async {
    try {
      final res = await http.get(Uri.parse('$base/api/health')).timeout(const Duration(seconds: 4));
      return res.statusCode == 200 && (jsonDecode(res.body) as Map)['ok'] == true;
    } catch (_) {
      return false;
    }
  }
}
