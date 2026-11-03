// Numbered steps with a progress line; the barbell beside them loads one plate
// pair per step as the steps scroll past the middle of the screen.

import { useRef, useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import { STEPS } from '../../config/content';
import { Barbell, barbellTotal } from '../../components/Barbell';
import { Section, SectionHeader, cx } from '../../components/ui';
import { useReducedMotion, useScrollTracker } from '../../motion';

const PLATES = STEPS.map((s) => s.plateKg);
/** A step counts as reached once its top passes this fraction of the viewport. */
const LINE = 0.62;

export function HowItWorks() {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const list = useRef<HTMLOListElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [reached, setReached] = useState(0);

  useScrollTracker(list, (rect, vh) => {
    const el = list.current;
    if (!el) return;
    let n = 0;
    el.querySelectorAll('.how-step').forEach((s) => { if (s.getBoundingClientRect().top < vh * LINE) n++; });
    setReached(n);
    const p = Math.min(1, Math.max(0, (vh * LINE - rect.top) / rect.height));
    el.style.setProperty('--line', p.toFixed(3));
    stage.current?.style.setProperty('--tilt', `${((p - 0.5) * 5).toFixed(2)}deg`);
  }, !reduced);

  const loaded = reduced ? STEPS.length : reached;
  const kg = barbellTotal(PLATES, loaded);

  return (
    <Section id="how-it-works" tone="alt" labelledBy="how-title" className="how">
      <SectionHeader id="how-title" eyebrow={t('site.how.eyebrow')} title={t('site.how.title')} lead={t('site.how.lead')} />
      <div className={cx('how-grid', reduced && 'is-static')}>
        <ol ref={list} className="how-steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className={cx('how-step', i < loaded && 'is-active')}>
              <span className="how-num" aria-hidden="true">{i + 1}</span>
              <div className="how-body">
                <span className="how-label">{t('site.how.step', { n: i + 1 })}</span>
                <h3>{t(s.title)}</h3>
                <p>{t(s.body)}</p>
              </div>
              <span className="how-ico" aria-hidden="true"><Icon name={s.icon} size={20} /></span>
            </li>
          ))}
        </ol>
        <div className="how-aside">
          <div ref={stage} className="how-stage">
            <div className="how-bar">
              <Barbell plates={PLATES} loaded={loaded} label={t('site.how.barbell', { n: loaded, total: STEPS.length, kg })} />
            </div>
            <div className="how-readout" aria-hidden="true">
              <b>{t('site.how.kg', { n: kg })}</b>
              <span>{t('site.how.loaded', { n: loaded, total: STEPS.length })}</span>
            </div>
            <div className="how-dots" aria-hidden="true">
              {STEPS.map((s, i) => <span key={s.title} className={i < loaded ? 'on' : undefined} />)}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
