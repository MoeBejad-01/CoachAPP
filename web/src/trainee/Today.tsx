import { Link } from 'react-router-dom';
import { weekIndex } from '../data/plan';
import { weekPlan } from '../data/selectors';
import { useAppState } from '../data/store';
import type { WeekTargets } from '../data/types';
import { Icon } from '../components/Icon';
import { useT, type T } from '../i18n';
import { addDays, dayOfWeek, fmtAgo, fmtDay, fmtDow, fmtTime, startOfWeek, todayISO } from '../lib/dates';
import { fmtKg } from '../lib/util';
import { TabScreen, useTraineeApp } from './TraineeApp';

export function TodayScreen() {
  const t = useT();
  const state = useAppState();
  const { trainee, logs, stats, base } = useTraineeApp();
  const today = todayISO();
  const week = weekPlan(state, trainee, logs);
  const p = trainee.program;
  const wi = p ? weekIndex(p, today) : 0;
  const started = !!p && p.startDate <= today;
  const targets = p?.plan[wi]?.targets;
  const todayPlan = week.find((d) => d.date === today);
  // Next session this week; if none is left, offer the earliest missed one as a make-up.
  const upcomingThisWeek = week.find((d) => d.date >= today && d.planned && !d.log);
  const missed = started ? week.find((d) => d.date < today && d.planned && !d.log) : undefined;
  // Nothing left this week (or the program starts next week): show the first session of next week.
  const nextWeekFirst = upcomingThisWeek || missed ? undefined : weekPlan(state, trainee, logs, addDays(startOfWeek(today), 7)).find((d) => d.planned);
  const upcoming = upcomingThisWeek ?? nextWeekFirst;
  const next = upcomingThisWeek ?? missed ?? nextWeekFirst;
  const isMakeUp = !upcomingThisWeek && !!missed;
  const doneToday = todayPlan?.log;
  const pending = state.inbodyRequests.find((r) => r.traineeId === trainee.id && r.status === 'pending');
  const checkinDue = (todayPlan?.isCheckin && !todayPlan.checkinDone) || stats.missedCheckins > 0;
  const unseen = state.messages.filter((m) => m.traineeId === trainee.id && m.from === 'coach' && m.seen === false);
  const note = state.notes.filter((n) => n.traineeId === trainee.id && n.shared).sort((a, b) => b.at.localeCompare(a.at))[0];
  const nextSession = state.sessions.filter((s) => s.traineeId === trainee.id && s.location !== 'Focus block' && s.start >= new Date().toISOString().slice(0, 16)).sort((a, b) => a.start.localeCompare(b.start))[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? t('ta.greet.morning') : hour < 18 ? t('ta.greet.afternoon') : t('ta.greet.evening');
  const doneThisWeek = week.filter((d) => d.log).length;
  const plannedThisWeek = week.filter((d) => d.planned).length;

  return (
    <TabScreen title={t('ta.today.hello', { greet, name: trainee.firstName })} sub={fmtDay(today)}>
      {/* Today's session */}
      <section className="ta-hero">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="ta-label">{p ? (started ? t('ta.today.weekOf', { w: wi + 1, n: p.plan.length, name: p.name }) : t('ta.today.startsOn', { date: fmtDay(p.startDate) })) : t('ta.today.noProgram')}</span>
          {p && started && <span className="ta-label">{t('ta.today.weekDone', { n: doneThisWeek, of: plannedThisWeek })}</span>}
        </div>
        {doneToday ? (
          <>
            <div className="stack" style={{ gap: 4 }}>
              <span className="ta-hero-title">{t('ta.today.doneTitle', { name: doneToday.dayName })}</span>
              <span className="ta-hero-meta">{t('ta.today.doneMeta', { min: doneToday.durationMin, rpe: doneToday.rpe, n: doneToday.entries.length })}</span>
            </div>
            {upcoming && upcoming.date > today && <span className="ta-hero-meta">{t('ta.today.nextUp', { day: fmtDow(upcoming.date), name: upcoming.planned!.name })}</span>}
          </>
        ) : next ? (
          <>
            <div className="stack" style={{ gap: 4 }}>
              <span className="ta-hero-title">{next.planned!.name}</span>
              <span className="ta-hero-meta">
                {isMakeUp ? t('ta.today.missedOn', { day: fmtDow(next.date) }) : next.date === today ? t('ta.today.planned') : t('ta.today.nextOn', { day: fmtDow(next.date) })}
                {' · '}{t('ta.today.exercises', { n: next.planned!.exercises.length })}
                {' · '}{t('ta.today.sets', { n: next.planned!.exercises.reduce((n, e) => n + e.sets, 0) })}
              </span>
            </div>
            <Link to={`${base}/workout/${next.planned!.id}`} className="ta-big-btn"><Icon name="play" size={16} />{isMakeUp ? t('ta.today.makeUp') : next.date === today ? t('ta.today.start') : t('ta.today.startEarly')}</Link>
          </>
        ) : (
          <div className="stack" style={{ gap: 4 }}>
            <span className="ta-hero-title">{p ? t('ta.today.rest') : t('ta.today.waiting')}</span>
            <span className="ta-hero-meta">{p ? t('ta.today.restSub') : t('ta.today.waitingSub')}</span>
          </div>
        )}
        {p && started && (
          <div className="ta-strip">
            {week.map((d) => {
              const cls = d.log ? 'done' : d.planned ? (d.date < today ? 'missed' : '') : 'rest';
              return (
                <div key={d.date} className="ta-strip-day">
                  <span className={`ta-strip-dot ${cls}${d.date === today ? ' today' : ''}`}>{d.log ? <Icon name="check" size={14} strokeWidth={2.5} /> : Number(d.date.slice(8))}</span>
                  <span>{fmtDow(d.date).slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* To-do from the coach */}
      {(pending || checkinDue || unseen.length > 0) && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="ta-label" style={{ paddingInline: 4 }}>{t('ta.today.todo')}</span>
          {pending && (
            <Link to={`${base}/inbody`} className="ta-task">
              <span className="ta-task-icon warn"><Icon name="upload" size={18} /></span>
              <span className="stack grow" style={{ gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{t('ta.todo.inbody')}</span>
                <span className="small muted ellipsis">{pending.note || t('ta.todo.inbodySub', { ago: fmtAgo(pending.requestedAt) })}</span>
              </span>
              <Icon name="chevron" size={16} />
            </Link>
          )}
          {checkinDue && (
            <Link to={`${base}/checkin`} className="ta-task">
              <span className="ta-task-icon"><Icon name="clipboard" size={18} /></span>
              <span className="stack grow" style={{ gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{t('ta.todo.checkin')}</span>
                <span className="small muted">{stats.missedCheckins > 0 ? t('ta.todo.checkinLate') : t('ta.todo.checkinSub')}</span>
              </span>
              <Icon name="chevron" size={16} />
            </Link>
          )}
          {unseen.length > 0 && (
            <Link to={`${base}/coach`} className="ta-task">
              <span className="ta-task-icon"><Icon name="message" size={18} /></span>
              <span className="stack grow" style={{ gap: 2, minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{t('ta.todo.messages', { n: unseen.length })}</span>
                <span className="small muted ellipsis" dir="auto" style={{ textAlign: 'start' }}>{unseen.at(-1)!.text}</span>
              </span>
              <Icon name="chevron" size={16} />
            </Link>
          )}
        </div>
      )}

      {/* Coach's targets for this week */}
      {targets && started && (
        <section className="ta-card">
          <div className="ta-card-head"><span className="ta-card-title">{t('ta.today.targets', { w: wi + 1 })}</span></div>
          <div className="ta-card-pad">
            <div className="ta-targets">{targetTiles(targets, t)}</div>
            {p?.guide && (p.guide.proteinG || p.guide.waterL) && (
              <span className="small muted">{t('ta.today.macros', { p: p.guide.proteinG ?? '—', c: p.guide.carbsG ?? '—', f: p.guide.fatG ?? '—', w: p.guide.waterL ?? '—' })}</span>
            )}
            {targets.focus && (
              <div className="stack" style={{ gap: 4 }}>
                <span className="ta-label">{t('ta.today.focus')}</span>
                <p style={{ lineHeight: 1.5, color: 'var(--ink-2)', fontSize: 14 }}>{targets.focus}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* In-person session */}
      {nextSession && (
        <section className="ta-card">
          <div className="ta-row">
            <span className="ta-task-icon ok"><Icon name="calendar" size={18} /></span>
            <span className="stack grow" style={{ gap: 2 }}>
              <span style={{ fontWeight: 600 }}>{nextSession.title}</span>
              <span className="small muted">{fmtDay(nextSession.start.slice(0, 10))} · {fmtTime(nextSession.start)} · {t(`location.${nextSession.location}`)}</span>
            </span>
          </div>
        </section>
      )}

      {/* Latest shared note */}
      {note && (
        <section className="ta-note">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="ta-label">{t('ta.today.fromCoach', { name: state.coach.name.split(' ')[0] })}</span>
            <span className="xs faint">{fmtAgo(note.at)}</span>
          </div>
          <p style={{ lineHeight: 1.55, fontSize: 14 }}>{note.text}</p>
        </section>
      )}

      {/* Goals */}
      {trainee.goals.length > 0 && (
        <section className="ta-card">
          <div className="ta-card-head"><span className="ta-card-title">{t('ta.today.goals')}</span><Link to={`${base}/progress`} className="small">{t('ta.seeProgress')}</Link></div>
          <div className="ta-card-pad">
            {trainee.goals.map((g) => {
              const span = g.target - g.start;
              const pct = span === 0 ? 100 : Math.max(0, Math.min(100, ((g.current - g.start) / span) * 100));
              return (
                <div key={g.id} className="stack" style={{ gap: 6 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}><span style={{ fontWeight: 500, fontSize: 14 }}>{g.label}</span><span className="mono small">{Math.round(pct)}%</span></div>
                  <div className="ta-progress"><span style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {dayOfWeek(today) === trainee.checkinDay && !checkinDue && <p className="xs faint" style={{ textAlign: 'center' }}>{t('ta.today.checkinDone')}</p>}
    </TabScreen>
  );
}

export function targetTiles(x: WeekTargets, t: T) {
  const tiles: [string, string | null][] = [
    [t('weeks.target.bodyWeight'), x.bodyWeightKg === null ? null : fmtKg(x.bodyWeightKg)],
    [t('weeks.target.sleep'), x.sleepH === null ? null : t('weeks.unit.sleep', { n: x.sleepH })],
    [t('weeks.target.calories'), x.calories === null ? null : t('weeks.unit.kcal', { n: x.calories.toLocaleString('en') })],
    [t('weeks.target.protein'), x.proteinG === null ? null : t('weeks.unit.g', { n: x.proteinG })],
    [t('weeks.target.steps'), x.steps === null ? null : x.steps.toLocaleString('en')],
  ];
  return tiles.filter(([, v]) => v !== null).map(([k, v]) => (
    <div key={k} className="ta-target"><span className="ta-label">{k}</span><span className="ta-target-v">{v}</span></div>
  ));
}
