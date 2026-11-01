import { useT } from '../i18n';

interface Point { x: string; y: number }

/** Minimal responsive line chart with an optional dashed target line. */
export function LineChart({ points, target, unit, label, height = 170 }: { points: Point[]; target?: number; unit: string; label: string; height?: number }) {
  const t = useT();
  if (points.length < 2) return <div className="empty">{t('chart.notEnough')}</div>;
  const W = 600;
  const H = 150;
  const ys = points.map((p) => p.y).concat(target ?? []);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const pad = Math.max(0.5, (hi - lo) * 0.15);
  const min = lo - pad;
  const max = hi + pad;
  const sx = (i: number) => (i / (points.length - 1)) * W;
  const sy = (v: number) => H - ((v - min) / (max - min)) * H;
  const line = points.map((p, i) => `${sx(i).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  return (
    // Time axes read left to right in both languages.
    <div className="stack" style={{ gap: 6 }} dir="ltr">
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label={label}>
          <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} stroke="var(--border)" />
          {target !== undefined && <line x1="0" y1={sy(target)} x2={W} y2={sy(target)} stroke="var(--chart-ref)" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />}
          <polygon points={`0,${H} ${line} ${W},${H}`} fill="var(--accent-soft)" />
          <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="xs faint mono" style={{ position: 'absolute', top: 0, insetInlineEnd: 0 }}>{max.toFixed(1)} {unit}</span>
        <span className="xs faint mono" style={{ position: 'absolute', bottom: 2, insetInlineEnd: 0 }}>{min.toFixed(1)} {unit}</span>
      </div>
      <div className="row xs faint" style={{ justifyContent: 'space-between' }}>
        <span>{points[0].x}</span>
        {target !== undefined && <span>{t('chart.target', { v: target, unit })}</span>}
        <span>{points.at(-1)!.x}</span>
      </div>
    </div>
  );
}
