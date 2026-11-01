import { useT } from '../i18n';

interface Bar { label: string; value: number; highlight?: boolean }

/** Simple vertical bars with value labels. Time runs left to right in both languages. */
export function BarChart({ bars, label, format = (v) => String(Math.round(v)), height = 150 }: { bars: Bar[]; label: string; format?: (v: number) => string; height?: number }) {
  const t = useT();
  if (bars.length === 0) return <div className="empty">{t('chart.notEnough')}</div>;
  const max = Math.max(...bars.map((b) => b.value), 1);
  const cols = `repeat(${bars.length}, minmax(0, 1fr))`;
  return (
    <div dir="ltr">
      <div role="img" aria-label={label} style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, alignItems: 'end', height, borderBottom: '1px solid var(--border)' }}>
        {bars.map((b, i) => (
          <div key={i} className="stack" style={{ alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 }}>
            <span className="mono xs faint" style={{ whiteSpace: 'nowrap' }}>{format(b.value)}</span>
            <span style={{ width: '100%', maxWidth: 36, height: `${Math.max(2, (b.value / max) * 82)}%`, borderRadius: '4px 4px 0 0', background: b.highlight ? 'var(--accent)' : 'var(--bar-soft)' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, marginTop: 6 }}>
        {bars.map((b, i) => <span key={i} className="xs faint ellipsis" style={{ textAlign: 'center' }}>{b.label}</span>)}
      </div>
    </div>
  );
}

/** Tiny trend line for table rows. */
export function Sparkline({ values, width = 90, height = 24 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <span className="xs faint">—</span>;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * width).toFixed(1)},${(height - 2 - ((v - lo) / span) * (height - 4)).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
