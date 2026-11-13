// Me: profile, goals, membership (shown only: payment is between trainee
// and coach, as on the website), language, appearance, sync and sign out.

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:material_ui/material_ui.dart';

import '../app/format.dart';
import '../app/l10n.dart';
import '../app/settings.dart';
import '../app/theme.dart';
import '../data/api.dart';
import '../data/schedule.dart';
import '../data/store.dart';
import '../widgets/ui.dart';
import 'checkin.dart';
import 'inbody.dart';
import 'shell.dart';
import 'today.dart';

class MeScreen extends StatelessWidget {
  const MeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final store = context.store;
        final settings = context.settings;
        final s = store.s;
        final tr = s.trainee;
        final c = context.c;
        final m = tr.membership;
        return TabPage(
          title: t('tab.me'),
          children: [
            const SizedBox(height: 8),
            AppCard(
              gradient: Tokens.brandGradient,
              child: Row(
                children: [
                  Avatar(tr.initials, size: 64, ring: true),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(tr.fullName, style: context.text.headlineSmall?.copyWith(color: Colors.white)),
                        const SizedBox(height: 2),
                        Text(tr.email, style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 14)),
                        const SizedBox(height: 8),
                        Text(
                          t('me.since', {'name': s.coach.name, 'date': Fmt.monthYear(Stamp.parse(tr.joinedAt))}),
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: StatTile(label: t('me.sessions'), value: Fmt.number(s.logs.length), icon: CupertinoIcons.flame_fill),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: StatTile(
                    label: t('me.adherence'),
                    value: adherence(s) == null ? '–' : Fmt.percent(adherence(s)!),
                    icon: CupertinoIcons.checkmark_seal_fill,
                    tone: c.success,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: StatTile(
                    label: t('me.prs'),
                    value: Fmt.number(prEvents(s.logs).length),
                    icon: CupertinoIcons.star_fill,
                    tone: const Color(0xFFF5B400),
                  ),
                ),
              ],
            ),
            if (tr.goals.isNotEmpty) ...[
              SectionHeader(t('today.goals')),
              AppCard(
                child: Column(
                  children: [
                    for (var i = 0; i < tr.goals.length; i++) ...[if (i > 0) const SizedBox(height: 18), GoalRow(goal: tr.goals[i])],
                  ],
                ),
              ),
            ],
            SectionHeader(t('me.coaching')),
            GroupCard(
              children: [
                RowTile(icon: CupertinoIcons.person_2_fill, title: t('mode.${tr.mode}'), subtitle: t('me.mode')),
                RowTile(
                  icon: CupertinoIcons.square_list,
                  title: t('checkin.title'),
                  subtitle: t('checkins.day', {'day': Fmt.weekdayShort(Day.date(Day.add(Day.startOfWeek(Day.today), (tr.checkinDay + 6) % 7)))}),
                  onTap: () => CheckInSheet.open(context),
                ),
                RowTile(
                  icon: CupertinoIcons.waveform_path_ecg,
                  iconColor: Tokens.accent,
                  title: t('body.addScan'),
                  subtitle: tn('me.scans', s.inbody.length),
                  onTap: () => InBodySheet.open(context, request: pendingInBody(s)),
                ),
                RowTile(
                  icon: CupertinoIcons.gauge,
                  title: t('body.logWeight'),
                  subtitle: latestWeight(s) == null ? null : Fmt.kg(latestWeight(s)!),
                  onTap: () => WeightSheet.open(context),
                ),
                if (tr.injuries.trim().isNotEmpty) RowTile(icon: CupertinoIcons.bandage, iconColor: c.error, title: t('me.injuries'), subtitle: tr.injuries),
              ],
            ),
            if (m != null) ...[
              SectionHeader(t('me.membership')),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(m.plan, style: context.text.titleMedium)),
                        Text(
                          t(m.cycle == 'quarterly' ? 'me.perQuarter' : 'me.perMonth', {'price': Fmt.money(m.price, s.coach.currency)}),
                          style: context.text.titleMedium?.copyWith(color: c.primary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(t('me.renews', {'day': Fmt.relativeDay(m.renewsOn)}), style: context.text.bodySmall),
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(CupertinoIcons.creditcard, size: 16, color: c.muted),
                        const SizedBox(width: 8),
                        Expanded(child: Text(t('me.payNote', {'name': s.coach.firstName}), style: context.text.bodySmall)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
            SectionHeader(t('me.settings')),
            GroupCard(
              children: [
                RowTile(
                  icon: CupertinoIcons.globe,
                  title: t('me.language'),
                  trailing: _Segment<Lang>(value: settings.lang, items: {for (final l in Lang.values) l: l.nativeName}, onChanged: (v) => settings.lang = v),
                ),
                RowTile(
                  icon: CupertinoIcons.circle_lefthalf_fill,
                  title: t('me.appearance'),
                  trailing: _Segment<Appearance>(
                    value: settings.appearance,
                    items: {for (final a in Appearance.values) a: t('appearance.${a.name}')},
                    onChanged: (v) => settings.appearance = v,
                  ),
                ),
                RowTile(
                  icon: CupertinoIcons.arrow_2_circlepath,
                  iconColor: c.success,
                  title: t('me.sync'),
                  subtitle: _syncLine(store),
                  trailing: const SyncDot(),
                  onTap: store.refresh,
                ),
                RowTile(
                  icon: CupertinoIcons.antenna_radiowaves_left_right,
                  iconColor: c.muted,
                  title: t('me.server'),
                  subtitle: settings.server,
                  onTap: () => ServerSheet.open(context),
                ),
              ],
            ),
            const SizedBox(height: 16),
            GroupCard(
              children: [
                RowTile(
                  icon: CupertinoIcons.square_arrow_left,
                  iconColor: c.error,
                  title: t('me.signOut'),
                  destructive: true,
                  trailing: const SizedBox.shrink(),
                  onTap: () async {
                    final ok = await showCupertinoDialog<bool>(
                      context: context,
                      builder: (c) => CupertinoAlertDialog(
                        title: Text(t('me.signOut.title')),
                        content: Text(store.pending > 0 ? tn('me.signOut.pending', store.pending) : t('me.signOut.body')),
                        actions: [
                          CupertinoDialogAction(onPressed: () => Navigator.pop(c, false), child: Text(t('common.cancel'))),
                          CupertinoDialogAction(isDestructiveAction: true, onPressed: () => Navigator.pop(c, true), child: Text(t('me.signOut'))),
                        ],
                      ),
                    );
                    if (ok == true) await store.signOut();
                  },
                ),
              ],
            ),
            const SizedBox(height: 18),
            Center(child: Text(t('me.version', {'v': '0.1.0'}), style: context.text.bodySmall)),
          ],
        );
      },
    );
  }

  String _syncLine(TraineeStore store) {
    if (store.pending > 0 && store.sync == SyncState.offline) return tn('sync.waiting', store.pending);
    if (store.lastSynced == null) return t('sync.never');
    return t('sync.last', {'when': Fmt.ago(store.lastSynced!)});
  }
}

class _Segment<T> extends StatelessWidget {
  const _Segment({required this.value, required this.items, required this.onChanged});
  final T value;
  final Map<T, String> items;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) => PopupMenuButton<T>(
    initialValue: value,
    onSelected: onChanged,
    position: PopupMenuPosition.under,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    itemBuilder: (_) => [for (final e in items.entries) CheckedPopupMenuItem(value: e.key, checked: e.key == value, child: Text(e.value))],
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(items[value] ?? '', style: TextStyle(color: context.c.muted, fontSize: 15)),
        const SizedBox(width: 4),
        Icon(CupertinoIcons.chevron_up_chevron_down, size: 14, color: context.c.faint),
      ],
    ),
  );
}

/// Where the sync API lives (the web dev server). Mostly for development.
class ServerSheet extends StatefulWidget {
  const ServerSheet({super.key});
  static Future<void> open(BuildContext context) => showAppSheet(context, (_) => const ServerSheet());
  @override
  State<ServerSheet> createState() => _ServerSheetState();
}

class _ServerSheetState extends State<ServerSheet> {
  late final _ctl = TextEditingController(text: context.settings.server);
  bool? _ok;
  bool _testing = false;

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }

  Future<void> _test() async {
    setState(() => _testing = true);
    final ok = await Api.reachable(_ctl.text.trim().replaceAll(RegExp(r'/+$'), ''));
    if (!mounted) return;
    setState(() {
      _ok = ok;
      _testing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(t('server.title'), style: context.text.headlineSmall),
            const SizedBox(height: 4),
            Text(t('server.body'), style: context.text.bodyMedium?.copyWith(color: c.muted)),
            const SizedBox(height: 16),
            TextField(
              controller: _ctl,
              keyboardType: TextInputType.url,
              autocorrect: false,
              textDirection: TextDirection.ltr,
              decoration: InputDecoration(labelText: t('server.label'), hintText: AppSettings.defaultServer),
              onChanged: (_) => setState(() => _ok = null),
            ),
            const SizedBox(height: 10),
            if (_ok != null)
              Row(
                children: [
                  Icon(_ok! ? CupertinoIcons.checkmark_circle_fill : CupertinoIcons.exclamationmark_triangle_fill, size: 16, color: _ok! ? c.success : c.warn),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(t(_ok! ? 'server.ok' : 'server.fail'), style: context.text.bodySmall?.copyWith(color: _ok! ? c.success : c.warn)),
                  ),
                ],
              ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(child: SecondaryButton(t('server.test'), onPressed: _testing ? null : _test)),
                const SizedBox(width: 10),
                Expanded(
                  child: PrimaryButton(
                    t('common.save'),
                    onPressed: () {
                      context.settings.server = _ctl.text;
                      context.store.refresh();
                      Navigator.pop(context);
                    },
                  ),
                ),
              ],
            ),
            TextButton(
              onPressed: () => setState(() {
                _ctl.text = AppSettings.defaultServer;
                _ok = null;
              }),
              child: Text(t('server.reset')),
            ),
          ],
        ),
      ),
    );
  }
}
