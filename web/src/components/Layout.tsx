import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { pendingRequests } from '../data/joinRequests';
import { unreadTotal } from '../data/selectors';
import { useAppState, useSyncStatus } from '../data/store';
import { useAuth } from '../auth/AuthProvider';
import { useI18n } from '../i18n';
import { Icon, type IconName } from './Icon';

function Item({ to, icon, label, end, extra }: { to: string; icon: IconName; label: string; end?: boolean; extra?: React.ReactNode }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
      <Icon name={icon} size={17} />
      <span className="grow">{label}</span>
      {extra}
      <span className="nav-chev"><Icon name="chevron" size={14} /></span>
    </NavLink>
  );
}

export function Layout() {
  const state = useAppState();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const unread = unreadTotal(state);
  const waiting = pendingRequests(state.joinRequests).length;
  const theme = state.coach.theme ?? 'dark';
  const auth = useAuth();
  const sync = useSyncStatus();
  return (
    <div className="shell" data-theme={theme}>
      <nav className="sidebar" aria-label={t('nav.primary')}>
        <div className="side-top">
          <NavLink to="/coach/settings" className="side-icon" aria-label={t('nav.settings')}><Icon name="user" size={17} /></NavLink>
          <div className="row" style={{ gap: 4 }}>
            <button type="button" className="side-icon" aria-label={t('nav.switchLang')} title={t('nav.switchLang')} onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Icon name="globe" size={17} /></button>
            <NavLink to="/coach/settings" className="side-icon" aria-label={t('nav.settings')}><Icon name="sliders" size={17} /></NavLink>
          </div>
        </div>
        <div className="brand">{state.coach.businessName}</div>

        <div className="nav-group">
          <div className="nav-label">{t('nav.general')}</div>
          <Item to="/coach" end icon="grid" label={t('nav.overview')} />
          <Item to="/coach/trainees" icon="users" label={t('nav.trainees')} extra={<span className="nav-count">{state.trainees.length}</span>} />
          <Item to="/coach/requests" icon="user" label={t('nav.requests')} extra={waiting > 0 ? <span className="nav-badge">{waiting}</span> : null} />
          <Item to="/coach/history" icon="calendar" label={t('nav.history')} />
          <Item to="/coach/programs" icon="clipboard" label={t('nav.programs')} />
          <Item to="/coach/messages" icon="message" label={t('nav.messages')} extra={unread > 0 ? <span className="nav-badge">{unread}</span> : null} />
          <Item to="/coach/calendar" icon="bolt" label={t('nav.calendar')} />
        </div>
        <div className="nav-group">
          <div className="nav-label">{t('nav.management')}</div>
          <Item to="/coach/billing" icon="card" label={t('nav.billing')} />
          <Item to="/coach/settings" icon="sliders" label={t('nav.settings')} />
          <Item to="/app" icon="play" label={t('nav.traineeApp')} />
        </div>

        <div className="side-foot">
          <button type="button" className="mode-toggle" role="switch" aria-checked="true" onClick={() => navigate('/app')}>
            <Icon name="user" size={17} />
            <span className="grow">{t('nav.coachMode')}</span>
            <span className="switch on" aria-hidden="true"><span /></span>
          </button>
          <NavLink to="/coach/settings" className="nav-link">
            <span className="avatar" style={{ width: 24, height: 24, background: 'var(--side-strong)', color: 'var(--side)', fontSize: 10 }}>{state.coach.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
            <span className="grow ellipsis">{state.coach.name}</span>
            <span className="nav-chev"><Icon name="chevron" size={14} /></span>
          </NavLink>
          {auth.status === 'ready' && (
            <>
              <span className={`sync-state${sync.error ? ' err' : ''}`} title={sync.error ?? undefined}>
                <span className="sync-dot" />{sync.error ? t('auth.syncError') : sync.pending ? t('auth.saving') : t('auth.saved')}
              </span>
              <button type="button" className="nav-link" style={{ border: 0, background: 'transparent', width: '100%', textAlign: 'start' }} onClick={() => void auth.signOut()}>
                <Icon name="chevronLeft" size={17} /><span className="grow">{t('auth.signOut')}</span>
              </button>
            </>
          )}
          <span className="side-copy">© {new Date().getFullYear()} {state.coach.businessName}</span>
        </div>
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
