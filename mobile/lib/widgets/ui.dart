// Shared building blocks in the website's style: rounded cards on a soft grey
// page, capsule buttons in the site's blue, small pills and stat tiles.

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';

import '../app/theme.dart';
import '../data/store.dart';

/// Rebuilds when the data or the settings (language, theme) change.
class Watch extends StatelessWidget {
  const Watch({super.key, required this.builder});
  final WidgetBuilder builder;

  @override
  Widget build(BuildContext context) => ListenableBuilder(listenable: Listenable.merge([context.store, context.settings]), builder: (c, _) => builder(c));
}

/// Shrinks slightly while pressed, like iOS cards.
class Pressable extends StatefulWidget {
  const Pressable({super.key, required this.child, this.onTap, this.scale = 0.97, this.semanticLabel});
  final Widget child;
  final VoidCallback? onTap;
  final double scale;
  final String? semanticLabel;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    if (widget.onTap == null) return widget.child;
    return Semantics(
      button: true,
      label: widget.semanticLabel,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (_) => setState(() => _down = true),
        onTapCancel: () => setState(() => _down = false),
        onTapUp: (_) => setState(() => _down = false),
        onTap: () {
          HapticFeedback.selectionClick();
          widget.onTap!();
        },
        child: AnimatedScale(scale: _down ? widget.scale : 1, duration: const Duration(milliseconds: 140), curve: Curves.easeOut, child: widget.child),
      ),
    );
  }
}

class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.onTap,
    this.color,
    this.gradient,
    this.radius = Tokens.r,
    this.border,
  });
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? color;
  final Gradient? gradient;
  final double radius;
  final Color? border;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final box = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: gradient == null ? (color ?? c.surface) : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: border ?? (c.dark ? c.hairline : Colors.transparent)),
        boxShadow: c.dark || gradient != null
            ? null
            : const [
                BoxShadow(color: Color(0x0A000000), blurRadius: 2, offset: Offset(0, 1)),
                BoxShadow(color: Color(0x0F000000), blurRadius: 24, spreadRadius: -8, offset: Offset(0, 8)),
              ],
      ),
      child: child,
    );
    return onTap == null ? box : Pressable(onTap: onTap, child: box);
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {super.key, this.action, this.onAction, this.padding = const EdgeInsets.fromLTRB(4, 26, 4, 10)});
  final String title;
  final String? action;
  final VoidCallback? onAction;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) => Padding(
    padding: padding,
    child: Row(
      children: [
        Expanded(
          child: Text(title, style: context.text.titleLarge, semanticsLabel: title),
        ),
        if (action != null)
          CupertinoButton(
            padding: EdgeInsets.zero,
            minimumSize: const Size(32, 32),
            onPressed: onAction,
            child: Text(
              action!,
              style: TextStyle(color: context.c.link, fontSize: 15, fontWeight: FontWeight.w500),
            ),
          ),
      ],
    ),
  );
}

/// Small uppercase label above a heading, like the site's section eyebrows.
class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key, this.color});
  final String text;
  final Color? color;
  @override
  Widget build(BuildContext context) => Text(
    context.settings.isArabic ? text : text.toUpperCase(),
    style: context.text.labelSmall?.copyWith(color: color ?? context.c.primary, letterSpacing: context.settings.isArabic ? 0 : 1),
  );
}

class Pill extends StatelessWidget {
  const Pill(this.text, {super.key, this.icon, this.color, this.background});
  final String text;
  final IconData? icon;
  final Color? color, background;

  @override
  Widget build(BuildContext context) {
    final fg = color ?? context.c.text2;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: background ?? context.c.surface2, borderRadius: BorderRadius.circular(99)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 13, color: fg), const SizedBox(width: 5)],
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: fg),
            ),
          ),
        ],
      ),
    );
  }
}

class PrimaryButton extends StatelessWidget {
  const PrimaryButton(this.label, {super.key, this.onPressed, this.icon, this.loading = false, this.expand = true, this.light = false});
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading, expand;

  /// White button for use on the brand gradient.
  final bool light;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !loading;
    final bg = light ? Colors.white : Tokens.fill;
    final fg = light ? Tokens.brand : Colors.white;
    final child = AnimatedOpacity(
      opacity: enabled || loading ? 1 : 0.45,
      duration: const Duration(milliseconds: 150),
      child: Container(
        height: 52,
        padding: const EdgeInsets.symmetric(horizontal: 22),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
        child: Row(
          mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (loading)
              CupertinoActivityIndicator(color: fg)
            else ...[
              if (icon != null) ...[Icon(icon, color: fg, size: 19), const SizedBox(width: 8)],
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: fg, fontSize: 17, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ],
        ),
      ),
    );
    return Pressable(onTap: enabled ? onPressed : null, semanticLabel: label, child: child);
  }
}

class SecondaryButton extends StatelessWidget {
  const SecondaryButton(this.label, {super.key, this.onPressed, this.icon, this.expand = true, this.color});
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool expand;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final fg = color ?? context.c.primary;
    return Pressable(
      onTap: onPressed,
      semanticLabel: label,
      child: Container(
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 18),
        decoration: BoxDecoration(color: fg.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(99)),
        child: Row(
          mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[Icon(icon, color: fg, size: 18), const SizedBox(width: 7)],
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: fg, fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class Avatar extends StatelessWidget {
  const Avatar(this.initials, {super.key, this.size = 44, this.ring = false});
  final String initials;
  final double size;
  final bool ring;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      gradient: Tokens.brandGradient,
      border: ring ? Border.all(color: Colors.white, width: 2.5) : null,
    ),
    child: Text(
      initials,
      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: size * 0.36, letterSpacing: 0.5),
    ),
  );
}

class ProgressBar extends StatelessWidget {
  const ProgressBar(this.value, {super.key, this.color, this.height = 8, this.track});
  final double value;
  final Color? color, track;
  final double height;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(height),
    child: SizedBox(
      height: height,
      child: Stack(
        children: [
          Positioned.fill(child: ColoredBox(color: track ?? context.c.surface2)),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: value.clamp(0, 1).toDouble()),
            duration: const Duration(milliseconds: 700),
            curve: Curves.easeOutCubic,
            builder: (_, v, _) => FractionallySizedBox(
              alignment: AlignmentDirectional.centerStart,
              widthFactor: v,
              child: Container(
                decoration: BoxDecoration(color: color, gradient: color == null ? Tokens.brandGradient : null, borderRadius: BorderRadius.circular(height)),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class StatTile extends StatelessWidget {
  const StatTile({super.key, required this.label, required this.value, this.unit, this.icon, this.tone, this.caption});
  final String label, value;
  final String? unit, caption;
  final IconData? icon;
  final Color? tone;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (icon != null) ...[Icon(icon, size: 15, color: tone ?? c.primary), const SizedBox(width: 6)],
              Expanded(
                child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.bodySmall),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: value,
                  style: context.text.headlineSmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
                ),
                if (unit != null)
                  TextSpan(
                    text: ' $unit',
                    style: context.text.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                  ),
              ],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          if (caption != null) ...[const SizedBox(height: 3), Text(caption!, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.bodySmall)],
        ],
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.body, this.action, this.onAction});
  final IconData icon;
  final String title;
  final String? body, action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 12),
    child: Column(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(color: context.c.primarySoft, shape: BoxShape.circle),
          child: Icon(icon, color: context.c.primary, size: 26),
        ),
        const SizedBox(height: 14),
        Text(title, textAlign: TextAlign.center, style: context.text.titleMedium),
        if (body != null) ...[
          const SizedBox(height: 6),
          Text(
            body!,
            textAlign: TextAlign.center,
            style: context.text.bodyMedium?.copyWith(color: context.c.muted),
          ),
        ],
        if (action != null) ...[const SizedBox(height: 16), SecondaryButton(action!, onPressed: onAction, expand: false)],
      ],
    ),
  );
}

/// A tappable settings-style row.
class RowTile extends StatelessWidget {
  const RowTile({super.key, required this.title, this.subtitle, this.icon, this.iconColor, this.trailing, this.onTap, this.destructive = false});
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final fg = destructive ? c.error : c.text;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(
          children: [
            if (icon != null) ...[
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(color: (iconColor ?? c.primary).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                child: Icon(icon, size: 17, color: iconColor ?? c.primary),
              ),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(fontSize: 16, color: fg, fontWeight: FontWeight.w500),
                  ),
                  if (subtitle != null) ...[const SizedBox(height: 2), Text(subtitle!, style: context.text.bodySmall)],
                ],
              ),
            ),
            ?trailing,
            if (onTap != null && trailing == null) Icon(CupertinoIcons.chevron_forward, size: 16, color: c.faint),
          ],
        ),
      ),
    );
  }
}

/// A card holding RowTiles separated by hairlines.
class GroupCard extends StatelessWidget {
  const GroupCard({super.key, required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => AppCard(
    padding: EdgeInsets.zero,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(Tokens.r),
      child: Material(
        color: Colors.transparent,
        child: Column(
          children: [
            for (var i = 0; i < children.length; i++) ...[
              if (i > 0)
                Padding(
                  padding: const EdgeInsetsDirectional.only(start: 58),
                  child: Divider(color: context.c.hairline),
                ),
              children[i],
            ],
          ],
        ),
      ),
    ),
  );
}

/// A bottom sheet that grows with its content and clears the keyboard.
Future<T?> showAppSheet<T>(BuildContext context, WidgetBuilder builder) => showModalBottomSheet<T>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (c) => Padding(
    padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(c).bottom),
    child: builder(c),
  ),
);

void toast(BuildContext context, String text) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text), duration: const Duration(seconds: 3)));
}
