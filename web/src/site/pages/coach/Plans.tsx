// Coaching plans with "Find your fit": three quick answers highlight the plan
// that matches best, using each plan's `fit` from the coach's profile.

import { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import type { StringKey } from '../../../i18n/strings';
import { useCoach } from '../../coach/kit';
import type { CoachPlan, FitGoal } from '../../coach/types';
import { ButtonLink, Reveal, RevealItem, SectionHeader, cx } from '../../components/ui';

type Mode = CoachPlan['fit']['mode'];
type Support = CoachPlan['fit']['support'];
interface Answers { goal?: FitGoal; mode?: Mode; support?: Support }

const GOALS: [FitGoal, StringKey][] = [
  ['strength', 'site.cp.fit.strength'], ['muscle', 'site.cp.fit.muscle'],
  ['fatloss', 'site.cp.fit.fatloss'], ['compete', 'site.cp.fit.compete'],
];
const MODES: [Mode, StringKey][] = [['online', 'site.cp.fit.online'], ['hybrid', 'site.cp.fit.hybrid']];
const SUPPORT: [Support, StringKey][] = [['weekly', 'site.cp.fit.weekly'], ['daily', 'site.cp.fit.daily']];

/** Training mode counts most, then support level, then goal. */
function score(plan: CoachPlan, a: Answers) {
  return (a.mode === plan.fit.mode ? 4 : 0) + (a.support === plan.fit.support ? 2 : 0) + (a.goal && plan.fit.goals.includes(a.goal) ? 1 : 0);
}

export function Plans() {
  const { t } = useI18n();
  const { p, L, count, money, join, first, lang } = useCoach();
  const [a, setA] = useState<Answers>({});
  const answered = a.goal || a.mode || a.support;
  const best = answered
    ? p.plans.reduce((top, plan) => (score(plan, a) > score(top, a) ? plan : top), p.plans[0])
    : null;
  const currency = new Intl.DisplayNames([lang], { type: 'currency' }).of(p.currency) ?? p.currency;

  const choice = <K extends keyof Answers>(key: K, label: StringKey, opts: [NonNullable<Answers[K]>, StringKey][]) => (
    <div className="cp-fit-q" role="group" aria-label={t(label)}>
      <span className="cp-fit-label">{t(label)}</span>
      <div className="cp-fit-opts">
        {opts.map(([v, k]) => (
          <button key={v} type="button" className="cp-pill" aria-pressed={a[key] === v}
            onClick={() => setA({ ...a, [key]: a[key] === v ? undefined : v })}>
            {t(k)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <section id="plans" className="s-section cp-plans" aria-labelledby="cp-plans-title">
      <div className="s-container">
        <SectionHeader id="cp-plans-title" eyebrow={t('site.cp.plans.eyebrow')} title={t('site.cp.plans.title', { name: first })} />

        <Reveal className="cp-fit">
          <div className="cp-fit-head">
            <span className="s-ico s-ico--brand"><Icon name="sparkles" size={20} /></span>
            <div>
              <h3>{t('site.cp.fit.title')}</h3>
              <p>{t('site.cp.fit.lead')}</p>
            </div>
            {answered && <button type="button" className="cp-fit-reset" onClick={() => setA({})}>{t('site.cp.fit.reset')}</button>}
          </div>
          <div className="cp-fit-grid">
            {choice('goal', 'site.cp.fit.q1', GOALS)}
            {choice('mode', 'site.cp.fit.q2', MODES)}
            {choice('support', 'site.cp.fit.q3', SUPPORT)}
          </div>
          <p className="sr-only" aria-live="polite">{best ? t('site.cp.fit.announce', { plan: L(best.name) }) : ''}</p>
        </Reveal>

        <ul className={cx('cp-plan-grid', best && 'has-match')}>
          {p.plans.map((plan, i) => (
            <RevealItem key={plan.id} delay={i * 90} className={cx('s-card cp-plan', plan.popular && 'is-popular', best?.id === plan.id && 'is-match')}>
              {best?.id === plan.id ? (
                <span className="cp-plan-badge is-match"><Icon name="check" size={13} strokeWidth={3} />{t('site.cp.fit.match')}</span>
              ) : plan.popular ? (
                <span className="cp-plan-badge">{t('site.cp.plans.popular')}</span>
              ) : null}
              <h3>{L(plan.name)}</h3>
              <p className="cp-plan-blurb">{L(plan.blurb)}</p>
              <div className="cp-plan-price">
                <b>{money(plan.pricePerMonth)}</b>
                <span>{t('site.cp.plans.perMonth')}</span>
              </div>
              {plan.minMonths && <p className="cp-plan-min">{t('site.cp.plans.min', { term: count('site.cp.months', plan.minMonths) })}</p>}
              <ButtonLink to={join(plan.id)} variant={best?.id === plan.id || (!best && plan.popular) ? 'primary' : 'secondary'} block>
                {t('site.cp.plans.choose')}
              </ButtonLink>
              <ul className="cp-plan-features">
                {plan.features.map((f, j) => <li key={j}><Icon name="check" size={16} strokeWidth={2.5} />{L(f)}</li>)}
              </ul>
              {plan.spotsLeft !== undefined && <p className="cp-plan-spots"><i />{count('site.cp.left', plan.spotsLeft)}</p>}
            </RevealItem>
          ))}
        </ul>
        <p className="cp-pay"><Icon name="card" size={18} />{t('site.cp.plans.note', { currency, name: first })}</p>
      </div>
    </section>
  );
}
