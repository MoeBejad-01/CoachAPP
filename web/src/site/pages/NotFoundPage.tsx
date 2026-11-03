import { useI18n } from '../../i18n';
import { Barbell } from '../components/Barbell';
import { Footer } from '../components/Footer';
import { Nav } from '../components/Nav';
import { SiteShell } from '../components/SiteShell';
import { ButtonLink } from '../components/ui';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <SiteShell className="nf">
      <Nav />
      <main id="main" tabIndex={-1} className="nf-main">
        <div className="s-container nf-in">
          <div className="nf-bar"><Barbell plates={[25, 20]} loaded={0} label={t('site.nf.art')} /></div>
          <p className="s-eyebrow">404</p>
          <h1>{t('site.nf.title')}</h1>
          <p className="nf-lead">{t('site.nf.body')}</p>
          <div className="nf-actions">
            <ButtonLink to="/" size="lg">{t('site.nf.home')}</ButtonLink>
            <ButtonLink to="/login" size="lg" variant="ghost">{t('site.nav.login')}</ButtonLink>
          </div>
        </div>
      </main>
      <Footer />
    </SiteShell>
  );
}
