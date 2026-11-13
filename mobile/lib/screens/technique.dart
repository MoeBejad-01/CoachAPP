// How to do an exercise: the technique video (when one has been added), the
// coach's cue, what was prescribed and the muscles it works. Opens from the
// program, from a day, and from the workout logger.

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:material_ui/material_ui.dart';
import 'package:video_player/video_player.dart';

import '../app/l10n.dart';
import '../app/format.dart';
import '../app/theme.dart';
import '../data/exercise_videos.dart';
import '../data/models.dart';
import '../data/schedule.dart';
import '../data/store.dart';
import '../widgets/anatomy_shapes.dart';
import '../widgets/muscle_map.dart';
import '../widgets/ui.dart';
import 'train.dart' show setLabel;

class TechniqueSheet extends StatefulWidget {
  const TechniqueSheet({super.key, required this.name, this.exercise});
  final String name;
  final Exercise? exercise;

  static Future<void> open(BuildContext context, {required String name, Exercise? exercise}) =>
      showAppSheet(context, (_) => TechniqueSheet(name: name, exercise: exercise));

  @override
  State<TechniqueSheet> createState() => _TechniqueSheetState();
}

class _TechniqueSheetState extends State<TechniqueSheet> {
  VideoPlayerController? _video;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    final url = videoFor(widget.name, coachLink: widget.exercise?.video);
    if (url != null) {
      final v = VideoPlayerController.networkUrl(Uri.parse(url));
      _video = v;
      v
          .initialize()
          .then((_) {
            if (!mounted) return;
            v.setLooping(true);
            setState(() {});
          })
          .catchError((Object _) {
            if (mounted) setState(() => _failed = true);
          });
    }
  }

  @override
  void dispose() {
    _video?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final e = widget.exercise;
    final raw = musclesFor(widget.name);
    final front =
        raw.keys.any((g) => const [MuscleGroup.chest, MuscleGroup.core, MuscleGroup.shoulders].contains(g)) ||
        !raw.keys.any((g) => const [MuscleGroup.back, MuscleGroup.glutes].contains(g));
    final last = lastEntryFor(context.store.s.logs, e?.id ?? '', widget.name);
    final best = last == null ? null : bestSet(last.sets);
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.88,
      maxChildSize: 0.95,
      builder: (_, scroll) => ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
        children: [
          Text(widget.name, style: context.text.headlineSmall),
          if (e != null) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                Pill(ltr('${e.sets} × ${e.reps}'), color: c.text, background: c.surface),
                if (e.intensity.isNotEmpty) Pill(e.intensity, background: c.surface),
                if (e.rest.isNotEmpty) Pill(t('train.rest', {'v': ltr(e.rest)}), icon: CupertinoIcons.timer, background: c.surface),
              ],
            ),
          ],
          const SizedBox(height: 16),
          _VideoBox(video: _video, failed: _failed, onToggle: () => setState(() => _video!.value.isPlaying ? _video!.pause() : _video!.play())),
          if (e != null && e.cue.isNotEmpty) ...[
            const SizedBox(height: 14),
            AppCard(
              color: c.tint,
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(CupertinoIcons.lightbulb_fill, size: 18, color: c.primary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(t('tech.cue', {'name': context.store.s.coach.firstName}), style: context.text.labelMedium?.copyWith(color: c.primary)),
                        const SizedBox(height: 2),
                        Text(e.cue, style: context.text.bodyLarge),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (raw.isNotEmpty) ...[
            SectionHeader(t('tech.muscles'), padding: const EdgeInsets.fromLTRB(4, 20, 4, 10)),
            AppCard(
              child: Row(
                children: [
                  SizedBox(
                    width: 92,
                    child: MuscleMap(view: front ? BodyView.front : BodyView.back, levels: raw, height: 150),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (final g in (raw.entries.toList()..sort((a, b) => b.value.compareTo(a.value))))
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              children: [
                                Container(
                                  width: 10,
                                  height: 10,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: c.primary.withValues(alpha: 0.35 + g.value * 0.65),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(t('muscle.${g.key.name}'), style: context.text.bodyLarge),
                                const SizedBox(width: 6),
                                Text(g.value >= 1 ? t('tech.main') : t('tech.helper'), style: context.text.bodySmall),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (best != null) ...[
            const SizedBox(height: 14),
            Text(t('train.lastTime', {'set': setLabel(best)}), style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
          ],
        ],
      ),
    );
  }
}

class _VideoBox extends StatelessWidget {
  const _VideoBox({required this.video, required this.failed, required this.onToggle});
  final VideoPlayerController? video;
  final bool failed;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final v = video;
    final ready = v != null && v.value.isInitialized && !failed;
    return ClipRRect(
      borderRadius: BorderRadius.circular(Tokens.r),
      child: AspectRatio(
        aspectRatio: ready ? v.value.aspectRatio : 16 / 9,
        child: ready
            ? GestureDetector(
                onTap: onToggle,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    VideoPlayer(v),
                    ValueListenableBuilder(
                      valueListenable: v,
                      builder: (_, value, _) => AnimatedOpacity(
                        opacity: value.isPlaying ? 0 : 1,
                        duration: const Duration(milliseconds: 200),
                        child: const ColoredBox(
                          color: Color(0x33000000),
                          child: Center(child: Icon(CupertinoIcons.play_circle_fill, color: Colors.white, size: 64)),
                        ),
                      ),
                    ),
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: VideoProgressIndicator(v, allowScrubbing: true, colors: const VideoProgressColors(playedColor: Tokens.glow)),
                    ),
                  ],
                ),
              )
            : DecoratedBox(
                decoration: const BoxDecoration(gradient: Tokens.brandGradient),
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (v != null && !failed)
                          const CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5)
                        else
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.18)),
                            child: const Icon(CupertinoIcons.play_fill, color: Colors.white, size: 30),
                          ),
                        const SizedBox(height: 12),
                        Text(
                          failed ? t('tech.videoError') : (v == null ? t('tech.soon') : t('tech.loading')),
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w600),
                        ),
                        if (v == null) ...[
                          const SizedBox(height: 4),
                          Text(
                            t('tech.soonBody', {'name': context.store.s.coach.firstName}),
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 14),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
      ),
    );
  }
}

/// A small "▶ Technique" button for exercise rows.
class TechniqueButton extends StatelessWidget {
  const TechniqueButton({super.key, required this.name, this.exercise});
  final String name;
  final Exercise? exercise;

  @override
  Widget build(BuildContext context) {
    final has = videoFor(name, coachLink: exercise?.video) != null;
    return Semantics(
      button: true,
      label: t('tech.open', {'name': name}),
      child: Pressable(
        onTap: () => TechniqueSheet.open(context, name: name, exercise: exercise),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(color: context.c.primarySoft, borderRadius: BorderRadius.circular(99)),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(has ? CupertinoIcons.play_circle_fill : CupertinoIcons.play_circle, size: 15, color: context.c.primary),
              const SizedBox(width: 4),
              Text(
                t('tech.button'),
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: context.c.primary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
