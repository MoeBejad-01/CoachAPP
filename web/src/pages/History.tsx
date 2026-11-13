// Session history across all trainees: pick a period and a trainee, browse
// their sessions, and read every set of a session in detail.

import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fullName } from '../data/selectors';
import { useAppState } from '../data/store';
import type { LogEntry, Trainee, WorkoutLog } from '../data/types';
import { Icon } from '../components/Icon';
import { Avatar, Empty } from '../components/ui';
import { useT, type T } from '../i18n';
import { addDays, fmtDay, fmtShort, startOfWeek, todayISO } from '../lib/dates';
import { e1rm, fmtKg } from '../lib/util';

type Range = '7' | '30' | '365' | 'all';
const RANGES: Range[] = ['7', '30', '365', 'all'];

const volumeOf = (e: LogEntry) => e.sets.reduce((n, s) => n + s.weight * s.reps, 0);
const setLabel = (w: number, r: number) => (w > 0 ? `${w}×${r}` : `BW×${r}`);

function download(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const csvRows = (logs: WorkoutLog[], names: Map<string, string>) => [
  ['trainee', 'date', 'session', 'duration_min', 'rpe', 'exercise', 'set', 'weight_kg', 'reps', 'e1rm_kg', 'pain', 'note'],
  ...logs.flatMap((l) => l.entries.flatMap((e) => e.sets.map((s, i) => [
    names.get(l.traineeId) ?? l.traineeId, l.date, l.dayName, l.durationMin, l.rpe, e.exerciseName, i + 1, s.weight, s.reps, Math.round(e1rm(s.weight, s.reps) * 10) / 10, e.pain ? 'yes' : '', e.note ?? '',
  ]))),
];

export function HistoryPage() {
  const t = useT();
  const state = useAppState();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const today = todayISO();
  const range = (RANGES.find((r) => r === params.get('range')) ?? '30') as Range;
  const from = range === 'all' ? null : addDays(today, -Number(range) + 1);
  const inRange = (l: WorkoutLog) => !from || l.date >= from;
  const names = useMemo(() => new Map(state.trainees.map((x) => [x.id, fullName(x)])), [state.trainees]);

  // Trainees with sessions in the period, busiest first.
  const people = useMemo(() => {
    const count = new Map<string, number>();
    for (const l of state.logs) if (inRange(l)) count.set(l.traineeId, (count.get(l.traineeId) ?? 0) + 1);
    return state.trainees.filter((x) => count.has(x.id)).sort((a, b) => (count.get(b.id)! - count.get(a.id)!) || a.firstName.localeCompare(b.firstName));
  }, [state.logs, state.trainees, from]); // eslint-disable-line react-hooks/exhaustive-deps

  const tid = people.find((x) => x.id === params.get('trainee'))?.id ?? people[0]?.id;
  const trainee = state.trainees.find((x) => x.id === tid);
  const logs = useMemo(() => state.logs.filter((l) => l.traineeId === tid && inRange(l)).sort((a, b) => b.date.localeCompare(a.date)), [state.logs, tid, from]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownLogs = query.trim() ? logs.filter((l) => `${l.dayName} ${l.entries.map((e) => e.exerciseName).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())) : logs;
  const log = logs.find((l) => l.id === params.get('log')) ?? logs[0];

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) if (v === null) next.delete(k); else next.set(k, v);
    setParams(next, { replace: true });
  };

  return (
    <div className="hist">
      {/* ---------- History ---------- */}
      <section className="hist-col hist-list" aria-label={t('hist.title')}>
        <div className="hist-head">
          <h1 className="hist-title">{t('hist.title')}</h1>
          <button type="button" className="hist-icon" aria-label={t('hist.exportAll')} title={t('hist.exportAll')} disabled={!logs.length} onClick={() => download(`history-${trainee ? trainee.firstName : 'all'}-${range}.csv`, csvRows([...logs].reverse(), names))}><Icon name="upload" size={16} /></button>
        </div>
        <div className="hist-seg" role="tablist" aria-label={t('hist.period')}>
          {RANGES.map((r) => <button key={r} type="button" role="tab" aria-selected={r === range} className={r === range ? 'on' : ''} onClick={() => set({ range: r, log: null })}>{t(`hist.range.${r}`)}</button>)}
        </div>

        <div className="hist-people" role="listbox" aria-label={t('nav.trainees')}>
          {people.map((x) => (
            <button key={x.id} type="button" role="option" aria-selected={x.id === tid} className={`hist-person${x.id === tid ? ' on' : ''}`} onClick={() => set({ trainee: x.id, log: null })}>
              <Avatar trainee={x} size={46} />
              <span className="ellipsis">{x.firstName} {x.lastName[0]}.</span>
            </button>
          ))}
          {people.length === 0 && <span className="small muted" style={{ padding: '10px 0' }}>{t('hist.nobody')}</span>}
        </div>

        {trainee && <SessionsChart logs={logs} range={range} today={today} t={t} />}

        <label className="hist-search">
          <Icon name="search" size={15} />
          <span className="sr-only">{t('hist.search')}</span>
          <input type="search" placeholder={t('hist.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>

        <div className="hist-sessions">
          {shownLogs.map((l) => (
            <button key={l.id} type="button" className={`hist-session${l.id === log?.id ? ' on' : ''}`} onClick={() => set({ log: l.id })}>
              <span className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontWeight: 600 }}>{l.dayName}</span>
                <Icon name="chevron" size={14} />
              </span>
              <span className="xs muted">{fmtDay(l.date)} · {t('common.minutes', { n: l.durationMin })}</span>
              {l.entries.slice(0, 3).map((e) => <span key={e.exerciseId} className="xs faint ellipsis" style={{ width: '100%' }}>{e.sets.length} × {e.exerciseName}</span>)}
              {l.entries.length > 3 && <span className="xs faint">{t('hist.more', { n: l.entries.length - 3 })}</span>}
            </button>
          ))}
          {trainee && shownLogs.length === 0 && <Empty>{t('hist.noSessions')}</Empty>}
        </div>
      </section>

      {/* ---------- Session ---------- */}
      {log && trainee ? <SessionDetail log={log} trainee={trainee} allLogs={state.logs} names={names} /> : (
        <section className="hist-col hist-main"><Empty>{t('hist.pick')}</Empty></section>
      )}
    </div>
  );
}

function SessionsChart({ logs, range, today, t }: { logs: WorkoutLog[]; range: Range; today: string; t: T }) {
  // Days for short periods, weeks for long ones.
  const daily = range === '7' || range === '30';
  const n = range === '7' ? 7 : range === '30' ? 30 : range === '365' ? 52 : Math.max(4, Math.ceil((Date.parse(today) - Date.parse(logs.at(-1)?.date ?? today)) / (7 * 86400000)) + 1);
  const buckets = Array.from({ length: n }, (_, i) => {
    const start = daily ? addDays(today, -(n - 1 - i)) : addDays(startOfWeek(today), -7 * (n - 1 - i));
    const end = daily ? start : addDays(start, 6);
    return { start, count: logs.filter((l) => l.date >= start && l.date <= end).length };
  });
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const ticks = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];
  return (
    <div className="hist-chart" dir="ltr" role="img" aria-label={t('hist.chart', { n: logs.length })}>
      <div className="hist-bars" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {buckets.map((b) => <span key={b.start} title={`${fmtShort(b.start)} · ${b.count}`} style={{ height: b.count ? `${(b.count / max) * 100}%` : 0 }} />)}
      </div>
      <div className="hist-ticks">{ticks.map((i) => <span key={i}>{fmtShort(buckets[i].start)}</span>)}</div>
    </div>
  );
}

function SessionDetail({ log, trainee, allLogs, names }: { log: WorkoutLog; trainee: Trainee; allLogs: WorkoutLog[]; names: Map<string, string> }) {
  const t = useT();
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const sets = log.entries.reduce((n, e) => n + e.sets.length, 0);
  const volume = log.entries.reduce((n, e) => n + volumeOf(e), 0);

  // Best e1RM per exercise before this session, to mark records.
  const prevBest = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of allLogs) {
      if (l.traineeId !== log.traineeId || l.date >= log.date || l.id === log.id) continue;
      for (const e of l.entries) m.set(e.exerciseName, Math.max(m.get(e.exerciseName) ?? 0, ...e.sets.map((s) => e1rm(s.weight, s.reps))));
    }
    return m;
  }, [allLogs, log]);

  const tiles: [string, string, Parameters<typeof Icon>[0]['name']][] = [
    [t('hist.exercises'), String(log.entries.length), 'grid'],
    [t('hist.sets'), String(sets), 'copy'],
    [t('hist.duration'), t('common.minutes', { n: log.durationMin }), 'calendar'],
    ['RPE', String(log.rpe), 'bolt'],
  ];
  const notes = log.entries.filter((e) => e.note || e.pain);

  return (
    <>
      <section className="hist-col hist-main" aria-label={log.dayName}>
        <div className="hist-actions">
          <button type="button" className="hist-icon" aria-label={t('hist.export')} title={t('hist.export')} onClick={() => download(`${trainee.firstName}-${log.date}-${log.dayName}.csv`, csvRows([log], names))}><Icon name="upload" size={16} /></button>
          <Link to={`/coach/trainees/${trainee.id}?tab=workouts`} className="hist-icon" aria-label={t('hist.openTrainee')} title={t('hist.openTrainee')}><Icon name="user" size={16} /></Link>
          <Link to={`/coach/messages/${trainee.id}`} className="hist-text-btn">{t('common.message')}</Link>
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <h2 className="hist-title">{log.dayName}</h2>
          <span className="small muted">{fullName(trainee)} · {fmtDay(log.date)} · {t('hist.volume', { v: fmtKg(Math.round(volume)) })}</span>
        </div>
        <div className="hist-tiles">
          {tiles.map(([k, v, icon]) => (
            <div key={k} className="hist-tile">
              <Icon name={icon} size={15} />
              <span className="xs muted">{k}</span>
              <span className="hist-tile-v">{v}</span>
            </div>
          ))}
        </div>

        {log.entries.map((e, i) => {
          const es = e.sets.map((s) => e1rm(s.weight, s.reps));
          const best = Math.max(0, ...es);
          const top = Math.max(0, ...e.sets.map((s) => s.weight));
          const avgReps = e.sets.reduce((n, s) => n + s.reps, 0) / Math.max(1, e.sets.length);
          const drop = best > 0 && es.length > 1 ? ((best - es.at(-1)!) / best) * 100 : 0;
          const before = prevBest.get(e.exerciseName) ?? 0;
          return (
            <div key={e.exerciseId} className="hist-ex" ref={(el) => { refs.current[e.exerciseId] = el; }}>
              <div className="row" style={{ gap: 10 }}>
                <span className="hist-num">{i + 1}</span>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{e.exerciseName}</span>
                {e.pain && <span className="chip warn">{t('workouts.pain')}</span>}
              </div>
              <div className="hist-ex-sum">
                <div><span className="xs muted">{t('hist.setsLabel')}</span><span>{e.sets.length}</span></div>
                <div><span className="xs muted">{t('hist.topWeight')}</span><span>{top > 0 ? fmtKg(top) : 'BW'}</span></div>
                <div><span className="xs muted">{t('hist.avgReps')}</span><span>{avgReps.toFixed(1)}</span></div>
                <div><span className="xs muted">{t('hist.drop')}</span><span>{drop.toFixed(1)}%</span></div>
              </div>
              <div className="hist-sets">
                {e.sets.map((s, j) => {
                  const pr = before > 0 && es[j] > before + 0.01;
                  return (
                    <div key={j} className="hist-set">
                      <span className="hist-set-n">{j + 1}</span>
                      <span className="hist-set-main">
                        <span className="row" style={{ gap: 18 }}>
                          <span className="mono" style={{ fontWeight: 600 }} dir="ltr">{setLabel(s.weight, s.reps)}</span>
                          <span className="mono xs muted">{es[j] > 0 ? t('hist.e1rm', { v: fmtKg(Math.round(es[j])) }) : '—'}</span>
                          <span className="mono xs muted">{fmtKg(Math.round(s.weight * s.reps))}</span>
                          {pr && <span className="chip ok" style={{ fontSize: 11 }}>PR</span>}
                        </span>
                        <span className="hist-bar"><span style={{ width: `${best > 0 ? Math.max(4, (es[j] / best) * 100) : 100}%` }} /></span>
                      </span>
                      <span className="hist-set-side xs muted">{best > 0 ? `${Math.round((es[j] / best) * 100)}%` : ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* ---------- Overview ---------- */}
      <aside className="hist-col hist-over" aria-label={t('hist.overview')}>
        <h2 className="hist-title" style={{ fontSize: 22 }}>{t('hist.overview')}</h2>
        <span className="hist-chip">{log.dayName}</span>
        <div className="hist-outline">
          {log.entries.map((e, i) => (
            <button key={e.exerciseId} type="button" onClick={() => refs.current[e.exerciseId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              <span className="hist-num sm">{i + 1}</span>
              <span className="ellipsis">{e.exerciseName}</span>
            </button>
          ))}
        </div>
        {notes.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            <span className="xs muted" style={{ fontWeight: 500 }}>{t('hist.traineeNotes')}</span>
            {notes.map((e) => (
              <div key={e.exerciseId} className="hist-note">
                <span className="xs" style={{ fontWeight: 600 }}>{e.exerciseName}{e.pain ? ` · ${t('workouts.painLower')}` : ''}</span>
                {e.note && <span className="xs muted">“{e.note}”</span>}
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
