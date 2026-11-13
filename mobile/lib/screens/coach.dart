// Coach: chat with the coach (the same thread as the dashboard's Messages),
// the coach's shared notes, and the next booked session.

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../app/format.dart';
import '../app/l10n.dart';
import '../app/theme.dart';
import '../data/models.dart';
import '../data/store.dart';
import '../widgets/ui.dart';

class CoachScreen extends StatefulWidget {
  const CoachScreen({super.key});
  @override
  State<CoachScreen> createState() => _CoachScreenState();
}

class _CoachScreenState extends State<CoachScreen> {
  final _text = TextEditingController();
  final _scroll = ScrollController();
  final _focus = FocusNode();
  int _seenCount = -1;

  @override
  void dispose() {
    _text.dispose();
    _scroll.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _send([String? quick]) {
    final text = quick ?? _text.text;
    if (text.trim().isEmpty) return;
    context.store.sendMessage(text);
    HapticFeedback.lightImpact();
    if (quick == null) _text.clear();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final store = context.store;
        final s = store.s;
        final c = context.c;
        // Mark the coach's messages as seen while this tab is on screen.
        if (Visibility.of(context) && s.messages.length != _seenCount) {
          _seenCount = s.messages.length;
          WidgetsBinding.instance.addPostFrameCallback((_) => store.markSeen());
        }
        final msgs = s.messages;
        final lastMine = msgs.lastIndexWhere((m) => !m.fromCoach);
        final tabBar = MediaQuery.paddingOf(context).bottom; // already includes the tab bar
        final keyboard = MediaQuery.viewInsetsOf(context).bottom;

        return Scaffold(
          backgroundColor: c.bg,
          resizeToAvoidBottomInset: false,
          body: Column(
            children: [
              _Header(coach: s.coach, sessions: s.sessions),
              Expanded(
                child: ListView.builder(
                  controller: _scroll,
                  reverse: true,
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                  itemCount: msgs.length + (s.notes.isEmpty ? 0 : 1),
                  itemBuilder: (context, i) {
                    if (i == msgs.length) return _Notes(notes: s.notes, coach: s.coach);
                    final idx = msgs.length - 1 - i;
                    final m = msgs[idx];
                    final prev = idx > 0 ? msgs[idx - 1] : null;
                    final newDay = prev == null || Day.iso(Stamp.parse(prev.at)) != Day.iso(Stamp.parse(m.at));
                    return Column(
                      children: [
                        if (newDay)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            child: Text(Fmt.relativeDay(Day.iso(Stamp.parse(m.at))), style: context.text.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                          ),
                        _Bubble(
                          m: m,
                          status: idx == lastMine
                              ? (store.isPending(m.id) ? t('chat.sending') : (m.read ? t('chat.seen', {'name': s.coach.firstName}) : t('chat.delivered')))
                              : null,
                          tail: idx == msgs.length - 1 || msgs[idx + 1].fromCoach != m.fromCoach,
                        ),
                      ],
                    );
                  },
                ),
              ),
              if (msgs.isEmpty || msgs.last.fromCoach)
                SizedBox(
                  height: 40,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    children: [
                      for (final k in ['chat.quick.done', 'chat.quick.sore', 'chat.quick.call', 'chat.quick.thanks'])
                        Padding(
                          padding: const EdgeInsetsDirectional.only(end: 8),
                          child: ActionChip(
                            label: Text(t(k)),
                            onPressed: () => _send(t(k)),
                            shape: const StadiumBorder(),
                            side: BorderSide(color: c.line),
                            backgroundColor: c.surface,
                            labelStyle: TextStyle(color: c.text, fontWeight: FontWeight.w500),
                          ),
                        ),
                    ],
                  ),
                ),
              Container(
                padding: EdgeInsets.fromLTRB(12, 8, 8, 8 + (keyboard > 0 ? keyboard : tabBar)),
                decoration: BoxDecoration(
                  color: c.bg,
                  border: Border(top: BorderSide(color: c.hairline)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _text,
                        focusNode: _focus,
                        minLines: 1,
                        maxLines: 5,
                        textCapitalization: TextCapitalization.sentences,
                        onChanged: (_) => setState(() {}),
                        decoration: InputDecoration(
                          hintText: t('chat.placeholder', {'name': s.coach.firstName}),
                          fillColor: c.surface,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(22),
                            borderSide: BorderSide(color: c.line),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(22),
                            borderSide: BorderSide(color: c.line),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(22),
                            borderSide: BorderSide(color: c.primary),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    AnimatedScale(
                      scale: _text.text.trim().isEmpty ? 0.85 : 1,
                      duration: const Duration(milliseconds: 150),
                      child: IconButton.filled(
                        tooltip: t('chat.send'),
                        onPressed: _text.text.trim().isEmpty ? null : _send,
                        style: IconButton.styleFrom(backgroundColor: Tokens.fill, disabledBackgroundColor: c.line, fixedSize: const Size(44, 44)),
                        icon: Icon(context.settings.isArabic ? CupertinoIcons.arrow_left : CupertinoIcons.arrow_up, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.coach, required this.sessions});
  final CoachInfo coach;
  final List<CoachSession> sessions;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final now = DateTime.now();
    final next = sessions.where((x) => x.startDate.isAfter(now)).firstOrNull;
    return Container(
      decoration: BoxDecoration(
        color: c.bg,
        border: Border(bottom: BorderSide(color: c.hairline)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: Column(
            children: [
              Row(
                children: [
                  Stack(
                    children: [
                      Avatar(coach.initials, size: 48),
                      PositionedDirectional(
                        end: 0,
                        bottom: 0,
                        child: Container(
                          width: 13,
                          height: 13,
                          decoration: BoxDecoration(
                            color: Tokens.glow,
                            shape: BoxShape.circle,
                            border: Border.all(color: c.bg, width: 2),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(coach.name, style: context.text.titleMedium),
                        Text([coach.title, coach.businessName].where((x) => x.isNotEmpty).join(' · '), style: context.text.bodySmall),
                      ],
                    ),
                  ),
                ],
              ),
              if (next != null) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                  decoration: BoxDecoration(color: c.tint, borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    children: [
                      Icon(next.location == 'Video call' ? CupertinoIcons.video_camera_solid : CupertinoIcons.calendar, size: 16, color: c.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          t('coach.next', {'title': next.title, 'day': Fmt.relativeDay(Day.iso(next.startDate)), 'time': Fmt.time(next.startDate)}),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.text.bodySmall?.copyWith(color: c.text2, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.m, required this.status, required this.tail});
  final Message m;
  final String? status;
  final bool tail;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final mine = !m.fromCoach;
    final r = const Radius.circular(20);
    final small = const Radius.circular(6);
    return Padding(
      padding: EdgeInsets.only(bottom: tail ? 8 : 2),
      child: Column(
        crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          ConstrainedBox(
            constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.76),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: mine ? Tokens.fill : c.surface,
                borderRadius: BorderRadiusDirectional.only(topStart: r, topEnd: r, bottomStart: !mine && tail ? small : r, bottomEnd: mine && tail ? small : r),
                border: mine || !c.dark ? null : Border.all(color: c.hairline),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  FreeText(m.text, style: TextStyle(fontSize: 16, height: 1.35, color: mine ? Colors.white : c.text)),
                  const SizedBox(height: 3),
                  Text(Fmt.time(Stamp.parse(m.at)), style: TextStyle(fontSize: 11, color: mine ? Colors.white70 : c.faint)),
                ],
              ),
            ),
          ),
          if (status != null)
            Padding(
              padding: const EdgeInsets.only(top: 3, left: 6, right: 6),
              child: Text(status!, style: context.text.bodySmall?.copyWith(fontSize: 11.5)),
            ),
        ],
      ),
    );
  }
}

class _Notes extends StatelessWidget {
  const _Notes({required this.notes, required this.coach});
  final List<Note> notes;
  final CoachInfo coach;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 4, 4, 8),
            child: Row(
              children: [
                Icon(CupertinoIcons.pin_fill, size: 14, color: c.primary),
                const SizedBox(width: 6),
                Text(t('coach.notes', {'name': coach.firstName}), style: context.text.titleSmall),
              ],
            ),
          ),
          for (final n in notes.take(3)) ...[
            AppCard(
              padding: const EdgeInsets.all(14),
              color: c.tint,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  FreeText(n.text, style: context.text.bodyMedium),
                  const SizedBox(height: 6),
                  Text(Fmt.relativeDay(Day.iso(Stamp.parse(n.at))), style: context.text.bodySmall),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}
