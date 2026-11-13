// Hero centerpiece: a front/back muscle map. Hovering, tapping or tabbing to a
// muscle group lights it up and shows a callout with an example exercise.

import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import { cx } from '../ui';
import {
  ANCHORS, DEFAULT_GROUP, GROUP_TEXT, HEAD, ORDER, SHAPES, SILHOUETTE, VIEWBOX,
  type MuscleGroup, type View,
} from './shapes';

const MIRROR = 'matrix(-1 0 0 1 200 0)';
const VIEWS: View[] = ['front', 'back'];

export function AnatomyFigure() {
  const { t, dir } = useI18n();
  const uid = `anat${useId().replace(/[^\w-]/g, '')}`;
  const [view, setView] = useState<View>('front');
  const [selected, setSelected] = useState<MuscleGroup>(DEFAULT_GROUP.front);
  const [hovered, setHovered] = useState<MuscleGroup | null>(null);
  const [focused, setFocused] = useState<MuscleGroup | null>(null);
  const leaveTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const shown = hovered ?? focused ?? selected;
  const visible = ORDER[view].includes(shown) ? shown : null;
  const anchor = visible ? ANCHORS[view][visible] : undefined;
  // Callouts sit on the inline-start side, so in RTL point at the mirrored half.
  const ax = anchor ? (dir === 'rtl' ? 200 - anchor[0] : anchor[0]) : 0;
  const edge = dir === 'rtl' ? VIEWBOX.x + VIEWBOX.w + 14 : VIEWBOX.x - 14;

  const flip = (v: View) => {
    if (v === view) return;
    setView(v);
    setHovered(null);
    setFocused(null);
    if (!ORDER[v].includes(selected)) setSelected(DEFAULT_GROUP[v]);
  };

  const hover = (g: MuscleGroup | null) => {
    window.clearTimeout(leaveTimer.current);
    // Moving between two shapes of one group briefly leaves it; don't flicker.
    if (g) setHovered(g);
    else leaveTimer.current = window.setTimeout(() => setHovered(null), 90);
  };

  const tip = visible && (
    <>
      <span className="anat-tip-eyebrow">{t(view === 'front' ? 'site.anat.front' : 'site.anat.back')}</span>
      <strong>{t(GROUP_TEXT[visible].name)}</strong>
      <span className="anat-tip-ex"><Icon name="dumbbell" size={15} strokeWidth={2} />{t(GROUP_TEXT[visible].exercise)}</span>
    </>
  );
  const tipTop = anchor ? `${((anchor[1] - VIEWBOX.y) / VIEWBOX.h) * 100}%` : undefined;

  const label = (g: MuscleGroup) => t('site.anat.aria', { name: t(GROUP_TEXT[g].name), exercise: t(GROUP_TEXT[g].exercise) });

  const renderView = (v: View) => {
    const active = v === view;
    const glow = `${uid}-${v}-glow`;
    const skin = `${uid}-${v}-skin`;
    return (
      <svg viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`} className="anat-svg"
        role="group" aria-label={t(v === 'front' ? 'site.anat.frontLabel' : 'site.anat.backLabel')}>
        <defs>
          <radialGradient id={skin} cx="100" cy="190" r="230" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: 'var(--anat-body-hi)' }} />
            <stop offset="1" style={{ stopColor: 'var(--anat-body)' }} />
          </radialGradient>
          <filter id={glow} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g className="anat-skin" fill={`url(#${skin})`} stroke={`url(#${skin})`}>
          <ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} />
          <path d={SILHOUETTE} />
          <path d={SILHOUETTE} transform={MIRROR} />
        </g>
        {ORDER[v].map((g) => (
          <g key={g} className={cx('anat-g', active && g === shown && 'is-on')}
            role="button" tabIndex={active ? 0 : -1} aria-pressed={g === selected} aria-label={label(g)}
            filter={active && g === shown ? `url(#${glow})` : undefined}
            onClick={() => setSelected(g)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              setSelected(g);
            }}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') hover(g); }}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') hover(null); }}
            onFocus={() => setFocused(g)}
            onBlur={() => setFocused(null)}>
            {SHAPES[v][g]!.map((d, i) => (
              <Fragment key={i}>
                <path d={d} />
                <path d={d} transform={MIRROR} />
              </Fragment>
            ))}
          </g>
        ))}
        {active && anchor && (
          <g className="anat-leader" aria-hidden="true">
            <line x1={ax} y1={anchor[1]} x2={edge} y2={anchor[1]} />
            <circle className="anat-ping" cx={ax} cy={anchor[1]} r="3" />
            <circle cx={ax} cy={anchor[1]} r="3" />
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="anat">
      <div className="anat-bar">
        <div className="s-seg" role="group" aria-label={t('site.anat.view')}>
          {VIEWS.map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => flip(v)}>
              {t(v === 'front' ? 'site.anat.front' : 'site.anat.back')}
            </button>
          ))}
        </div>
        <p className="anat-hint">{t('site.anat.hint')}</p>
      </div>
      <div className="anat-stage">
        <div className="anat-figure">
          <div className={cx('anat-flip', view === 'back' && 'is-back')}>
            {VIEWS.map((v) => (
              <div key={v} className={`anat-face anat-face--${v}`} inert={v !== view}>
                {renderView(v)}
              </div>
            ))}
          </div>
          {tip && <div className="anat-tip" key={`${view}-${visible}`} style={{ top: tipTop }} aria-hidden="true">{tip}</div>}
        </div>
      </div>
      {tip && <div className="anat-below" aria-hidden="true"><div className="anat-tip" key={`${view}-${visible}`}>{tip}</div></div>}
    </div>
  );
}
