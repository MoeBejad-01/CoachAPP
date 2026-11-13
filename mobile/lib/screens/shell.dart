// The signed-in app: five tabs under a frosted tab bar (like the website's
// glass nav), plus a "workout in progress" bar while a session is open.

import 'dart:ui';

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';

import '../app/format.dart';
import '../app/l10n.dart';
import '../app/theme.dart';
import '../data/schedule.dart';
import '../data/store.dart';
import '../widgets/ui.dart';
import 'coach.dart';
import 'me.dart';
import 'progress.dart';
import 'today.dart';
import 'train.dart';
import 'workout.dart';

enum AppTab { today, train, progress, coach, me }

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  /// Switch tabs from anywhere inside the app.
  static void go(BuildContext context, AppTab tab) => context.findAncestorStateOfType<_AppShellState>()?._select(tab);

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  AppTab _tab = AppTab.today;
  final _navKeys = {for (final t in AppTab.values) t: GlobalKey<NavigatorState>()};

  void _select(AppTab t) {
    if (t == _tab) {
      // Tapping the current tab again goes back to its first screen.
      _navKeys[t]!.currentState?.popUntil((r) => r.isFirst);
      return;
    }
    HapticFeedback.selectionClick();
    setState(() => _tab = t);
  }

  Widget _page(AppTab t) => switch (t) {
    AppTab.today => const TodayScreen(),
    AppTab.train => const TrainScreen(),
    AppTab.progress => const ProgressScreen(),
    AppTab.coach => const CoachScreen(),
    AppTab.me => const MeScreen(),
  };

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        final nav = _navKeys[_tab]!.currentState;
        if (nav != null && nav.canPop()) {
          nav.pop();
        } else if (_tab != AppTab.today) {
          setState(() => _tab = AppTab.today);
        } else {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        extendBody: true,
        body: Stack(
          children: [
            IndexedStack(
              index: _tab.index,
              children: [
                for (final t in AppTab.values)
                  HeroControllerScope.none(
                    child: Navigator(
                      key: _navKeys[t],
                      onGenerateRoute: (_) => MaterialPageRoute(builder: (_) => _page(t)),
                    ),
                  ),
              ],
            ),
            const Positioned(left: 0, right: 0, bottom: 0, child: _ResumeBar()),
          ],
        ),
        bottomNavigationBar: _TabBar(current: _tab, onSelect: _select),
      ),
    );
  }
}

class _TabBar extends StatelessWidget {
  const _TabBar({required this.current, required this.onSelect});
  final AppTab current;
  final ValueChanged<AppTab> onSelect;

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final c = context.c;
        final unread = unseenFromCoach(context.store.s);
        final items = [
          (AppTab.today, CupertinoIcons.sun_max, CupertinoIcons.sun_max_fill, t('tab.today')),
          (AppTab.train, CupertinoIcons.flame, CupertinoIcons.flame_fill, t('tab.train')),
          (AppTab.progress, CupertinoIcons.chart_bar_alt_fill, CupertinoIcons.chart_bar_alt_fill, t('tab.progress')),
          (AppTab.coach, CupertinoIcons.chat_bubble_2, CupertinoIcons.chat_bubble_2_fill, t('tab.coach')),
          (AppTab.me, CupertinoIcons.person_crop_circle, CupertinoIcons.person_crop_circle_fill, t('tab.me')),
        ];
        return ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
            child: Container(
              decoration: BoxDecoration(
                color: c.surface.withValues(alpha: c.dark ? 0.72 : 0.8),
                border: Border(top: BorderSide(color: c.hairline)),
              ),
              child: SafeArea(
                top: false,
                child: SizedBox(
                  height: 56,
                  child: Row(
                    children: [
                      for (final (tab, icon, active, label) in items)
                        Expanded(
                          child: Semantics(
                            selected: tab == current,
                            button: true,
                            label: label,
                            child: InkResponse(
                              onTap: () => onSelect(tab),
                              radius: 36,
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Badge(
                                    isLabelVisible: tab == AppTab.coach && unread > 0,
                                    label: Text('$unread'),
                                    backgroundColor: c.error,
                                    child: AnimatedScale(
                                      scale: tab == current ? 1.08 : 1,
                                      duration: const Duration(milliseconds: 180),
                                      child: Icon(tab == current ? active : icon, size: 24, color: tab == current ? c.primary : c.faint),
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    label,
                                    maxLines: 1,
                                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: tab == current ? c.primary : c.faint),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Floating bar to get back into an open workout.
class _ResumeBar extends StatelessWidget {
  const _ResumeBar();

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final d = context.store.draft;
        final bottom = MediaQuery.paddingOf(context).bottom + 10;
        return AnimatedSlide(
          offset: d == null ? const Offset(0, 1.6) : Offset.zero,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
          child: d == null
              ? const SizedBox(height: 0)
              : Padding(
                  padding: EdgeInsets.fromLTRB(16, 0, 16, bottom),
                  child: AppCard(
                    gradient: Tokens.brandGradient,
                    padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
                    onTap: () => WorkoutScreen.open(context),
                    child: Row(
                      children: [
                        const Icon(CupertinoIcons.timer, color: Colors.white, size: 22),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t('resume.title', {'day': d.dayName}),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15),
                              ),
                              Text(
                                t('resume.sub', {'done': d.doneSets, 'total': d.totalSets, 'time': Fmt.minutes(d.elapsedMinutes)}),
                                style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(99)),
                          child: Text(
                            t('resume.action'),
                            style: const TextStyle(color: Tokens.brand, fontWeight: FontWeight.w700, fontSize: 14),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
        );
      },
    );
  }
}

/// Large-title page scaffold used by every tab: a title that scrolls away,
/// pull to refresh, and room at the bottom for the tab bar.
class TabPage extends StatelessWidget {
  const TabPage({super.key, required this.title, required this.children, this.subtitle, this.trailing, this.leading});
  final String title;
  final String? subtitle;
  final Widget? trailing, leading;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final bottom = MediaQuery.paddingOf(context).bottom + 28 + (context.store.draft == null ? 0 : 76);
    final top = MediaQuery.paddingOf(context).top;
    return Scaffold(
      backgroundColor: c.bg,
      body: Stack(
        children: [
          RefreshIndicator.adaptive(
            onRefresh: context.store.refresh,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
              slivers: [
                SliverSafeArea(
                  bottom: false,
                  sliver: SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
                    sliver: SliverToBoxAdapter(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          if (leading != null) ...[leading!, const SizedBox(width: 12)],
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (subtitle != null) Text(subtitle!, style: context.text.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                                Text(title, style: context.text.displaySmall),
                              ],
                            ),
                          ),
                          ?trailing,
                        ],
                      ),
                    ),
                  ),
                ),
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(16, 4, 16, bottom),
                  sliver: SliverList.list(children: children),
                ),
              ],
            ),
          ),
          // Frosted strip behind the status bar so content doesn't run under the clock.
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: top,
            child: ClipRect(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                child: ColoredBox(color: c.bg.withValues(alpha: 0.82)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A small "Synced · 2 min ago" / "Offline" indicator.
class SyncDot extends StatelessWidget {
  const SyncDot({super.key});

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final store = context.store;
        final c = context.c;
        final (color, label) = switch (store.sync) {
          SyncState.offline => (c.warn, store.pending > 0 ? tn('sync.waiting', store.pending) : t('sync.offline')),
          SyncState.syncing => (c.primary, t('sync.syncing')),
          SyncState.synced => (c.success, t('sync.live')),
        };
        return Semantics(
          label: label,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(99)),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _Pulse(color: color, active: store.sync != SyncState.offline),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Pulse extends StatefulWidget {
  const _Pulse({required this.color, required this.active});
  final Color color;
  final bool active;
  @override
  State<_Pulse> createState() => _PulseState();
}

class _PulseState extends State<_Pulse> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 10,
    height: 10,
    child: AnimatedBuilder(
      animation: _c,
      builder: (_, _) => Stack(
        alignment: Alignment.center,
        children: [
          if (widget.active && !MediaQuery.disableAnimationsOf(context))
            Container(
              width: 10 * (0.6 + _c.value * 0.9),
              height: 10 * (0.6 + _c.value * 0.9),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: widget.color.withValues(alpha: (1 - _c.value) * 0.45),
              ),
            ),
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(shape: BoxShape.circle, color: widget.color),
          ),
        ],
      ),
    ),
  );
}
