// Layout shared by log in, sign up and forgot password: a centred card on a
// soft gradient, with an illustrated panel beside it on wide screens.

import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import type { StringKey } from '../../../i18n/strings';
import { AppleMark, GoogleMark } from '../../components/BrandIcons';
import { DumbbellArt } from '../../components/Dumbbell';
import { Logo } from '../../components/Logo';
import { LanguageSwitch, ThemeToggle } from '../../components/Toggles';
import { SiteShell } from '../../components/SiteShell';
import { Button } from '../../components/ui';
import '../../auth.css';

const SIDE_POINTS: StringKey[] = ['site.feat.programs.title', 'site.feat.progress.title', 'site.feat.chat.title', 'site.feat.sync.title'];

export function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <SiteShell className="auth">
      <div className="auth-bg" aria-hidden="true" />
      <header className="auth-top">
        <div className="s-container auth-top-in">
          <Logo />
          <div className="auth-tools">
            <Link to="/" className="s-nav-link auth-home">{t('site.nav.homeLink')}</Link>
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="auth-main">
        <div className="auth-layout">
          <aside className="auth-side">
            <div className="auth-side-art" aria-hidden="true">
              <DumbbellArt />
            </div>
            <h2>{t('site.auth.sideTitle')}</h2>
            <ul>
              {SIDE_POINTS.map((k) => <li key={k}><Icon name="check" size={16} strokeWidth={2.5} />{t(k)}</li>)}
            </ul>
          </aside>
          <div className="auth-card">{children}</div>
        </div>
        <p className="auth-back">
          <Link to="/"><Icon name="chevronLeft" size={16} strokeWidth={2} />{t('site.auth.backHome')}</Link>
        </p>
      </main>
    </SiteShell>
  );
}

/** Placeholder Google / Apple buttons until real providers are connected. */
export function SocialButtons() {
  const { t } = useI18n();
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="auth-social">
      <Button variant="secondary" block onClick={() => setNote(t('site.auth.socialSoon', { provider: 'Google' }))}>
        <GoogleMark />{t('site.auth.google')}
      </Button>
      <Button variant="secondary" block onClick={() => setNote(t('site.auth.socialSoon', { provider: 'Apple' }))}>
        <AppleMark />{t('site.auth.apple')}
      </Button>
      <p className="auth-note" role="status">{note}</p>
    </div>
  );
}

export function OrDivider() {
  const { t } = useI18n();
  return <div className="auth-or"><span>{t('site.auth.or')}</span></div>;
}
