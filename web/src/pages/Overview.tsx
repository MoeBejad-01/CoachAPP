import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { resetWidgets, setWidget } from '../data/actions';
import { allStats, formatMoney, fullName, recentPRs, teamAdherence, threads, weeklyTeamAdherence } from '../data/selectors';
import { useAppState } from '../data/store';
import type { WidgetId } from '../data/types';
import { Icon } from '../components/Icon';
import { Roster, type RosterFilter } from '../components/Roster';
import { Avatar, Card, Empty } from '../components/ui';
import { useT } from '../i18n';
import { flagDetail, flagText, flagWantsMessage } from '../i18n/flags';
import { addDays, daysBetween, fmtDay, fmtRelativeDay, fmtShort, fmtStamp, startOfWeek, todayISO } from '../lib/dates';
import { fmtKg } from '../lib/util';

const WIDGETS: WidgetId[] = ['kpis', 'attention', 'sessions', 'messages', 'roster', 'adherence', 'prs', 'renewals'];

export function OverviewPage() {
  const state = useAppState();
  const t = useT();
  const [customizing, setCustomizing] = useState(false);
  const [filter, setFilter] = useState<RosterFilter>('all');
  const [query, setQuery] = useState('');
  const w = state.widgets;
  const today = todayISO();

  const stats = useMemo(() => allStats(state), [state]);
  const byId = useMemo(() => new Map(state.trainees.map((tr) => [tr.id, tr])), [state.trainees]);

  const kpi = useMemo(() => {
    const monthStart = today.slice(0, 8) + '01';
    const active = state.trainees.filter((tr) => tr.status === 'active' || tr.status === 'onboarding');
    const inactive = state.trainees.filter((tr) => tr.status === 'paused' || tr.status === 'inactive');
    const lapsed = inactive.filter((tr) => {
      const last = stats.get(tr.id)!.lastLog?.date;
      return !last || daysBetween(last, today) > 30;
    }).length;
    const adh = teamAdherence(state, today);
    const prev = teamAdherence(state, addDays(today, -28));
    const sunday = addDays(startOfWeek(today), 6);
    const dueThisWeek = state.trainees.filter((tr) => tr.status === 'active' && stats.get(tr.id)!.nextCheckin <= sunday);
    const overdue = state.trainees.filter((tr) => stats.get(tr.id)!.missedCheckins > 0).length;
    return {
      active: active.length,
      newThisMonth: state.trainees.filter((tr) => tr.joinedAt >= monthStart).length,
      inactive: inactive.length,
      lapsed,
      adh,
      adhDelta: adh !== null && prev !== null ? adh - prev : null,
      checkinsDue: dueThisWeek.length,
      overdue,
      share: Math.round((active.length / Math.max(1, state.trainees.length)) * 100),
    };
  }, [state, stats, today]);

  const attention = useMemo(
    () => state.trainees.filter((tr) => stats.get(tr.id)!.group === 'attention').slice(0, 6),
    [state.trainees, stats],
  );
  const todaySessions = useMemo(
    () => state.sessions.filter((s) => s.start.startsWith(today)).sort((a, b) => a.start.localeCompare(b.start)),
    [state.sessions, today],
  );
  const unread = useMemo(() => threads(state).filter((x) => x.unread > 0).slice(0, 4), [state]);
  const trend = useMemo(() => weeklyTeamAdherence(state), [state]);
  const prs = useMemo(() => recentPRs(state).slice(0, 5), [state]);
  const renewals = useMemo(
    () => state.trainees
      .filter((tr) => tr.status !== 'inactive' && tr.membership.renewsOn >= today && tr.membership.renewsOn <= addDays(today, 14))
      .sort((a, b) => a.membership.renewsOn.localeCompare(b.membership.renewsOn))
      .slice(0, 6),
    [state.trainees, today],
  );

  const pickFilter = (f: RosterFilter) => {
    setFilter(f);
    if (!w.roster) setWidget('roster', true);
    requestAnimationFrame(() => document.getElementById('roster')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const trendMin = Math.max(0, Math.min(...trend.map((x) => x.value)) - 15);
  const todayGroup = w.attention || w.sessions || w.messages;
  const insightGroup = w.adherence || w.prs || w.renewals;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('overview.morning') : hour < 18 ? t('overview.afternoon') : t('overview.evening');

  return (
    <>
      <header className="page-head">
        <div className="stack">
          <span className="eyebrow">{fmtDay(today)}</span>
          <h1 className="page-title">{t('overview.greeting', { greeting, name: state.coach.name.split(' ')[0] })}</h1>
        </div>
        <div className="row wrap">
          <label className="search">
            <Icon name="search" size={16} />
            <span className="sr-only">{t('common.searchTrainees')}</span>
            <input type="search" placeholder={t('common.searchTrainees')} value={query} onChange={(e) => { setQuery(e.target.value); if (e.target.value) pickFilter('all'); }} />
          </label>
          <button type="button" className="btn" aria-pressed={customizing} onClick={() => setCustomizing((v) => !v)} style={customizing ? { background: 'var(--selected)', borderColor: 'var(--accent-line)' } : undefined}>
            <Icon name="sliders" size={16} />{customizing ? t('common.done') : t('overview.customize')}
          </button>
          <Link to="/coach/trainees/new" className="btn primary"><Icon name="plus" size={16} strokeWidth={2} />{t('common.newTrainee')}</Link>
        </div>
      </header>

      {customizing && (
        <section className="card" aria-label={t('overview.customizeTitle')} style={{ borderColor: 'var(--accent-line)' }}>
          <div className="card-head">
            <div className="stack">
              <h2 className="card-title">{t('overview.customizeTitle')}</h2>
              <p className="small muted">{t('overview.customizeDesc')}</p>
            </div>
            <div className="row">
              <button type="button" className="btn sm" onClick={resetWidgets}>{t('overview.resetWidgets')}</button>
              <button type="button" className="btn sm dark" onClick={() => setCustomizing(false)}>{t('common.done')}</button>
            </div>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {WIDGETS.map((id) => (
              <label key={id} className={`choice${w[id] ? ' on' : ''}`} style={{ flexDirection: 'row', gap: 10, cursor: 'pointer', boxShadow: 'none' }}>
                <input type="checkbox" checked={w[id]} onChange={(e) => setWidget(id, e.target.checked)} style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--accent)' }} />
                <span className="stack" style={{ gap: 2 }}>
                  <span style={{ fontWeight: 500 }}>{t(`widget.${id}`)}</span>
                  <span className="s">{t(`widget.${id}.desc`)}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      {w.kpis && (
        <section className="kpis" aria-label={t('widget.kpis')}>
          <button type="button" className="kpi" onClick={() => pickFilter('active')}>
            <span className="kpi-label">{t('kpi.active')}<span className="dot" style={{ background: 'var(--ok)' }} /></span>
            <span className="kpi-value">{kpi.active}</span>
            <span className="kpi-sub"><span className="ok" style={{ fontWeight: 600 }} dir="ltr">+{kpi.newThisMonth}</span> {t('kpi.activeSub', { pct: kpi.share })}</span>
          </button>
          <button type="button" className="kpi" onClick={() => pickFilter('inactive')}>
            <span className="kpi-label">{t('kpi.inactive')}<span className="dot" style={{ background: 'var(--neutral)' }} /></span>
            <span className="kpi-value">{kpi.inactive}</span>
            <span className="kpi-sub"><span className="warn" style={{ fontWeight: 600 }}>{kpi.lapsed}</span> {t('kpi.inactiveSub')}</span>
          </button>
          <div className="kpi">
            <span className="kpi-label">{t('kpi.adherence')}</span>
            <span className="kpi-value">{kpi.adh ?? '—'}%</span>
            <span className="row kpi-sub" style={{ gap: 10 }}>
              <span className="bar"><span style={{ width: `${kpi.adh ?? 0}%` }} /></span>
              {kpi.adhDelta !== null && <span><span className={kpi.adhDelta >= 0 ? 'ok' : 'warn'} style={{ fontWeight: 600 }} dir="ltr">{kpi.adhDelta >= 0 ? '+' : ''}{kpi.adhDelta}</span> {t('kpi.pts')}</span>}
            </span>
          </div>
          <button type="button" className="kpi" onClick={() => pickFilter('attention')}>
            <span className="kpi-label">{t('kpi.checkins')}</span>
            <span className="kpi-value">{kpi.checkinsDue}</span>
            <span className="kpi-sub"><span className="warn" style={{ fontWeight: 600 }}>{kpi.overdue}</span> {t('kpi.checkinsSub')}</span>
          </button>
        </section>
      )}

      {todayGroup && (
        <section className="section" aria-label={t('overview.today')}>
          <div className="section-label">{t('overview.today')}</div>
          <div className="grid-cards">
            {w.attention && (
              <Card title={t('widget.attention')} action={<span className="chip warn mono">{attention.length}</span>}>
                {attention.map((tr) => {
                  const f = stats.get(tr.id)!.flags[0];
                  const msg = flagWantsMessage(f);
                  return (
                    <div key={tr.id} className="list-row">
                      <Avatar trainee={tr} size={32} />
                      <div className="stack grow" style={{ gap: 2 }}>
                        <Link to={`/coach/trainees/${tr.id}`} style={{ color: 'var(--ink)', fontWeight: 500 }}>{fullName(tr)}</Link>
                        <span className="small muted ellipsis"><span className="warn" style={{ fontWeight: 500 }}>{flagText(t, f)}</span> · {flagDetail(t, f)}</span>
                      </div>
                      <Link to={msg ? `/coach/messages/${tr.id}` : `/coach/trainees/${tr.id}`} className="btn sm">{msg ? t('common.message') : t('common.review')}</Link>
                    </div>
                  );
                })}
                {attention.length === 0 && <Empty>{t('overview.allOnTrack')}</Empty>}
              </Card>
            )}
            {w.sessions && (
              <Card title={t('widget.sessions')} action={<Link to="/coach/calendar" className="small">{t('overview.openCalendar')}</Link>}>
                {todaySessions.map((s) => {
                  const tr = s.traineeId ? byId.get(s.traineeId) : undefined;
                  return (
                    <div key={s.id} className="list-row" style={{ gap: 14 }}>
                      <span className="mono" style={{ fontSize: 13, width: 44 }}>{s.start.slice(11, 16)}</span>
                      <span style={{ width: 2, alignSelf: 'stretch', background: s.location === 'Focus block' ? 'var(--neutral)' : 'var(--accent)', borderRadius: 1 }} />
                      <div className="stack grow" style={{ gap: 2 }}>
                        {tr ? <Link to={`/coach/trainees/${tr.id}`} style={{ color: 'var(--ink)', fontWeight: 500 }}>{fullName(tr)}</Link> : <span style={{ fontWeight: 500 }}>{s.title}</span>}
                        <span className="small muted">{tr ? s.title : t('common.minutes', { n: s.durationMin })}</span>
                      </div>
                      <span className="chip outline">{t(`location.${s.location}`)}</span>
                    </div>
                  );
                })}
                {todaySessions.length === 0 && <Empty>{t('overview.nothingToday')}</Empty>}
              </Card>
            )}
            {w.messages && (
              <Card title={t('widget.messages')} action={<Link to="/coach/messages" className="small">{t('overview.openInbox')}</Link>}>
                {unread.map(({ trainee, last, unread: n }) => (
                  <Link key={trainee.id} to={`/coach/messages/${trainee.id}`} className="list-row" style={{ alignItems: 'flex-start' }}>
                    <Avatar trainee={trainee} size={32} />
                    <div className="stack grow" style={{ gap: 2 }}>
                      <span className="row" style={{ justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600 }}>{fullName(trainee)}{n > 1 && <span className="faint xs mono"> · {n}</span>}</span>
                        <span className="xs faint">{last && fmtStamp(last.at)}</span>
                      </span>
                      <span className="ellipsis" dir="auto" style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'start' }}>{last?.text}</span>
                    </div>
                  </Link>
                ))}
                {unread.length === 0 && <Empty>{t('overview.inboxZero')}</Empty>}
              </Card>
            )}
          </div>
        </section>
      )}

      {w.roster && (
        <div id="roster" style={{ scrollMarginTop: 16 }}>
          <Roster trainees={state.trainees} stats={stats} filter={filter} onFilter={setFilter} query={query} limit={10} />
        </div>
      )}

      {insightGroup && (
        <section className="section" aria-label={t('overview.insights')}>
          <div className="section-label">{t('overview.insights')}</div>
          <div className="grid-cards">
            {w.adherence && (
              <Card title={t('widget.adherence')} action={<span className="small muted">{t('overview.last8')}</span>}>
                <div className="card-body">
                  <div role="img" aria-label={t('overview.trendLabel', { n: trend.at(-1)?.value ?? 0 })} style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 168, borderBottom: '1px solid var(--border)' }}>
                    {trend.map((x, i) => {
                      const last = i === trend.length - 1;
                      const h = ((x.value - trendMin) / Math.max(1, 100 - trendMin)) * 100;
                      return (
                        <div key={x.weekStart} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                          <span className="mono" style={{ fontSize: 11.5, color: last ? 'var(--ink)' : 'var(--faint)' }}>{x.value}%</span>
                          <span style={{ width: '100%', maxWidth: 36, height: `${Math.max(2, h)}%`, borderRadius: '4px 4px 0 0', background: last ? 'var(--accent)' : 'var(--bar-soft)' }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: -6 }}>
                    {trend.map((x) => <span key={x.weekStart} className="xs faint" style={{ flex: 1, textAlign: 'center' }}>{fmtShort(x.weekStart)}</span>)}
                  </div>
                </div>
              </Card>
            )}
            {w.prs && (
              <Card title={t('overview.prsTitle')} action={<span className="small muted">{t('overview.fromLogs')}</span>}>
                {prs.map((p) => {
                  const tr = byId.get(p.traineeId)!;
                  return (
                    <Link key={`${p.traineeId}-${p.exercise}`} to={`/coach/trainees/${tr.id}?tab=progress`} className="list-row">
                      <div className="stack grow" style={{ gap: 2 }}>
                        <span style={{ fontWeight: 500 }}>{p.exercise}</span>
                        <span className="small muted">{fullName(tr)} · {fmtRelativeDay(p.date)}</span>
                      </div>
                      <span className="mono" style={{ fontWeight: 500 }} dir="ltr">{fmtKg(p.weight)} × {p.reps}</span>
                      {p.gainKg > 0 && <span className="chip ok mono" dir="ltr">+{p.gainKg} kg</span>}
                    </Link>
                  );
                })}
                {prs.length === 0 && <Empty>{t('overview.noPrs')}</Empty>}
              </Card>
            )}
            {w.renewals && (
              <Card title={t('overview.renewalsTitle')} action={<Link to="/coach/billing" className="small">{t('nav.billing')}</Link>}>
                {renewals.map((tr) => (
                  <Link key={tr.id} to="/coach/billing" className="list-row">
                    <div className="stack grow" style={{ gap: 2 }}>
                      <span style={{ fontWeight: 500 }}>{fullName(tr)}</span>
                      <span className="small muted">{t(`tier.${tr.tier}`)} · {formatMoney(tr.membership.price)}</span>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{fmtDay(tr.membership.renewsOn)}</span>
                  </Link>
                ))}
                {renewals.length === 0 && <Empty>{t('overview.noRenewals')}</Empty>}
              </Card>
            )}
          </div>
        </section>
      )}
    </>
  );
}
