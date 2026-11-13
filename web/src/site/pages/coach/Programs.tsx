// The coach's programs, each with its whole block mapped out: one square per
// day, darker for heavier, so the periodisation is visible before you start.

import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import type { StringKey } from '../../../i18n/strings';
import { useCoach } from '../../coach/kit';
import type { CoachProgram } from '../../coach/types';
import { RevealItem, SectionHeader } from '../../components/ui';

const LEVELS: StringKey[] = ['site.cp.prog.rest', 'site.cp.prog.light', 'site.cp.prog.moderate', 'site.cp.prog.heavy'];

export function Programs() {
  const { t } = useI18n();
  const { p } = useCoach();
  return (
    <section id="programs" className="s-section s-section--alt cp-programs" aria-labelledby="cp-programs-title">
      <div className="s-container">
        <SectionHeader id="cp-programs-title" eyebrow={t('site.cp.prog.eyebrow')} title={t('site.cp.prog.title')} lead={t('site.cp.prog.lead')} />
        <ul className="cp-prog-grid">
          {p.programs.map((prog, i) => <ProgramCard key={prog.id} prog={prog} delay={i * 90} />)}
        </ul>
        <ul className="cp-legend" aria-hidden="true">
          {LEVELS.map((k, i) => <li key={k}><i className={`l${i}`} />{t(k)}</li>)}
        </ul>
      </div>
    </section>
  );
}

function ProgramCard({ prog, delay }: { prog: CoachProgram; delay: number }) {
  const { t } = useI18n();
  const { L, count, money, join } = useCoach();
  const [open, setOpen] = useState(false);
  const panel = `cp-sample-${prog.id}`;

  return (
    <RevealItem delay={delay} className="s-card cp-prog">
      <div className="cp-prog-top">
        <span className="cp-chip">{L(prog.level)}</span>
        <span className="cp-prog-meta">{count('site.cp.weeks', prog.weeks)} · {count('site.cp.perWeek', prog.daysPerWeek)}</span>
      </div>
      <h3>{L(prog.name)}</h3>
      <p className="cp-prog-summary">{L(prog.summary)}</p>
      <ul className="cp-focus">{prog.focus.map((f, i) => <li key={i}>{L(f)}</li>)}</ul>

      <div className="cp-map-box" style={{ '--weeks': prog.intensity.length } as CSSProperties}>
        <div className="cp-map" role="img" aria-label={t('site.cp.prog.mapLabel', { weeks: count('site.cp.weeks', prog.weeks) })}>
          {prog.intensity.map((days, w) => (
            <div key={w} className="cp-map-week" style={{ '--w': w } as CSSProperties}>
              {days.map((lvl, d) => (
                <i key={d} className={`l${lvl}`} title={t('site.cp.prog.cell', { w: w + 1, d: d + 1, level: t(LEVELS[lvl]) })} />
              ))}
            </div>
          ))}
        </div>
        <div className="cp-map-axis" aria-hidden="true">
          <span>{t('site.cp.results.week', { n: 1 })}</span>
          <span>{t('site.cp.results.week', { n: prog.intensity.length })}</span>
        </div>
      </div>

      <button type="button" className="cp-sample-toggle" aria-expanded={open} aria-controls={panel} onClick={() => setOpen(!open)}>
        {t(open ? 'site.cp.prog.hide' : 'site.cp.prog.sample')}
        <Icon name="down" size={16} strokeWidth={2} />
      </button>
      <div id={panel} className="cp-sample" hidden={!open}>
        <b>{L(prog.sample.title)}</b>
        <ul>
          {prog.sample.exercises.map((ex, i) => (
            <li key={i}><span>{L(ex.name)}</span><span className="cp-rx" dir="ltr">{ex.prescription}</span></li>
          ))}
        </ul>
      </div>

      <div className="cp-prog-foot">
        <span className="cp-prog-price">
          {prog.price ? t('site.cp.prog.oneOff', { price: money(prog.price) }) : t('site.cp.prog.included')}
        </span>
        <Link to={join(prog.id)} className="cp-link">
          {t('site.cp.prog.start')}<Icon name="arrow" size={16} strokeWidth={2} />
        </Link>
      </div>
    </RevealItem>
  );
}
