// Add an InBody scan: the numbers from the printout (same fields the coach
// sees on the dashboard) and a photo of the report. Closes the coach's
// pending request, if there is one.

import 'dart:convert';

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:file_picker/file_picker.dart';

import 'dart:io';

import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:material_ui/material_ui.dart';

import '../app/format.dart';
import '../app/l10n.dart';
import '../app/theme.dart';
import '../data/models.dart';
import '../data/report_reader.dart';
import '../data/schedule.dart';
import '../data/store.dart';
import '../widgets/glyph.dart';
import '../widgets/ui.dart';

class InBodySheet extends StatefulWidget {
  const InBodySheet({super.key, this.request});
  final InBodyRequest? request;

  static Future<void> open(BuildContext context, {InBodyRequest? request}) async {
    final sent = await showAppSheet<bool>(context, (_) => InBodySheet(request: request));
    if (sent == true && context.mounted) toast(context, t('inbody.sent', {'name': context.store.s.coach.firstName}));
  }

  @override
  State<InBodySheet> createState() => _InBodySheetState();
}

class _Field {
  _Field(this.key, this.unit, {this.decimals = 1});
  final String key, unit;
  final int decimals;
  final ctl = TextEditingController();
  double? get value => double.tryParse(latinDigits(ctl.text).replaceAll(',', '.'));
}

class _InBodySheetState extends State<InBodySheet> {
  final _fields = {
    'weightKg': _Field('inbody.weight', 'kg'),
    'muscleKg': _Field('inbody.muscle', 'kg'),
    'fatKg': _Field('inbody.fatKg', 'kg'),
    'fatPct': _Field('inbody.fatPct', '%'),
    'bmi': _Field('inbody.bmi', ''),
    'visceral': _Field('inbody.visceral', '', decimals: 0),
    'bmr': _Field('inbody.bmr', 'kcal', decimals: 0),
    'waterL': _Field('inbody.water', 'L'),
    'score': _Field('inbody.score', '', decimals: 0),
  };
  DateTime _date = DateTime.now();
  Uint8List? _photo;
  String? _photoName;
  bool _tried = false;

  /// A PDF report attached instead of a photo.
  ({String name, String? dataUrl})? _pdf;

  /// Fields filled in from the report (highlighted until edited).
  final _filled = <String>{};
  bool _reading = false;
  String? _readNote;

  static const _required = ['weightKg', 'muscleKg', 'fatPct'];

  @override
  void initState() {
    super.initState();
    final w = latestWeight(context.store.s);
    if (w != null) _fields['weightKg']!.ctl.text = w.toStringAsFixed(1);
  }

  @override
  void dispose() {
    for (final f in _fields.values) {
      f.ctl.dispose();
    }
    super.dispose();
  }

  /// Fills in what can be worked out from the rest (fat %, fat mass, BMI).
  void _derive() {
    final w = _fields['weightKg']!.value;
    final fatKg = _fields['fatKg']!.value;
    final fatPct = _fields['fatPct']!.value;
    final h = context.store.s.trainee.heightCm;
    if (w != null && w > 0) {
      if (fatKg != null && fatPct == null) _fields['fatPct']!.ctl.text = (fatKg / w * 100).toStringAsFixed(1);
      if (fatPct != null && fatKg == null) _fields['fatKg']!.ctl.text = (w * fatPct / 100).toStringAsFixed(1);
      if (h != null && h > 0 && _fields['bmi']!.value == null) _fields['bmi']!.ctl.text = (w / ((h / 100) * (h / 100))).toStringAsFixed(1);
    }
  }

  Future<void> _pick(ImageSource source, {bool read = false}) async {
    try {
      final file = await ImagePicker().pickImage(source: source, maxWidth: 2000, maxHeight: 2000, imageQuality: 75);
      if (file == null) return;
      final bytes = await file.readAsBytes();
      if (bytes.length > 2 * 1024 * 1024) {
        if (mounted) toast(context, t('inbody.photoTooBig'));
        return;
      }
      setState(() {
        _photo = bytes;
        _photoName = file.name;
        _pdf = null;
      });
      if (read) await _fill(() => ReportReader.readImage(file.path));
    } on PlatformException {
      if (mounted) toast(context, t('inbody.photoError'));
    }
  }

  Future<void> _pickPdf() async {
    try {
      final f = await FilePicker.pickFile(type: FileType.custom, allowedExtensions: ['pdf']);
      final path = f?.path;
      if (f == null || path == null) return;
      final bytes = await File(path).readAsBytes();
      setState(() {
        _photo = null;
        _pdf = (name: f.name, dataUrl: bytes.length <= 1500 * 1024 ? 'data:application/pdf;base64,${base64Encode(bytes)}' : null);
      });
      await _fill(() => ReportReader.readPdf(path));
    } on PlatformException {
      if (mounted) toast(context, t('inbody.photoError'));
    }
  }

  /// Reads the report and fills in the fields it found.
  Future<void> _fill(Future<Map<String, double>> Function() read) async {
    setState(() {
      _reading = true;
      _readNote = null;
    });
    Map<String, double> found = const {};
    try {
      found = await read();
    } catch (_) {
      found = const {};
    }
    if (!mounted) return;
    setState(() {
      _reading = false;
      _filled.clear();
      for (final e in found.entries) {
        final f = _fields[e.key];
        if (f == null) continue;
        f.ctl.text = e.value.toStringAsFixed(f.decimals);
        _filled.add(e.key);
      }
      _derive();
      _readNote = found.isEmpty ? t('inbody.readNone') : t('inbody.readSome', {'n': found.length, 'total': _fields.length});
    });
    HapticFeedback.mediumImpact();
  }

  void _save() {
    _derive();
    setState(() => _tried = true);
    if (_required.any((k) => _fields[k]!.value == null)) {
      HapticFeedback.heavyImpact();
      return;
    }
    double v(String k) => _fields[k]!.value ?? 0;
    final scan = InBodyScan(
      id: newId('ib'),
      date: Day.iso(_date),
      weightKg: v('weightKg'),
      muscleKg: v('muscleKg'),
      fatKg: v('fatKg'),
      fatPct: v('fatPct'),
      bmi: v('bmi'),
      visceral: v('visceral'),
      bmr: v('bmr'),
      waterL: v('waterL'),
      score: v('score'),
      fileName: _pdf?.name ?? (_photo == null ? null : (_photoName ?? 'inbody.jpg')),
      fileType: _pdf != null ? 'application/pdf' : (_photo == null ? null : 'image/jpeg'),
      dataUrl: _pdf != null ? _pdf!.dataUrl : (_photo == null ? null : 'data:image/jpeg;base64,${base64Encode(_photo!)}'),
    );
    context.store.addInBody(scan);
    HapticFeedback.heavyImpact();
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final coach = context.store.s.coach.firstName;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.92,
      maxChildSize: 0.95,
      builder: (_, scroll) => ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        children: [
          Text(t('inbody.title'), style: context.text.headlineSmall),
          const SizedBox(height: 4),
          Text(t('inbody.sub'), style: context.text.bodyMedium?.copyWith(color: c.muted)),
          const SizedBox(height: 16),
          AppCard(
            gradient: Tokens.brandGradient,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(13)),
                      child: const Icon(Sym.scan, color: Colors.white, size: 26),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t('inbody.scanTitle'), style: context.text.titleMedium?.copyWith(color: Colors.white)),
                          Text(t('inbody.scanSub'), style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (_reading)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(8),
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                    ),
                  )
                else
                  Row(
                    children: [
                      Expanded(
                        child: _ScanButton(
                          icon: CupertinoIcons.camera_fill,
                          label: t('inbody.photoCamera'),
                          onTap: () => _pick(ImageSource.camera, read: true),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _ScanButton(
                          icon: CupertinoIcons.photo_fill,
                          label: t('inbody.photoLibrary'),
                          onTap: () => _pick(ImageSource.gallery, read: true),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _ScanButton(icon: CupertinoIcons.doc_fill, label: t('inbody.pdf'), onTap: _pickPdf),
                      ),
                    ],
                  ),
                if (_readNote != null) ...[
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(_filled.isEmpty ? CupertinoIcons.exclamationmark_circle_fill : CupertinoIcons.checkmark_circle_fill, size: 16, color: Colors.white),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          _readNote!,
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          if (widget.request != null) ...[
            const SizedBox(height: 14),
            AppCard(
              color: c.tint,
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(CupertinoIcons.chat_bubble_text_fill, color: c.primary, size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      widget.request!.note.isEmpty
                          ? t('task.inbody.title', {'name': coach})
                          : t('inbody.request', {'name': coach, 'note': widget.request!.note}),
                      style: context.text.bodyMedium,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 18),
          AppCard(
            padding: EdgeInsets.zero,
            child: ListTile(
              leading: Icon(CupertinoIcons.calendar, color: c.primary),
              title: Text(t('inbody.date')),
              trailing: Text(
                Fmt.shortDay(_date),
                style: TextStyle(color: c.primary, fontWeight: FontWeight.w600),
              ),
              onTap: () async {
                final d = await showDatePicker(
                  context: context,
                  initialDate: _date,
                  firstDate: DateTime.now().subtract(const Duration(days: 365)),
                  lastDate: DateTime.now(),
                );
                if (d != null) setState(() => _date = d);
              },
            ),
          ),
          const SizedBox(height: 14),
          _Pairs(
            children: [
              for (final e in _fields.entries)
                TextField(
                  controller: e.value.ctl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  textInputAction: TextInputAction.next,
                  onEditingComplete: () {
                    setState(_derive);
                    FocusScope.of(context).nextFocus();
                  },
                  onChanged: (_) {
                    if (_filled.remove(e.key)) setState(() {});
                  },
                  decoration: InputDecoration(
                    fillColor: _filled.contains(e.key) ? c.successSoft : null,
                    prefixIcon: _filled.contains(e.key) ? Icon(CupertinoIcons.sparkles, size: 16, color: c.success) : null,
                    labelText: t(e.value.key) + (_required.contains(e.key) ? ' *' : ''),
                    suffixText: e.value.unit.isEmpty ? null : e.value.unit,
                    errorText: _tried && _required.contains(e.key) && e.value.value == null ? t('inbody.required') : null,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Text(t('inbody.report'), style: context.text.titleSmall),
          const SizedBox(height: 8),
          if (_pdf != null)
            AppCard(
              padding: const EdgeInsets.fromLTRB(14, 10, 6, 10),
              child: Row(
                children: [
                  Icon(CupertinoIcons.doc_fill, color: c.error),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(_pdf!.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.titleSmall),
                  ),
                  IconButton(
                    tooltip: t('common.remove'),
                    onPressed: () => setState(() => _pdf = null),
                    icon: Icon(CupertinoIcons.xmark_circle_fill, color: c.faint),
                  ),
                ],
              ),
            )
          else if (_photo != null)
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(Tokens.r),
                  child: Image.memory(_photo!, height: 180, width: double.infinity, fit: BoxFit.cover),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: IconButton.filled(
                    style: IconButton.styleFrom(backgroundColor: Colors.black54),
                    onPressed: () => setState(() => _photo = null),
                    icon: const Icon(CupertinoIcons.xmark, size: 16, color: Colors.white),
                    tooltip: t('common.remove'),
                  ),
                ),
              ],
            )
          else
            Row(
              children: [
                Expanded(
                  child: SecondaryButton(t('inbody.photoLibrary'), icon: CupertinoIcons.photo, onPressed: () => _pick(ImageSource.gallery)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: SecondaryButton(t('inbody.photoCamera'), icon: CupertinoIcons.camera, onPressed: () => _pick(ImageSource.camera)),
                ),
              ],
            ),
          const SizedBox(height: 22),
          PrimaryButton(t('inbody.send', {'name': coach}), icon: CupertinoIcons.paperplane_fill, onPressed: _save),
        ],
      ),
    );
  }
}

class _ScanButton extends StatelessWidget {
  const _ScanButton({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
      child: Column(
        children: [
          Icon(icon, color: Tokens.brand, size: 22),
          const SizedBox(height: 4),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Tokens.brand, fontWeight: FontWeight.w700, fontSize: 13),
          ),
        ],
      ),
    ),
  );
}

/// Two fields per row, each row as tall as its tallest field (so an error
/// message under one field doesn't leave a gap everywhere else).
class _Pairs extends StatelessWidget {
  const _Pairs({required this.children});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      for (var i = 0; i < children.length; i += 2) ...[
        if (i > 0) const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: children[i]),
            const SizedBox(width: 12),
            Expanded(child: i + 1 < children.length ? children[i + 1] : const SizedBox()),
          ],
        ),
      ],
    ],
  );
}
