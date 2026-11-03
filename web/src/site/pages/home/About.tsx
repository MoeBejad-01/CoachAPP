import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import { ABOUT_VALUES, SERVICES } from '../../config/content';
import { Reveal, RevealItem, Section, SectionHeader } from '../../components/ui';

export function About() {
  const { t } = useI18n();
  return (
    <Section id="about" labelledBy="about-title" className="about">
      <div className="about-grid">
        <SectionHeader id="about-title" align="start" eyebrow={t('site.about.eyebrow')} title={t('site.about.title')} />
        <Reveal className="about-story" delay={120}>
          <p>{t('site.about.body1')}</p>
          <p>{t('site.about.body2')}</p>
        </Reveal>
      </div>
      <ul className="about-values">
        {ABOUT_VALUES.map((v, i) => (
          <RevealItem key={v.title} delay={i * 90}>
            <span className="s-ico"><Icon name={v.icon} size={20} /></span>
            <h3>{t(v.title)}</h3>
            <p>{t(v.body)}</p>
          </RevealItem>
        ))}
      </ul>
    </Section>
  );
}

export function Services() {
  const { t } = useI18n();
  return (
    <Section id="services" tone="alt" labelledBy="services-title">
      <SectionHeader id="services-title" eyebrow={t('site.svc.eyebrow')} title={t('site.svc.title')} lead={t('site.svc.lead')} />
      <ul className="svc-grid">
        {SERVICES.map((s, i) => (
          <RevealItem key={s.title} className="s-card svc-card" delay={i * 70}>
            <div className="svc-top">
              <span className="s-ico s-ico--brand"><Icon name={s.icon} size={22} /></span>
              <span className="svc-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h3>{t(s.title)}</h3>
            <p>{t(s.body)}</p>
          </RevealItem>
        ))}
      </ul>
    </Section>
  );
}
