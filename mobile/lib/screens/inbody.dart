// Add an InBody scan: the numbers from the printout (same fields the coach
// sees on the dashboard) and a photo of the report. Closes the coach's
// pending request, if there is one.

import 'dart:convert';

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:material_ui/material_ui.dart';

import '../app/format.dart';
import '../app/l10n.dart';
import '../app/theme.dart';
import '../data/models.dart';
import '../data/schedule.dart';
import '../data/store.dart';
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

  Future<void> _pick(ImageSource source) async {
    try {
      final file = await ImagePicker().pickImage(source: source, maxWidth: 1600, maxHeight: 1600, imageQuality: 70);
      if (file == null) return;
      final bytes = await file.readAsBytes();
      if (bytes.length > 2 * 1024 * 1024) {
        if (mounted) toast(context, t('inbody.photoTooBig'));
        return;
      }
      setState(() {
        _photo = bytes;
        _photoName = file.name;
      });
    } on PlatformException {
      if (mounted) toast(context, t('inbody.photoError'));
    }
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
      fileName: _photo == null ? null : (_photoName ?? 'inbody.jpg'),
      fileType: _photo == null ? null : 'image/jpeg',
      dataUrl: _photo == null ? null : 'data:image/jpeg;base64,${base64Encode(_photo!)}',
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
          GridView.count(
            padding: EdgeInsets.zero,
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 2.05,
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
                  decoration: InputDecoration(
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
          if (_photo != null)
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
