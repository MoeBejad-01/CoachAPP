import { Fragment, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { setTraineeStatus } from '../data/actions';
import { shown } from '../data/layout';
import { ALL_TIME } from '../data/progress';
import { computeStats, formatMoney, fullName, logsByTrainee, type TraineeStats } from '../data/selectors';
import { useAppState } from '../data/store';
import type { AppState, DetailId, StatId, Trainee, TraineeStatus, TraineeTabId, WorkoutLog } from '../data/types';
import { Icon } from '../components/Icon';
import { Avatar, Empty, GroupChip, useToast } from '../components/ui';
import { useT, type T } from '../i18n';
import { flagDetail, flagText } from '../i18n/flags';
import { addDays, ageFrom, daysBetween, fmtAgo, fmtDay, fmtLong, fmtRelativeDay, todayISO } from '../lib/dates';
import { e1rm, fmtKg } from '../lib/util';
import { CustomizePanel } from './trainee/Customize';
import { goalPct } from './trainee/sections';
import { EditProfileModal } from './trainee/modals';
import { CheckinsTab, NotesTab, OverviewTab, ProgramTab, ProgressTab, WorkoutsTab } from './trainee/tabs';

const TABS: TabId[] = ['overview', 'program', 'workouts', 'progress', 'notes', 'checkins'];
export type TabId = TraineeTabId;
const STATUSES: TraineeStatus[] = ['onboarding', 'active', 'paused', 'inactive'];

export function TraineePage() {
  const { id = '' } = useParams();
  const state = useAppState();
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const trainee = state.trainees.find((x) => x.id === id);
  const logs = useMemo(() => logsByTrainee(state).get(id) ?? [], [state, id]);
  const stats = useMemo(() => (trainee ? computeStats(state, trainee, logs) : null), [state, trainee, logs]);

  if (!trainee || !stats) {
    return (
      <div className="card"><Empty>{t('trainee.notFound')} <Link to="/coach/trainees">{t('trainee.backToList')}</Link></Empty></div>
    );
  }

  const L = state.traineeLayout;
  const tab: TabId = TABS.find((x) => x === params.get('tab')) ?? L.defaultTab;
  const goTab = (x: TabId) => setParams(x === L.defaultTab ? {} : { tab: x }, { replace: true });
  const today = todayISO();
  const statCtx = { state, trainee, stats, logs, t, today, warnAt: L.adherenceWarn };
  const strip = shown(L.stats).map((id) => ({ id, ...statFor(id, statCtx) }));
  const badges = shown(L.badges);
  const details = shown(L.details).map((id) => detailFor(id, trainee, t)).filter(Boolean);
  const banners = shown(L.banners);
  const actions = shown(L.actions);
  const tabs = L.tabs.filter((x) => x.on);

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="crumbs">
          <Link to="/coach/trainees">{t('nav.trainees')}</Link><span aria-hidden="true">/</span><span style={{ color: 'var(--ink)' }}>{fullName(trainee)}</span>
        </div>
        <div className="row">
          <Link to={`/app/${trainee.id}`} className="btn sm ghost"><Icon name="user" size={15} />{t('ta.openAs', { name: trainee.firstName })}</Link>
          <button type="button" className={`btn sm${customizing ? ' dark' : ''}`} aria-pressed={customizing} onClick={() => setCustomizing((v) => !v)}>
            <Icon name="sliders" size={15} />{customizing ? t('common.done') : t('custom.button')}
          </button>
        </div>
      </div>

      <section className="card" aria-label={t('trainee.summary')}>
        <div className="row wrap" style={{ padding: '20px 24px', gap: 20, justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 16, minWidth: 0 }}>
            <Avatar trainee={trainee} size={56} />
            <div className="stack" style={{ gap: 6 }}>
              <div className="row wrap" style={{ gap: 10 }}>
                <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{fullName(trainee)}</h1>
                {badges.map((b) => b === 'group' ? <GroupChip key={b} group={stats.group} />
                  : b === 'plan' ? <span key={b} className="chip">{t(`tier.${trainee.tier}`)} · {t(`cycle.${trainee.membership.cycle}`)}</span>
                  : <span key={b} className="chip outline">{t(`goal.${trainee.goalType}`)}</span>)}
              </div>
              {details.length > 0 && <div className="small muted" dir="auto" style={{ textAlign: 'start' }}>{details.join(' · ')}</div>}
            </div>
          </div>
          {actions.length > 0 && (
            <div className="row wrap">
              {actions.map((a) => a === 'status' ? (
                <Fragment key={a}>
                  <label className="sr-only" htmlFor="status">{t('trainee.statusLabel')}</label>
                  <select id="status" className="select" style={{ width: 150 }} value={trainee.status} onChange={(e) => { const s = e.target.value as TraineeStatus; setTraineeStatus(trainee.id, s); toast(t('trainee.statusSet', { s: t(`group.${s}`) })); }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{t(`group.${s}`)}</option>)}
                  </select>
                </Fragment>
              ) : a === 'edit' ? (
                <button key={a} type="button" className="btn" onClick={() => setEditing(true)}><Icon name="edit" size={15} />{t('trainee.editProfile')}</button>
              ) : (
                <button key={a} type="button" className="btn primary" onClick={() => navigate(`/coach/messages/${trainee.id}`)}><Icon name="message" size={16} />{t('common.message')}</button>
              ))}
            </div>
          )}
        </div>

        {banners.map((b) => {
          if (b === 'flags') return stats.flags.length > 0 && (
            <div key={b} className="row wrap banner warn-bg">
              {stats.flags.map((f) => (
                <span key={f.kind} className="small"><span className="warn" style={{ fontWeight: 600 }}>{flagText(t, f)}</span> <span className="muted">· {flagDetail(t, f)}</span></span>
              ))}
            </div>
          );
          const text = b === 'pinned' ? trainee.pinnedNote : trainee.injuries;
          return text && (
            <div key={b} className="row banner" style={{ alignItems: 'baseline' }}>
              <span className="small" style={{ fontWeight: 600, flex: 'none' }}>{b === 'pinned' ? t('form.pinned') : t('form.injuries')}</span>
              <p className="small" style={{ color: 'var(--ink-2)' }}>{text}</p>
            </div>
          );
        })}

        {strip.length > 0 && (
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', borderTop: '1px solid var(--divider)' }}>
            {strip.map((s) => (
              <div key={s.id} className="stack" style={{ padding: '14px 24px', borderInlineEnd: '1px solid var(--divider)' }}>
                <dt className="xs faint">{s.label}</dt>
                <dd className={`ellipsis ${s.tone}`} dir="auto" style={{ margin: 0, fontSize: 16, fontWeight: 600, textAlign: 'start' }}>{s.value}</dd>
                <dd className="xs muted ellipsis" style={{ margin: 0 }}>{s.sub}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="tabs" role="tablist" aria-label={t('trainee.sections')}>
          {tabs.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={`tab${tab === x.id ? ' on' : ''}`} onClick={() => goTab(x.id)}>{x.label.trim() || t(`trainee.tab.${x.id}`)}</button>
          ))}
        </div>
      </section>

      {tab === 'overview' && <OverviewTab trainee={trainee} stats={stats} logs={logs} allLogs={logs} scope={ALL_TIME} goTab={goTab} />}
      {tab === 'program' && <ProgramTab trainee={trainee} logs={logs} />}
      {tab === 'workouts' && <WorkoutsTab logs={logs} />}
      {tab === 'progress' && <ProgressTab trainee={trainee} stats={stats} logs={logs} goTab={goTab} />}
      {tab === 'notes' && <NotesTab trainee={trainee} />}
      {tab === 'checkins' && <CheckinsTab trainee={trainee} />}

      {editing && <EditProfileModal trainee={trainee} onClose={() => setEditing(false)} />}
      {customizing && <CustomizePanel tab={tab} onClose={() => setCustomizing(false)} />}
    </>
  );
}

interface StatCtx { state: AppState; trainee: Trainee; stats: TraineeStats; logs: WorkoutLog[]; t: T; today: string; warnAt: number }

function statFor(id: StatId, { state, trainee, stats, logs, t, today, warnAt }: StatCtx): { label: string; value: string; sub: string; tone: string } {
  switch (id) {
    case 'program':
      return { label: t('trainee.stripProgram'), value: trainee.program?.name ?? t('trainee.noneAssigned'), sub: trainee.program ? (stats.week ? t('common.weekOf', { w: stats.week, n: trainee.program.weeks }) : t('common.starts', { date: fmtDay(trainee.program.startDate) })) : t('trainee.assignHint'), tone: '' };
    case 'adherence':
      return { label: t('kpi.adherence'), value: stats.adherence === null ? '—' : `${stats.adherence}%`, sub: t('trainee.planned', { n: trainee.frequency }), tone: stats.adherence !== null && stats.adherence < warnAt ? 'warn' : '' };
    case 'weight':
      return { label: t('trainee.bodyWeight'), value: stats.currentWeight ? fmtKg(stats.currentWeight) : '—', sub: weightDelta(t, state.weights.filter((w) => w.traineeId === trainee.id)), tone: '' };
    case 'lastSession':
      return { label: t('roster.colLast'), value: fmtRelativeDay(stats.lastLog?.date), sub: stats.lastLog ? `${stats.lastLog.dayName} · RPE ${stats.lastLog.rpe}` : t('trainee.noSessions'), tone: '' };
    case 'checkin':
      return { label: t('roster.colCheckin'), value: stats.missedCheckins ? t('common.overdue') : stats.nextCheckin === today ? t('common.today') : fmtDay(stats.nextCheckin), sub: stats.lastCheckin ? t('trainee.lastCheckin', { date: fmtDay(stats.lastCheckin.date) }) : t('trainee.noneYet'), tone: stats.missedCheckins ? 'warn' : '' };
    case 'renewal': {
      const m = trainee.membership;
      const d = daysBetween(today, m.renewsOn);
      return { label: t('custom.stat.renewal'), value: fmtDay(m.renewsOn), sub: `${m.paid ? t('billing.paid') : t('custom.unpaid')} · ${formatMoney(m.price)}`, tone: !m.paid && d <= 7 ? 'warn' : '' };
    }
    case 'sessions30': {
      const from = addDays(today, -30);
      const n = logs.filter((l) => l.date > from).length;
      return { label: t('custom.stat.sessions30'), value: String(n), sub: t('custom.ofPlanned', { n: Math.round((trainee.frequency * 30) / 7) }), tone: '' };
    }
    case 'goal': {
      const g = [...trainee.goals].sort((a, b) => goalPct(b) - goalPct(a))[0];
      return { label: t('custom.stat.goal'), value: g ? `${Math.round(goalPct(g))}%` : '—', sub: g?.label ?? t('goals.none'), tone: '' };
    }
    case 'unread': {
      const msgs = state.messages.filter((m) => m.traineeId === trainee.id);
      const n = msgs.filter((m) => m.from === 'trainee' && !m.read).length;
      const last = msgs.at(-1);
      return { label: t('custom.stat.unread'), value: String(n), sub: last ? t('custom.lastMessage', { ago: fmtAgo(last.at) }) : t('custom.noMessages'), tone: n ? 'warn' : '' };
    }
    case 'prs30': {
      const from = addDays(today, -30);
      const best = new Map<string, number>();
      let n = 0;
      let lastPr = '';
      for (const l of logs) for (const e of l.entries) {
        const top = Math.max(0, ...e.sets.map((x) => e1rm(x.weight, x.reps)));
        const prev = best.get(e.exerciseName);
        if (prev !== undefined && top > prev + 0.01 && l.date > from) { n++; lastPr = e.exerciseName; }
        best.set(e.exerciseName, Math.max(prev ?? 0, top));
      }
      return { label: t('custom.stat.prs30'), value: String(n), sub: lastPr ? t('custom.latestPr', { ex: lastPr }) : t('custom.noPrs'), tone: '' };
    }
  }
}

function detailFor(id: DetailId, tr: Trainee, t: T): string {
  switch (id) {
    // A trainee approved from a join request may not have given a birth date or height.
    case 'age': {
      const years = tr.birthDate ? ageFrom(tr.birthDate) : NaN;
      return Number.isFinite(years) ? t('custom.meta.age', { n: years }) : '';
    }
    case 'height': return tr.heightCm > 0 ? t('custom.meta.height', { n: tr.heightCm }) : '';
    case 'since': return t('custom.meta.since', { date: fmtLong(tr.joinedAt) });
    case 'seen': return t('custom.meta.seen', { ago: fmtAgo(tr.lastSeenAt) });
    case 'contact': return [tr.email, tr.phone].filter(Boolean).join(' · ');
    case 'frequency': return t('trainee.planned', { n: tr.frequency });
  }
}

function weightDelta(t: T, weights: { date: string; kg: number }[]): string {
  if (weights.length < 2) return t('trainee.noHistory');
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const d = sorted.at(-1)!.kg - sorted[0].kg;
  return t('trainee.weightSince', { d: `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}`, date: fmtDay(sorted[0].date) });
}
