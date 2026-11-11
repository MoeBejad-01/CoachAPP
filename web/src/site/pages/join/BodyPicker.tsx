// "Where does it hurt?": the homepage's muscle map, front and back side by
// side, where each group toggles on tap. The same groups are listed as pills
// underneath for anyone who'd rather not aim at a drawing.

import { Fragment, useId } from 'react';
import { useI18n } from '../../../i18n';
import { GROUP_TEXT, HEAD, ORDER, SHAPES, SILHOUETTE, VIEWBOX, type MuscleGroup, type View } from '../../components/anatomy/shapes';
import { cx } from '../../components/ui';
import { PillMulti } from './fields';

const MIRROR = 'matrix(-1 0 0 1 200 0)';
const ALL: MuscleGroup[] = ['shoulders', 'chest', 'back', 'arms', 'core', 'glutes', 'legs'];

export function BodyPicker({ id, label, hint, value, onChange }: {
  id: string;
  label: string;
  hint: string;
  value: MuscleGroup[];
  onChange: (v: MuscleGroup[]) => void;
}) {
  const { t } = useI18n();
  const uid = `bp${useId().replace(/[^\w-]/g, '')}`;
  const toggle = (g: MuscleGroup) => onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g]);

  const figure = (view: View) => (
    <figure className="jf-body-view">
      <svg viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`} aria-hidden="true">
        <defs>
          <filter id={`${uid}-${view}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g className="jf-skin">
          <ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} />
          <path d={SILHOUETTE} />
          <path d={SILHOUETTE} transform={MIRROR} />
        </g>
        {ORDER[view].map((g) => (
          <g key={g} className={cx('jf-muscle', value.includes(g) && 'is-on')} filter={value.includes(g) ? `url(#${uid}-${view})` : undefined}
            onClick={() => toggle(g)}>
            <title>{t(GROUP_TEXT[g].name)}</title>
            {SHAPES[view][g]!.map((d, i) => (
              <Fragment key={i}>
                <path d={d} />
                <path d={d} transform={MIRROR} />
              </Fragment>
            ))}
          </g>
        ))}
      </svg>
      <figcaption>{t(view === 'front' ? 'site.anat.front' : 'site.anat.back')}</figcaption>
    </figure>
  );

  return (
    <div className="jf-body">
      <div className="jf-body-figs">
        {figure('front')}
        {figure('back')}
      </div>
      {/* The pills are the keyboard and screen-reader path; the drawing mirrors them. */}
      <PillMulti id={id} label={label} hint={hint} value={value} onChange={onChange}
        options={ALL.map((g) => ({ value: g, label: t(GROUP_TEXT[g].name) }))} />
    </div>
  );
}
