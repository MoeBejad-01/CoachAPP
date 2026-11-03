import { useI18n } from '../../../i18n';
import { Dumbbell3D } from '../../components/Dumbbell';
import { SectionLink } from '../../components/Nav';
import { ButtonLink, Reveal } from '../../components/ui';

export function CtaBand() {
  const { t } = useI18n();
  return (
    <section className="cta" aria-labelledby="cta-title">
      <div className="s-container">
        <Reveal className="cta-card">
          <div className="cta-glow" aria-hidden="true" />
          <div className="cta-copy">
            <h2 id="cta-title">{t('site.cta.title')}</h2>
            <p>{t('site.cta.body')}</p>
            <div className="cta-actions">
              <ButtonLink to="/signup" size="lg" variant="onDark">{t('site.cta.button')}</ButtonLink>
              <SectionLink id="contact" className="s-btn s-btn--lg s-btn--onDarkGhost">{t('site.cta.secondary')}</SectionLink>
            </div>
          </div>
          <Dumbbell3D className="cta-3d" />
        </Reveal>
      </div>
    </section>
  );
}
