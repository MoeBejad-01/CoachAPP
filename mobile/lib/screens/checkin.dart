// The weekly check-in (same fields as the dashboard's check-ins: weight,
// sleep, energy, stress, soreness, comment) and a quick weigh-in.

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../app/format.dart';
import '../app/l10n.dart';
import '../app/theme.dart';
import '../data/models.dart';
import '../data/schedule.dart';
import '../data/store.dart';
import '../widgets/ui.dart';

class CheckInSheet extends StatefulWidget {
  const CheckInSheet({super.key});

  static Future<void> open(BuildContext context) async {
    final sent = await showAppSheet<bool>(context, (_) => const CheckInSheet());
    if (sent == true && context.mounted) toast(context, t('checkin.sent', {'name': context.store.s.coach.firstName}));
  }

  @override
  State<CheckInSheet> createState() => _CheckInSheetState();
}

class _CheckInSheetState extends State<CheckInSheet> {
  late double _kg;
  double _sleep = 7.5;
  int _energy = 3, _stress = 2, _soreness = 2;
  final _comment = TextEditingController();

  @override
  void initState() {
    super.initState();
    final s = context.store.s;
    _kg = latestWeight(s) ?? 70;
    if (s.checkins.isNotEmpty) _sleep = (s.checkins.last.sleepH * 2).round() / 2;
  }

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  void _send() {
    context.store.submitCheckin(
      CheckIn(
        id: newId('c'),
        date: Day.today,
        weightKg: double.parse(_kg.toStringAsFixed(1)),
        sleepH: _sleep,
        energy: _energy,
        stress: _stress,
        soreness: _soreness,
        comment: _comment.text.trim(),
      ),
    );
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
        children: [
          Text(t('checkin.title'), style: context.text.headlineSmall),
          const SizedBox(height: 4),
          Text(t('checkin.sub', {'name': coach}), style: context.text.bodyMedium?.copyWith(color: c.muted)),
          const SizedBox(height: 22),
          _Label(t('checkin.weight')),
          WeightDial(value: _kg, onChanged: (v) => setState(() => _kg = v)),
          const SizedBox(height: 22),
          _Label(t('checkin.sleep'), trailing: t('unit.hValue', {'v': Fmt.number(_sleep)})),
          CupertinoSlider(value: _sleep, min: 3, max: 11, divisions: 16, activeColor: c.primary, onChanged: (v) => setState(() => _sleep = v)),
          const SizedBox(height: 18),
          _Scale(label: t('checkin.energy'), low: t('scale.low'), high: t('scale.high'), value: _energy, onChanged: (v) => setState(() => _energy = v)),
          _Scale(label: t('checkin.stress'), low: t('scale.low'), high: t('scale.high'), value: _stress, onChanged: (v) => setState(() => _stress = v)),
          _Scale(label: t('checkin.soreness'), low: t('scale.low'), high: t('scale.high'), value: _soreness, onChanged: (v) => setState(() => _soreness = v)),
          const SizedBox(height: 6),
          _Label(t('checkin.comment')),
          TextField(
            controller: _comment,
            minLines: 3,
            maxLines: 6,
            maxLength: 2000,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(hintText: t('checkin.commentHint', {'name': coach}), counterText: ''),
          ),
          const SizedBox(height: 22),
          PrimaryButton(t('checkin.send', {'name': coach}), icon: CupertinoIcons.paperplane_fill, onPressed: _send),
        ],
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text, {this.trailing});
  final String text;
  final String? trailing;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      children: [
        Expanded(child: Text(text, style: context.text.titleSmall)),
        if (trailing != null) Text(trailing!, style: context.text.titleSmall?.copyWith(color: context.c.primary)),
      ],
    ),
  );
}

class _Scale extends StatelessWidget {
  const _Scale({required this.label, required this.low, required this.high, required this.value, required this.onChanged});
  final String label, low, high;
  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: context.text.titleSmall),
          const SizedBox(height: 8),
          Semantics(
            label: label,
            value: '$value / 5',
            child: Row(
              children: [
                for (var n = 1; n <= 5; n++)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: Pressable(
                        onTap: () => onChanged(n),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 160),
                          height: 44,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: value == n ? Tokens.fill : c.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: value == n ? Colors.transparent : c.line),
                          ),
                          child: Text(
                            '$n',
                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: value == n ? Colors.white : c.text),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Text(low, style: context.text.bodySmall?.copyWith(fontSize: 12)),
              const Spacer(),
              Text(high, style: context.text.bodySmall?.copyWith(fontSize: 12)),
            ],
          ),
        ],
      ),
    );
  }
}

/// A big kg readout with fine and coarse steps (0.1 and 1 kg).
class WeightDial extends StatelessWidget {
  const WeightDial({super.key, required this.value, required this.onChanged});
  final double value;
  final ValueChanged<double> onChanged;

  void _by(double d) {
    HapticFeedback.selectionClick();
    onChanged(double.parse((value + d).clamp(25, 300).toStringAsFixed(1)));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    Widget btn(String label, double d) => Pressable(
      onTap: () => _by(d),
      child: Container(
        width: 52,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: c.primarySoft, borderRadius: BorderRadius.circular(12)),
        child: Text(
          label,
          style: TextStyle(color: c.primary, fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
    );
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      child: Directionality(
        textDirection: TextDirection.ltr,
        child: Row(
          children: [
            btn('−1', -1),
            const SizedBox(width: 6),
            btn('−.1', -0.1),
            Expanded(
              child: Column(
                children: [
                  Text(value.toStringAsFixed(1), style: context.text.displaySmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
                  Text(t('unit.kg'), style: context.text.bodySmall),
                ],
              ),
            ),
            btn('+.1', 0.1),
            const SizedBox(width: 6),
            btn('+1', 1),
          ],
        ),
      ),
    );
  }
}

class WeightSheet extends StatefulWidget {
  const WeightSheet({super.key});

  static Future<void> open(BuildContext context) async {
    final saved = await showAppSheet<bool>(context, (_) => const WeightSheet());
    if (saved == true && context.mounted) toast(context, t('weight.saved'));
  }

  @override
  State<WeightSheet> createState() => _WeightSheetState();
}

class _WeightSheetState extends State<WeightSheet> {
  late double _kg = latestWeight(context.store.s) ?? 70;

  @override
  Widget build(BuildContext context) => SafeArea(
    child: Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(t('weight.title'), style: context.text.headlineSmall),
          const SizedBox(height: 4),
          Text(t('weight.sub'), style: context.text.bodyMedium?.copyWith(color: context.c.muted)),
          const SizedBox(height: 18),
          WeightDial(value: _kg, onChanged: (v) => setState(() => _kg = v)),
          const SizedBox(height: 20),
          PrimaryButton(
            t('common.save'),
            onPressed: () {
              context.store.logWeight(_kg);
              HapticFeedback.mediumImpact();
              Navigator.pop(context, true);
            },
          ),
        ],
      ),
    ),
  );
}
