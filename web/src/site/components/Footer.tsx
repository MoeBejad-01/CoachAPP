import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { useI18n } from '../../i18n';
import { SOCIALS } from '../config/site';
import { Logo } from './Logo';
import { SectionLink } from './Nav';
import { LanguageSwitch, ThemeToggle } from './Toggles';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="s-footer">
      <div className="s-container">
        <div className="s-footer-top">
          <div className="s-footer-brand">
            <Logo />
            <p>{t('site.footer.tagline')}</p>
            <div className="s-footer-toggles">
              <LanguageSwitch />
              <ThemeToggle />
            </div>
          </div>
          <nav className="s-footer-cols" aria-label={t('site.footer.label')}>
            <div>
              <h2>{t('site.footer.product')}</h2>
              <ul>
                <li><SectionLink id="features">{t('site.nav.features')}</SectionLink></li>
                <li><SectionLink id="how-it-works">{t('site.nav.how')}</SectionLink></li>
                <li><SectionLink id="pricing">{t('site.nav.pricing')}</SectionLink></li>
              </ul>
            </div>
            <div>
              <h2>{t('site.footer.solutions')}</h2>
              <ul>
                <li><SectionLink id="for-coaches">{t('site.nav.coaches')}</SectionLink></li>
                <li><SectionLink id="for-trainees">{t('site.nav.trainees')}</SectionLink></li>
                <li><SectionLink id="services">{t('site.footer.services')}</SectionLink></li>
              </ul>
            </div>
            <div>
              <h2>{t('site.footer.company')}</h2>
              <ul>
                <li><SectionLink id="about">{t('site.nav.about')}</SectionLink></li>
                <li><SectionLink id="contact">{t('site.nav.contact')}</SectionLink></li>
                <li><Link to="/login">{t('site.nav.login')}</Link></li>
                <li><Link to="/signup">{t('site.footer.signup')}</Link></li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="s-footer-bottom">
          <p>{t('site.footer.rights', { year: new Date().getFullYear() })}</p>
          <ul className="s-socials">
            {SOCIALS.map((s) => (
              <li key={s.id}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="s-icon-btn" aria-label={t('site.social.on', { network: s.name })}>
                  <Icon name={s.icon} size={18} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
