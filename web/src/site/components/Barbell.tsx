// A barbell that loads one plate pair per completed step (How It Works).

import { useId, type CSSProperties } from 'react';
import { cx } from './ui';

const BAR_KG = 20;

/** Plate size by weight, in viewBox units. */
const PLATE: Record<number, { h: number; w: number; color: string; ink: string }> = {
  25: { h: 168, w: 26, color: '#0B3D91', ink: '#ffffff' },
  20: { h: 150, w: 24, color: '#007AFF', ink: '#ffffff' },
  15: { h: 128, w: 21, color: '#3BA7F2', ink: '#0B3D91' },
  10: { h: 106, w: 18, color: '#7FE7D6', ink: '#0B3D91' },
};

export const barbellTotal = (plates: number[], loaded: number) =>
  BAR_KG + 2 * plates.slice(0, loaded).reduce((a, b) => a + b, 0);

export function Barbell({ plates, loaded, label }: { plates: number[]; loaded: number; label: string }) {
  const uid = `bb${useId().replace(/[^\w-]/g, '')}`;
  let offset = 0;
  const placed = plates.map((kg, i) => {
    const p = PLATE[kg] ?? PLATE[10];
    const x = 146 - offset - p.w;
    offset += p.w + 3;
    return { kg, i, x, ...p };
  });

  return (
    <svg viewBox="0 0 600 200" className="bb" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${uid}-steel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2f4f7" />
          <stop offset=".45" stopColor="#b7bec9" />
          <stop offset="1" stopColor="#7d8794" />
        </linearGradient>
        <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".38" />
          <stop offset=".35" stopColor="#fff" stopOpacity=".06" />
          <stop offset="1" stopColor="#000" stopOpacity=".22" />
        </linearGradient>
        <pattern id={`${uid}-knurl`} width="4" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <rect width="1.2" height="10" fill="#000" opacity=".18" />
        </pattern>
      </defs>

      <ellipse className="bb-shadow" cx="300" cy="190" rx="250" ry="6" />

      {/* Shaft, knurling, sleeves and collars */}
      <rect x="60" y="95" width="480" height="10" rx="5" fill={`url(#${uid}-steel)`} />
      <rect x="215" y="95" width="170" height="10" fill={`url(#${uid}-knurl)`} />
      <rect x="34" y="90" width="118" height="20" rx="4" fill={`url(#${uid}-steel)`} />
      <rect x="448" y="90" width="118" height="20" rx="4" fill={`url(#${uid}-steel)`} />
      <rect x="148" y="82" width="12" height="36" rx="3" fill={`url(#${uid}-steel)`} />
      <rect x="440" y="82" width="12" height="36" rx="3" fill={`url(#${uid}-steel)`} />

      {placed.map((p) => (
        <g key={p.i} className={cx('bb-pair', p.i < loaded && 'is-loaded')} style={{ '--i': p.i } as CSSProperties}>
          {(['l', 'r'] as const).map((side) => (
            // Outer group slides in (CSS transform); inner group mirrors the right side (SVG transform).
            <g key={side} className={`bb-slide bb-slide--${side}`}>
              <g transform={side === 'r' ? 'matrix(-1 0 0 1 600 0)' : undefined}>
                <rect x={p.x} y={100 - p.h / 2} width={p.w} height={p.h} rx="5" fill={p.color} />
                <rect x={p.x} y={100 - p.h / 2} width={p.w} height={p.h} rx="5" fill={`url(#${uid}-shine)`} />
                <rect x={p.x + p.w / 2 - 1} y={100 - p.h / 2 + 26} width="2" height={p.h - 36} rx="1" fill="#fff" opacity=".18" />
              </g>
              <text className="bb-kg" x={side === 'r' ? 600 - p.x - p.w / 2 : p.x + p.w / 2} y={100 - p.h / 2 + 17}
                fill={p.ink} textAnchor="middle" aria-hidden="true">{p.kg}</text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}
