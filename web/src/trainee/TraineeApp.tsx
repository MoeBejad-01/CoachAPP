// The trainee's mobile app. It reads the same workspace as the coach dashboard,
// so whatever the coach assigns shows up here, and whatever the trainee logs
// shows up on the coach side immediately.

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { touchTrainee } from '../data/actions';
import { computeStats, fullName, logsByTrainee, type TraineeStats } from '../data/selectors';
import { useAppState } from '../data/store';
import type { Trainee, WorkoutLog } from '../data/types';
import { Icon, type IconName } from '../components/Icon';
import { useAuth } from '../auth/AuthProvider';
import { useI18n } from '../i18n';
import './trainee.css';

interface Ctx {
  trainee: Trainee;
  logs: WorkoutLog[];
  stats: TraineeStats;
  base: string;
}

const TraineeCtx = createContext<Ctx | null>(null);

export function useTraineeApp(): Ctx {
  const v = useContext(TraineeCtx);
  if (!v) throw new Error('useTraineeApp must be used inside the trainee app');
  return v;
}

export function TraineeAppRoot() {
  const { tid = '' } = useParams();
  const state = useAppState();
  const trainee = state.trainees.find((t) => t.id === tid);
  const logs = useMemo(() => logsByTrainee(state).get(tid) ?? [], [state, tid]);
  const stats = useMemo(() => (trainee ? computeStats(state, trainee, logs) : null), [state, trainee, logs]);
  useEffect(() => { if (trainee) touchTrainee(trainee.id); }, [trainee?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!trainee || !stats) return <Navigate to="/app" replace />;
  return (
    <TraineeCtx.Provider value={{ trainee, logs, stats, base: `/app/${trainee.id}` }}>
      <PreviewStage>
        <Outlet />
      </PreviewStage>
    </TraineeCtx.Provider>
  );
}

/** /app with no trainee picks the first active one (demo sign-in). */
export function TraineeAppIndex() {
  const state = useAppState();
  const auth = useAuth();
  if (auth.role === 'trainee' && auth.traineeId) return <Navigate to={`/app/${auth.traineeId}`} replace />;
  const first = state.trainees.find((t) => t.status === 'active') ?? state.trainees[0];
  return first ? <Navigate to={`/app/${first.id}`} replace /> : <Navigate to="/" replace />;
}

/** On desktop the app sits in a phone frame next to a small preview panel. */
function PreviewStage({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const state = useAppState();
  const { trainee } = useTraineeApp();
  const navigate = useNavigate();
  const auth = useAuth();
  return (
    <div className="ta-stage">
      <aside className="ta-side">
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">{t('ta.preview.eyebrow')}</span>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{t('ta.preview.title')}</h1>
          <p className="small muted" style={{ lineHeight: 1.5 }}>{t('ta.preview.desc')}</p>
        </div>
        {auth.role === 'trainee' ? (
          <div className="stack" style={{ gap: 8 }}>
            <span className="small muted">{t('auth.signedInAs', { email: auth.email ?? '' })}</span>
            <button type="button" className="btn" onClick={() => void auth.signOut()}>{t('auth.signOut')}</button>
            <button type="button" className="btn ghost" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Icon name="globe" size={16} />{t('nav.switchLang')}</button>
          </div>
        ) : (
          <>
            <label className="field">{t('ta.preview.signedInAs')}
              <select className="select" value={trainee.id} onChange={(e) => navigate(`/app/${e.target.value}`)}>
                {state.trainees.map((x) => <option key={x.id} value={x.id}>{fullName(x)}</option>)}
              </select>
            </label>
            <div className="stack" style={{ gap: 8 }}>
              <Link to={`/trainees/${trainee.id}`} className="btn"><Icon name="chevronLeft" size={16} />{t('ta.preview.coachView')}</Link>
              <button type="button" className="btn ghost" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Icon name="globe" size={16} />{t('nav.switchLang')}</button>
            </div>
          </>
        )}
        <ul className="ta-side-list small muted">
          <li>{t('ta.preview.point1')}</li>
          <li>{t('ta.preview.point2')}</li>
          <li>{t('ta.preview.point3')}</li>
        </ul>
      </aside>
      <div className="ta-phone">
        <div className="ta-app">{children}</div>
      </div>
    </div>
  );
}

const TABS: { to: string; icon: IconName; key: 'today' | 'program' | 'progress' | 'coach' | 'me' }[] = [
  { to: '', icon: 'grid', key: 'today' },
  { to: 'program', icon: 'clipboard', key: 'program' },
  { to: 'progress', icon: 'chart', key: 'progress' },
  { to: 'coach', icon: 'message', key: 'coach' },
  { to: 'me', icon: 'user', key: 'me' },
];

/** Screen with the bottom tab bar. */
export function TabScreen({ title, sub, action, children, footer }: { title: string; sub?: ReactNode; action?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const { t } = useI18n();
  const state = useAppState();
  const { trainee, base } = useTraineeApp();
  const unseen = state.messages.filter((m) => m.traineeId === trainee.id && m.from === 'coach' && m.seen === false).length;
  return (
    <>
      <div className="ta-scroll">
        <header className="ta-head">
          <div className="stack" style={{ gap: 2, minWidth: 0 }}>
            {sub && <span className="ta-sub">{sub}</span>}
            <h1 className="ta-title">{title}</h1>
          </div>
          {action}
        </header>
        <div className="ta-body">{children}</div>
      </div>
      {footer}
      <nav className="ta-tabs" aria-label={t('ta.tabs')}>
        {TABS.map((x) => (
          <NavLink key={x.key} to={x.to ? `${base}/${x.to}` : base} end={!x.to} className={({ isActive }) => `ta-tab${isActive ? ' on' : ''}`}>
            <span className="ta-tab-icon"><Icon name={x.icon} size={21} />{x.key === 'coach' && unseen > 0 && <span className="ta-dot">{unseen}</span>}</span>
            <span>{t(`ta.tab.${x.key}`)}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

/** Full-screen task (workout, check-in, upload) with a back button and no tab bar. */
export function TaskScreen({ title, onBack, right, children, footer }: { title: string; onBack: () => void; right?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const { t } = useI18n();
  return (
    <>
      <header className="ta-taskbar">
        <button type="button" className="ta-icon-btn" aria-label={t('ta.back')} onClick={onBack}><Icon name="chevronLeft" size={20} /></button>
        <span className="ta-taskbar-title ellipsis">{title}</span>
        <span style={{ minWidth: 36, display: 'flex', justifyContent: 'flex-end' }}>{right}</span>
      </header>
      <div className="ta-scroll"><div className="ta-body">{children}</div></div>
      {footer && <div className="ta-footer">{footer}</div>}
    </>
  );
}
