// Body: learn how you move. Tap a muscle on the website's body map to see why
// it matters, the best moves for it (with technique videos), a pro tip and a
// stretch. Then short videos, Training 101, healthy habits and a muscle quiz.

import 'dart:async';
import 'dart:math' as math;

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:video_player/video_player.dart';

import '../app/content.dart';
import '../app/format.dart';
import '../app/l10n.dart';
import '../app/theme.dart';
import '../data/health_videos.dart';
import '../data/models.dart';
import '../data/schedule.dart';
import '../data/store.dart';
import '../widgets/anatomy_shapes.dart';
import '../widgets/body_explorer.dart';
import '../widgets/glyph.dart';
import '../widgets/muscle_badge.dart';
import '../widgets/ui.dart';
import 'shell.dart';
import 'technique.dart';

class BodyScreen extends StatefulWidget {
  const BodyScreen({super.key});
  @override
  State<BodyScreen> createState() => _BodyScreenState();
}

class _BodyScreenState extends State<BodyScreen> {
  BodyView _view = BodyView.front;
  MuscleGroup? _muscle;

  @override
  Widget build(BuildContext context) {
    return Watch(
      builder: (context) {
        final s = context.store.s;
        final c = context.c;
        final week = setsByMuscle(s.logs.where((l) => l.date.compareTo(Day.add(Day.today, -6)) >= 0));
        final hi = week.values.fold(0.0, (a, b) => b > a ? b : a);
        final levels = hi == 0 ? week : week.map((g, v) => MapEntry(g, v / hi));
        return TabPage(
          title: t('tab.body'),
          subtitle: t('body.subtitle'),
          children: [
            const SizedBox(height: 8),
            AppCard(
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: CupertinoSlidingSegmentedControl<BodyView>(
                      groupValue: _view,
                      backgroundColor: c.dark ? c.surface2 : const Color(0x14767680),
                      thumbColor: c.dark ? const Color(0xFF636366) : Colors.white,
                      onValueChanged: (v) {
                        HapticFeedback.selectionClick();
                        setState(() => _view = v ?? _view);
                      },
                      children: {BodyView.front: _Seg(t('body.front')), BodyView.back: _Seg(t('body.back'))},
                    ),
                  ),
                  const SizedBox(height: 6),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 450),
                    transitionBuilder: (child, anim) => AnimatedBuilder(
                      animation: anim,
                      child: child,
                      builder: (_, child) {
                        final a = (1 - anim.value) * math.pi / 2;
                        return Transform(
                          alignment: Alignment.center,
                          transform: Matrix4.identity()
                            ..setEntry(3, 2, 0.0015)
                            ..rotateY(a),
                          child: Opacity(opacity: anim.value, child: child),
                        );
                      },
                    ),
                    child: BodyExplorer(
                      key: ValueKey(_view),
                      view: _view,
                      muscle: _muscle,
                      levels: levels,
                      height: 400,
                      onMuscle: (g) => setState(() => _muscle = g),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(color: c.primary.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(3)),
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(t('body.tintNote'), textAlign: TextAlign.center, style: context.text.bodySmall?.copyWith(fontSize: 12)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            AnimatedSize(
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeOutCubic,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: KeyedSubtree(
                  key: ValueKey(_muscle),
                  child: _muscle == null ? const _Prompt() : _MuscleCard(group: _muscle!, sets: week[_muscle!] ?? 0),
                ),
              ),
            ),
            SectionHeader(t('video.title'), action: t('video.sub')),
            SizedBox(
              height: 196,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                clipBehavior: Clip.none,
                itemCount: healthVideos.length,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (context, i) => _VideoCard(video: healthVideos[i]),
              ),
            ),
            SectionHeader(t('learn.training'), action: t('learn.trainingSub')),
            _LessonGrid(lessons: trainingLessons()),
            SectionHeader(t('learn.habits')),
            _LessonGrid(lessons: habitLessons()),
            const SizedBox(height: 14),
            AppCard(
              gradient: Tokens.brandGradient,
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const QuizScreen())),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(16)),
                    child: const Icon(Sym.quiz, color: Colors.white, size: 30),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(t('quiz.title'), style: context.text.titleLarge?.copyWith(color: Colors.white)),
                        Text(t('quiz.sub'), style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 14)),
                      ],
                    ),
                  ),
                  const Icon(CupertinoIcons.chevron_forward, color: Colors.white),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(t('bites.disclaimer'), textAlign: TextAlign.center, style: context.text.bodySmall?.copyWith(fontSize: 12)),
          ],
        );
      },
    );
  }
}

class _Seg extends StatelessWidget {
  const _Seg(this.label);
  final String label;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Text(
      label,
      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: context.c.text),
    ),
  );
}

class _Prompt extends StatelessWidget {
  const _Prompt();
  @override
  Widget build(BuildContext context) => AppCard(
    child: Row(
      children: [
        const Glyph(Sym.touch, tone: Tone.blue, size: 48),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(t('body.prompt'), style: context.text.titleMedium),
              const SizedBox(height: 2),
              Text(t('body.promptSub'), style: context.text.bodyMedium?.copyWith(color: context.c.muted)),
            ],
          ),
        ),
      ],
    ),
  );
}

class _MuscleCard extends StatelessWidget {
  const _MuscleCard({required this.group, required this.sets});
  final MuscleGroup group;
  final double sets;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final m = muscleInfo(group);
    final tone = muscleTone[group]!;
    final program = context.store.s.trainee.program;
    // The trainee's own exercises for this muscle come first; they open the technique sheet.
    final mine = <String, Exercise>{
      if (program != null && program.plan.isNotEmpty)
        for (final d in program.plan[weekIndex(program, Day.today)].days)
          for (final e in d.exercises)
            if ((musclesFor(e.name)[group] ?? 0) >= 1) e.name: e,
    };
    final moves = mine.isNotEmpty ? mine.keys.take(4).toList() : m.moves;

    Widget section(IconData i, Tone tn, String title, String body) => Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Glyph.soft(i, tone: tn, size: 34),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: context.text.labelMedium?.copyWith(color: c.muted)),
                const SizedBox(height: 2),
                Text(body, style: context.text.bodyLarge),
              ],
            ),
          ),
        ],
      ),
    );

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              MuscleBadge(group, tone: tone, size: 52),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(m.name, style: context.text.headlineSmall),
                    Text(
                      m.nickname,
                      style: context.text.bodyMedium?.copyWith(color: tone.color, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              _SetsRing(sets: sets),
            ],
          ),
          section(Icons.bolt_rounded, Tone.blue, t('body.why'), m.why),
          Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Glyph.soft(Sym.strength, tone: Tone.orange, size: 34),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(t('body.moves'), style: context.text.labelMedium?.copyWith(color: c.muted)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final name in moves)
                            Pressable(
                              onTap: () => TechniqueSheet.open(context, name: name, exercise: mine[name]),
                              child: Container(
                                padding: const EdgeInsets.fromLTRB(10, 7, 12, 7),
                                decoration: BoxDecoration(
                                  color: c.surface2,
                                  borderRadius: BorderRadius.circular(99),
                                  border: Border.all(color: c.hairline),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.play_circle_fill_rounded, size: 17, color: c.primary),
                                    const SizedBox(width: 6),
                                    Text(
                                      name,
                                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: c.text),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
                      if (mine.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          t('body.inProgram'),
                          style: context.text.bodySmall?.copyWith(color: c.primary, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          section(Sym.idea, Tone.gold, t('body.tip'), m.tip),
          section(Sym.recover, Tone.purple, t('body.stretchTitle'), m.stretch),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(Tokens.rSmall + 2),
              gradient: LinearGradient(colors: [tone.colors[0].withValues(alpha: 0.16), tone.colors[1].withValues(alpha: 0.08)]),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.auto_awesome_rounded, size: 16, color: tone.color),
                    const SizedBox(width: 6),
                    Text(t('body.fact'), style: context.text.labelMedium?.copyWith(color: tone.color)),
                  ],
                ),
                const SizedBox(height: 6),
                Text(m.fact, style: context.text.bodyLarge?.copyWith(color: c.text)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Sets this week as a small ring (a full ring is 12 sets).
class _SetsRing extends StatelessWidget {
  const _SetsRing({required this.sets});
  final double sets;
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Column(
      children: [
        SizedBox(
          width: 48,
          height: 48,
          child: Stack(
            alignment: Alignment.center,
            children: [
              SizedBox.expand(
                child: CircularProgressIndicator(
                  value: (sets / 12).clamp(0.0, 1.0),
                  strokeWidth: 5,
                  strokeCap: StrokeCap.round,
                  color: c.primary,
                  backgroundColor: c.surface2,
                ),
              ),
              Text(Fmt.number(sets, digits: 0), style: context.text.titleSmall),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Text(t('body.setsShort'), style: context.text.bodySmall?.copyWith(fontSize: 11)),
      ],
    );
  }
}

// ---------- Videos ----------

class _VideoCard extends StatelessWidget {
  const _VideoCard({required this.video});
  final HealthVideo video;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return SizedBox(
      width: 230,
      child: Pressable(
        onTap: () => showAppSheet(context, (_) => VideoSheet(video: video)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(Tokens.r),
              child: Container(
                height: 128,
                decoration: BoxDecoration(
                  gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: video.tone.colors),
                ),
                child: Stack(
                  children: [
                    PositionedDirectional(end: -18, bottom: -22, child: Icon(video.icon, size: 130, color: Colors.white.withValues(alpha: 0.16))),
                    Center(
                      child: Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.92), shape: BoxShape.circle),
                        child: Icon(Sym.play, color: video.tone.colors[1], size: 32),
                      ),
                    ),
                    PositionedDirectional(
                      start: 10,
                      top: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.28), borderRadius: BorderRadius.circular(99)),
                        child: Text(
                          t('video.cat.${video.category}'),
                          style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                    PositionedDirectional(
                      end: 10,
                      bottom: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.4), borderRadius: BorderRadius.circular(8)),
                        child: Text(
                          t('video.min', {'n': video.minutes}),
                          style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(video.localTitle, maxLines: 2, overflow: TextOverflow.ellipsis, style: context.text.titleSmall),
            if (video.url == null) Text(t('video.soon'), style: context.text.bodySmall?.copyWith(color: c.faint)),
          ],
        ),
      ),
    );
  }
}

class VideoSheet extends StatefulWidget {
  const VideoSheet({super.key, required this.video});
  final HealthVideo video;
  @override
  State<VideoSheet> createState() => _VideoSheetState();
}

class _VideoSheetState extends State<VideoSheet> {
  VideoPlayerController? _ctl;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    final url = widget.video.url;
    if (url != null) {
      final v = VideoPlayerController.networkUrl(Uri.parse(url));
      _ctl = v;
      v
          .initialize()
          .then((_) {
            if (mounted) setState(v.play);
          })
          .catchError((Object _) {
            if (mounted) setState(() => _failed = true);
          });
    }
  }

  @override
  void dispose() {
    _ctl?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.video;
    final ctl = _ctl;
    final ready = ctl != null && ctl.value.isInitialized && !_failed;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(Tokens.r),
              child: AspectRatio(
                aspectRatio: ready ? ctl.value.aspectRatio : 16 / 9,
                child: ready
                    ? GestureDetector(onTap: () => setState(() => ctl.value.isPlaying ? ctl.pause() : ctl.play()), child: VideoPlayer(ctl))
                    : DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: v.tone.colors),
                        ),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (ctl != null && !_failed)
                                const CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5)
                              else
                                Icon(v.icon, color: Colors.white, size: 46),
                              const SizedBox(height: 10),
                              Text(
                                _failed ? t('tech.videoError') : (ctl == null ? t('video.soon') : t('tech.loading')),
                                style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700),
                              ),
                              if (ctl == null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Text(t('video.soonBody'), style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 14)),
                                ),
                            ],
                          ),
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 14),
            Text(v.localTitle, style: context.text.headlineSmall),
            const SizedBox(height: 4),
            Text('${t('video.cat.${v.category}')} · ${t('video.min', {'n': v.minutes})}', style: context.text.bodyMedium?.copyWith(color: context.c.muted)),
          ],
        ),
      ),
    );
  }
}

// ---------- Lessons (Training 101, healthy habits) ----------

class _LessonGrid extends StatelessWidget {
  const _LessonGrid({required this.lessons});
  final List<Lesson> lessons;

  Widget tile(BuildContext context, Lesson l) => AppCard(
    onTap: () => showAppSheet(context, (_) => LessonSheet(lesson: l)),
    padding: const EdgeInsets.all(14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Glyph(l.icon, tone: l.tone, size: 40),
        const SizedBox(height: 14),
        Text(l.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: context.text.titleSmall),
        const SizedBox(height: 3),
        Text(l.summary, maxLines: 3, overflow: TextOverflow.ellipsis, style: context.text.bodySmall),
      ],
    ),
  );

  // Two per row; both tiles in a row share the taller one's height.
  @override
  Widget build(BuildContext context) => Column(
    children: [
      for (var i = 0; i < lessons.length; i += 2) ...[
        if (i > 0) const SizedBox(height: 10),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: tile(context, lessons[i])),
              const SizedBox(width: 10),
              Expanded(child: i + 1 < lessons.length ? tile(context, lessons[i + 1]) : const SizedBox()),
            ],
          ),
        ),
      ],
    ],
  );
}

class LessonSheet extends StatelessWidget {
  const LessonSheet({super.key, required this.lesson});
  final Lesson lesson;

  @override
  Widget build(BuildContext context) => SafeArea(
    child: SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Glyph(lesson.icon, tone: lesson.tone, size: 56),
          const SizedBox(height: 12),
          Text(lesson.title, style: context.text.headlineSmall),
          const SizedBox(height: 2),
          Text(
            lesson.summary,
            style: context.text.bodyMedium?.copyWith(color: lesson.tone.color, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          for (var i = 0; i < lesson.points.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: lesson.tone.color.withValues(alpha: 0.14), shape: BoxShape.circle),
                    child: Text(
                      '${i + 1}',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: lesson.tone.color),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text(lesson.points[i], style: context.text.bodyLarge)),
                ],
              ),
            ),
          if (lesson.extra == 'breathing') ...[const SizedBox(height: 4), const _Breathing()],
          if (lesson.extra == 'rpe') ...[const SizedBox(height: 4), const _RpeScale()],
          const SizedBox(height: 10),
          Text(t('bites.disclaimer'), style: context.text.bodySmall?.copyWith(fontSize: 12)),
        ],
      ),
    ),
  );
}

/// Slide through RPE 6–10 to see what each one feels like.
class _RpeScale extends StatefulWidget {
  const _RpeScale();
  @override
  State<_RpeScale> createState() => _RpeScaleState();
}

class _RpeScaleState extends State<_RpeScale> {
  double _v = 8;
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final n = _v.round();
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text('$n', style: context.text.displaySmall?.copyWith(color: LevelBars.colorFor(n - 5, 5))),
              const SizedBox(width: 12),
              Expanded(child: Text(t('rpe.$n').split(' · ').last, style: context.text.titleMedium)),
              LevelBars(level: n - 5, max: 5, height: 26),
            ],
          ),
          Slider(
            value: _v,
            min: 6,
            max: 10,
            divisions: 4,
            activeColor: c.primary,
            onChanged: (x) {
              if (x.round() != _v.round()) HapticFeedback.selectionClick();
              setState(() => _v = x);
            },
          ),
          Text(t('rpe.scaleHint'), textAlign: TextAlign.center, style: context.text.bodySmall),
        ],
      ),
    );
  }
}

// ---------- Quiz ----------

class QuizScreen extends StatefulWidget {
  const QuizScreen({super.key});
  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  late List<QuizQuestion> _qs;
  int _i = 0, _score = 0;
  MuscleGroup? _picked;
  late BodyView _view;
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _start();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _start() {
    _qs = (List.of(quizQuestions())..shuffle()).take(5).toList();
    _i = 0;
    _score = 0;
    _picked = null;
    _view = _qs.first.view;
  }

  void _answer(MuscleGroup? g) {
    if (g == null || _picked != null) return;
    final right = g == _qs[_i].answer;
    right ? HapticFeedback.heavyImpact() : HapticFeedback.vibrate();
    setState(() {
      _picked = g;
      if (right) _score++;
    });
    // Bring the answer and the Next button into view on smaller screens.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 350), curve: Curves.easeOutCubic);
    });
  }

  void _next() => setState(() {
    if (_scroll.hasClients) _scroll.jumpTo(0);
    _i++;
    _picked = null;
    if (_i < _qs.length) _view = _qs[_i].view;
  });

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final done = _i >= _qs.length;
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Scaffold(
      appBar: AppBar(title: Text(t('quiz.title'))),
      body: done ? _result(context) : _question(context, c, bottom),
    );
  }

  Widget _question(BuildContext context, Tokens c, double bottom) {
    final q = _qs[_i];
    final right = _picked == q.answer;
    return ListView(
      controller: _scroll,
      padding: EdgeInsets.fromLTRB(16, 8, 16, bottom + 24),
      children: [
        Row(
          children: [
            for (var k = 0; k < _qs.length; k++)
              Expanded(
                child: Container(
                  height: 6,
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  decoration: BoxDecoration(color: k <= _i ? c.primary : c.line, borderRadius: BorderRadius.circular(3)),
                ),
              ),
          ],
        ),
        const SizedBox(height: 18),
        Text(t('quiz.n', {'n': _i + 1, 'total': _qs.length}), style: context.text.labelMedium?.copyWith(color: c.primary)),
        const SizedBox(height: 4),
        Text(q.question, style: context.text.headlineSmall),
        const SizedBox(height: 4),
        Text(t('quiz.tap'), style: context.text.bodySmall),
        const SizedBox(height: 10),
        AppCard(
          padding: const EdgeInsets.all(10),
          child: Column(
            children: [
              BodyExplorer(
                key: ValueKey('q$_i-${_view.name}'),
                view: _view,
                height: (MediaQuery.sizeOf(context).height * 0.4).clamp(240.0, 360.0),
                highlight: _picked == null ? null : (group: _picked!, color: right ? c.success : c.error),
                muscle: _picked != null && !right ? q.answer : null,
                onMuscle: _answer,
              ),
              TextButton.icon(
                onPressed: () => setState(() => _view = _view == BodyView.front ? BodyView.back : BodyView.front),
                icon: const Icon(Icons.flip_rounded, size: 18),
                label: Text(_view == BodyView.front ? t('body.back') : t('body.front')),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 200),
          child: _picked == null
              ? const SizedBox(height: 52)
              : Column(
                  key: ValueKey(_picked),
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(right ? Icons.check_circle_rounded : Icons.cancel_rounded, color: right ? c.success : c.error, size: 22),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            right ? t('quiz.right', {'name': muscleInfo(q.answer).name}) : t('quiz.wrong', {'name': muscleInfo(q.answer).name}),
                            textAlign: TextAlign.center,
                            style: context.text.titleMedium?.copyWith(color: right ? c.success : c.error),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      muscleInfo(q.answer).why,
                      textAlign: TextAlign.center,
                      style: context.text.bodyMedium?.copyWith(color: c.muted),
                    ),
                    const SizedBox(height: 14),
                    PrimaryButton(_i == _qs.length - 1 ? t('quiz.finish') : t('quiz.next'), onPressed: _next),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _result(BuildContext context) {
    final perfect = _score == _qs.length;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0.3, end: 1),
              duration: const Duration(milliseconds: 700),
              curve: Curves.elasticOut,
              builder: (_, v, child) => Transform.scale(scale: v, child: child),
              child: Glyph(perfect ? Sym.trophy : Icons.workspace_premium_rounded, tone: perfect ? Tone.gold : Tone.blue, size: 104),
            ),
            const SizedBox(height: 18),
            Text(t('quiz.score', {'n': _score, 'total': _qs.length}), style: context.text.headlineMedium),
            const SizedBox(height: 6),
            Text(
              t(perfect ? 'quiz.perfect' : 'quiz.good'),
              textAlign: TextAlign.center,
              style: context.text.bodyLarge?.copyWith(color: context.c.muted),
            ),
            const SizedBox(height: 24),
            PrimaryButton(t('quiz.again'), expand: false, icon: CupertinoIcons.arrow_counterclockwise, onPressed: () => setState(_start)),
            const SizedBox(height: 8),
            TextButton(onPressed: () => Navigator.of(context).pop(), child: Text(t('common.done'))),
          ],
        ),
      ),
    );
  }
}

/// Box breathing: in 4 s, hold 4 s, out 4 s, hold 4 s, with a growing circle.
class _Breathing extends StatefulWidget {
  const _Breathing();
  @override
  State<_Breathing> createState() => _BreathingState();
}

class _BreathingState extends State<_Breathing> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(seconds: 16));
  bool _on = false;
  int _phase = -1;
  Timer? _tick;

  @override
  void dispose() {
    _tick?.cancel();
    _c.dispose();
    super.dispose();
  }

  void _toggle() {
    setState(() => _on = !_on);
    if (_on) {
      _c.repeat();
      _tick = Timer.periodic(const Duration(milliseconds: 200), (_) {
        final p = (_c.value * 4).floor().clamp(0, 3);
        if (p != _phase) {
          HapticFeedback.selectionClick();
          setState(() => _phase = p);
        }
      });
    } else {
      _c.stop();
      _c.value = 0;
      _tick?.cancel();
      setState(() => _phase = -1);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    const labels = ['breathe.in', 'breathe.hold', 'breathe.out', 'breathe.hold'];
    return Column(
      children: [
        SizedBox(
          height: 200,
          child: Center(
            child: AnimatedBuilder(
              animation: _c,
              builder: (_, _) {
                final v = _c.value * 4;
                final p = v.floor();
                final f = v - p;
                final scale = switch (p) {
                  0 => 0.5 + 0.5 * Curves.easeInOut.transform(f),
                  1 => 1.0,
                  2 => 1.0 - 0.5 * Curves.easeInOut.transform(f),
                  _ => 0.5,
                };
                final secs = 4 - (f * 4).floor();
                return Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 180 * scale,
                      height: 180 * scale,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const RadialGradient(colors: [Color(0xFF7FE7D6), Color(0xFF3BA7F2)]),
                        boxShadow: [BoxShadow(color: const Color(0xFF3BA7F2).withValues(alpha: 0.35), blurRadius: 30 * scale)],
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _on ? t(labels[p.clamp(0, 3)]) : t('breathe.ready'),
                          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
                        ),
                        if (_on)
                          Text(
                            '$secs',
                            style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800),
                          ),
                      ],
                    ),
                  ],
                );
              },
            ),
          ),
        ),
        SecondaryButton(
          _on ? t('breathe.stop') : t('breathe.start'),
          expand: false,
          icon: _on ? CupertinoIcons.stop_fill : CupertinoIcons.play_fill,
          color: c.primary,
          onPressed: _toggle,
        ),
      ],
    );
  }
}
