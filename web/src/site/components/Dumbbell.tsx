// Dumbbell illustrations: a shaded SVG drawing, a floating variant with slow
// parallax, and the optional drag-to-rotate WebGL version (loaded on demand).

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { Icon } from '../../components/Icon';
import { useI18n } from '../../i18n';
import { canRun3D } from '../motion';
import type { DumbbellScene } from './dumbbellScene';
import { cx } from './ui';

export function DumbbellArt({ className }: { className?: string }) {
  const uid = `db${useId().replace(/[^\w-]/g, '')}`;
  const plate = `url(#${uid}-plate)`;
  const plate2 = `url(#${uid}-plate2)`;
  const steel = `url(#${uid}-steel)`;
  return (
    <svg viewBox="0 0 260 130" className={cx('db-art', className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-plate`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b78e6" />
          <stop offset=".45" stopColor="#0B3D91" />
          <stop offset="1" stopColor="#061f4d" />
        </linearGradient>
        <linearGradient id={`${uid}-plate2`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7cc6ff" />
          <stop offset=".5" stopColor="#007AFF" />
          <stop offset="1" stopColor="#0a4fb8" />
        </linearGradient>
        <linearGradient id={`${uid}-steel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".5" stopColor="#b9c1cc" />
          <stop offset="1" stopColor="#6f7a88" />
        </linearGradient>
        <radialGradient id={`${uid}-shadow`}>
          <stop offset="0" stopColor="#000" stopOpacity=".28" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="130" cy="121" rx="108" ry="7" fill={`url(#${uid}-shadow)`} />
      <rect x="68" y="55" width="124" height="14" rx="7" fill={steel} />
      {[0, 1].map((side) => (
        <g key={side} transform={side ? 'matrix(-1 0 0 1 260 0)' : undefined}>
          <rect x="46" y="14" width="24" height="96" rx="9" fill={plate} />
          <rect x="49" y="18" width="5" height="88" rx="2.5" fill="#fff" opacity=".22" />
          <rect x="24" y="27" width="22" height="70" rx="8" fill={plate2} />
          <rect x="27" y="31" width="4.5" height="62" rx="2.25" fill="#fff" opacity=".3" />
          <rect x="15" y="46" width="10" height="32" rx="4" fill={steel} />
        </g>
      ))}
    </svg>
  );
}

/** A dumbbell that bobs gently and drifts with scroll (CSS reads `--travel` from an ancestor). */
export function FloatingDumbbell({ className, depth = 60, rotate = 0, size = 180, delay = 0 }: {
  className?: string;
  /** Parallax distance in px across the section's trip through the viewport. */
  depth?: number;
  rotate?: number;
  size?: number;
  delay?: number;
}) {
  return (
    <div className={cx('s-float', className)} aria-hidden="true"
      style={{ '--depth': depth, '--rot': `${rotate}deg`, '--size': `${size}px`, '--bob-delay': `${delay}s` } as CSSProperties}>
      <div className="s-float-in"><DumbbellArt /></div>
    </div>
  );
}

/**
 * Drag-to-rotate 3D dumbbell. The WebGL scene loads only when it nears the
 * viewport on a capable device; otherwise (and until then) the drawing shows.
 */
export function Dumbbell3D({ className }: { className?: string }) {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el || !canRun3D()) return;
    let scene: DumbbellScene | null = null;
    let loading = false;
    let disposed = false;
    const io = new IntersectionObserver(([entry]) => {
      if (scene) {
        if (entry.isIntersecting) scene.resume();
        else scene.pause();
        return;
      }
      if (!entry.isIntersecting || loading) return;
      loading = true;
      import('./dumbbellScene')
        .then(({ createDumbbellScene }) => {
          if (disposed || !canvas.current) return;
          scene = createDumbbellScene(canvas.current);
          setReady(true);
        })
        .catch(() => {
          // No WebGL or the chunk failed: the drawing stays.
        });
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => {
      disposed = true;
      io.disconnect();
      scene?.dispose();
    };
  }, []);

  return (
    <div ref={host} className={cx('d3', ready && 'is-ready', className)}>
      <div className="d3-fallback"><DumbbellArt /></div>
      <canvas ref={canvas} className="d3-canvas" role="img" aria-label={t('site.cta.dumbbell')} />
      {ready && <p className="d3-hint"><Icon name="rotate" size={14} strokeWidth={2} />{t('site.cta.drag')}</p>}
    </div>
  );
}
