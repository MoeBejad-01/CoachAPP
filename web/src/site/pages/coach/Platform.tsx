// The coach's own competition lifts, presented like a meet: each lift gets
// three judges' lights that turn white, one after another, as it scrolls in.

import type { CSSProperties } from 'react';
import { useI18n } from '../../../i18n';
import { useCoach } from '../../coach/kit';
import { SectionHeader, cx } from '../../components/ui';
import { useReveal } from '../../motion';

export function Platform() {
  const { t } = useI18n();
  const { p, L, num, first } = useCoach();
  const [board, lit] = useReveal<HTMLUListElement>();
  const { lifts, bodyweightKg, meet } = p.platform!;
  const total = lifts.reduce((sum, l) => sum + l.kg, 0);
  const kg = (n: number) => <>{num(n, Number.isInteger(n) ? 0 : 1)}<small>{t('site.cp.kg')}</small></>;

  return (
    <section id="platform" className="s-section cp-platform" aria-labelledby="cp-platform-title">
      <div className="cp-platform-spot" aria-hidden="true" />
      <div className="s-container">
        <SectionHeader id="cp-platform-title" eyebrow={t('site.cp.platform.eyebrow', { name: first })} title={t('site.cp.platform.title')} />
        <ul ref={board} className={cx('cp-lifts', lit && 'is-in')}>
          {lifts.map((l, i) => (
            <li key={i} style={{ '--card': i } as CSSProperties}>
              <span className="cp-lift-name">{L(l.name)}</span>
              <b className="cp-lift-kg">{kg(l.kg)}</b>
              <span className="cp-lights" role="img" aria-label={t('site.cp.platform.lights')}>
                {[0, 1, 2].map((j) => <i key={j} style={{ '--l': j } as CSSProperties} />)}
              </span>
              <span className="cp-good" aria-hidden="true">{t('site.cp.platform.good')}</span>
            </li>
          ))}
        </ul>
        <dl className="cp-platform-meta">
          <div><dt>{t('site.cp.platform.total')}</dt><dd>{kg(total)}</dd></div>
          <div><dt>{t('site.cp.platform.bodyweight')}</dt><dd>{kg(bodyweightKg)}</dd></div>
          <div><dt>{t('site.cp.platform.meet')}</dt><dd>{L(meet)}</dd></div>
        </dl>
      </div>
    </section>
  );
}
