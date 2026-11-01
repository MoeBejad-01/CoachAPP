import { NavLink, Outlet } from 'react-router-dom';
import { unreadTotal } from '../data/selectors';
import { useAppState } from '../data/store';
import { useI18n } from '../i18n';
import { Icon, type IconName } from './Icon';

function Item({ to, icon, label, end, extra }: { to: string; icon: IconName; label: string; end?: boolean; extra?: React.ReactNode }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
      <Icon name={icon} />
      {label}
      {extra}
    </NavLink>
  );
}

export function Layout() {
  const state = useAppState();
  const { t, lang, setLang } = useI18n();
  const unread = unreadTotal(state);
  const words = state.coach.name.split(' ');
  return (
    <div className="shell">
      <nav className="sidebar" aria-label={t('nav.primary')}>
        <div className="brand">
          <span className="brand-mark">{state.coach.businessName[0]}</span>
          {state.coach.businessName}
        </div>
        <div className="nav-group">
          <div className="nav-label">{t('nav.workspace')}</div>
          <Item to="/" end icon="grid" label={t('nav.overview')} />
          <Item to="/trainees" icon="users" label={t('nav.trainees')} extra={<span className="nav-count">{state.trainees.length}</span>} />
          <Item to="/programs" icon="clipboard" label={t('nav.programs')} />
          <Item to="/messages" icon="message" label={t('nav.messages')} extra={unread > 0 ? <span className="nav-badge">{unread}</span> : null} />
          <Item to="/calendar" icon="calendar" label={t('nav.calendar')} />
          <Item to="/billing" icon="card" label={t('nav.billing')} />
        </div>
        <div className="nav-group">
          <div className="nav-label">{t('nav.account')}</div>
          <Item to="/settings" icon="sliders" label={t('nav.settings')} />
          <Item to="/app" icon="user" label={t('nav.traineeApp')} />
          <button type="button" className="nav-link" style={{ border: 0, background: 'transparent', width: '100%', textAlign: 'start' }}
            lang={lang === 'ar' ? 'en' : 'ar'} onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
            <Icon name="globe" />
            {t('nav.switchLang')}
          </button>
        </div>
        <div className="side-user">
          <span className="avatar" style={{ width: 34, height: 34, background: '#3a3d45', color: '#fff', fontSize: 12 }}>
            {words.map((w) => w[0]).slice(0, 2).join('')}
          </span>
          <div className="stack" style={{ gap: 2 }}>
            <span className="name">{state.coach.name}</span>
            <span className="role">{state.coach.title}</span>
          </div>
        </div>
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
