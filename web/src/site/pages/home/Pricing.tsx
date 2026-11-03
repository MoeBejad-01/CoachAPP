import { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import { CURRENCY, PLANS, PRICING_LIVE, type Plan } from '../../config/pricing';
import { Button, RevealItem, Section, SectionHeader, cx } from '../../components/ui';

type Period = 'monthly' | 'yearly';

export function Pricing({ onWaitlist }: { onWaitlist: (plan: Plan) => void }) {
  const { t, lang } = useI18n();
  const [period, setPeriod] = useState<Period>('monthly');
  const money = new Intl.NumberFormat(lang === 'ar' ? 'ar' : 'en', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });

  return (
    <Section id="pricing" labelledBy="pricing-title" className="pricing">
      <SectionHeader id="pricing-title" eyebrow={t('site.pricing.eyebrow')} title={t('site.pricing.title')}
        lead={t(PRICING_LIVE ? 'site.pricing.lead' : 'site.pricing.leadSoon')} />

      <div className="pricing-toggle">
        <div className="s-seg s-seg--lg" role="group" aria-label={t('site.pricing.period')}>
          {(['monthly', 'yearly'] as Period[]).map((p) => (
            <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>
              {t(p === 'monthly' ? 'site.pricing.monthly' : 'site.pricing.yearly')}
            </button>
          ))}
        </div>
        <span className="pricing-save">{t('site.pricing.save')}</span>
      </div>

      <ul className="plans">
        {PLANS.map((plan, i) => {
          const price = PRICING_LIVE && plan.price ? plan.price[period] : null;
          const base = plan.extends && PLANS.find((p) => p.id === plan.extends);
          return (
            <RevealItem key={plan.id} delay={i * 90} className={cx('s-card plan', plan.highlighted && 'plan--hi')}>
              {plan.highlighted && <span className="plan-badge">{t('site.pricing.popular')}</span>}
              <h3>{t(plan.name)}</h3>
              <p className="plan-blurb">{t(plan.blurb)}</p>
              <div className="plan-price">
                {price !== null ? (
                  <>
                    <b>{money.format(price)}</b>
                    <span>{t(period === 'monthly' ? 'site.pricing.perMonth' : 'site.pricing.perYear')}</span>
                  </>
                ) : (
                  <>
                    <b className="plan-soon">{t('site.pricing.soon')}</b>
                    <span>{t(period === 'monthly' ? 'site.pricing.billedMonthly' : 'site.pricing.billedYearly')}</span>
                  </>
                )}
              </div>
              <Button variant={plan.highlighted ? 'primary' : 'secondary'} block onClick={() => onWaitlist(plan)}>
                {t(PRICING_LIVE ? 'site.pricing.choose' : 'site.pricing.waitlist')}
              </Button>
              <ul className="plan-features">
                {base && <li className="plan-base">{t('site.pricing.everything', { plan: t(base.name) })}</li>}
                {plan.features.map((f) => (
                  <li key={f.key + JSON.stringify(f.vars ?? {})}>
                    <Icon name="check" size={16} strokeWidth={2.5} />{t(f.key, f.vars)}
                  </li>
                ))}
              </ul>
            </RevealItem>
          );
        })}
      </ul>
      <p className="pricing-foot">{t('site.pricing.foot')}</p>
    </Section>
  );
}
