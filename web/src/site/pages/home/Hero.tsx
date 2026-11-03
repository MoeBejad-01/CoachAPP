import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import { AnatomyFigure } from '../../components/anatomy/AnatomyFigure';
import { SectionLink } from '../../components/Nav';
import { ButtonLink } from '../../components/ui';

export function Hero() {
  const { t } = useI18n();
  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <div className="hero-bg" aria-hidden="true" />
      <div className="s-container hero-in">
        <div className="hero-copy">
          <p className="s-eyebrow">{t('site.hero.eyebrow')}</p>
          <h1 id="hero-title" className="hero-title">
            <span>{t('site.hero.title1')}</span>{' '}
            <span className="s-grad-text">{t('site.hero.title2')}</span>
          </h1>
          <p className="hero-lead">{t('site.hero.lead')}</p>
          <div className="hero-ctas">
            <ButtonLink to="/signup" size="lg">{t('site.hero.primary')}</ButtonLink>
            <SectionLink id="how-it-works" className="s-btn s-btn--ghost s-btn--lg">
              {t('site.hero.secondary')}<Icon name="arrow" size={18} strokeWidth={2} />
            </SectionLink>
          </div>
          <p className="hero-note">
            <Icon name="devices" size={16} />{t('site.hero.note')}
          </p>
        </div>
        <div className="hero-visual">
          <div className="hero-card">
            <AnatomyFigure />
          </div>
        </div>
      </div>
    </section>
  );
}
