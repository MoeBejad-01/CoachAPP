// Progress analytics: what the trainee did inside a chosen period (a program
// week or everything) and training day, measured against their full history.

import { addDays, dayOfWeek, startOfWeek } from '../lib/dates';
import { e1rm } from '../lib/util';
import { weekRange } from './plan';
import { slotsFor } from './selectors';
import type { AppState, CardSource, CheckIn, InBodyScan, LoggedSet, Trainee, WorkoutLog } from './types';

export interface Scope {
  start: string | null;
  end: string | null;
  /** Training day name, e.g. "Upper A"; null = all days. */
  day: string | null;
}

export const ALL_TIME: Scope = { start: null, end: null, day: null };

export const inRange = (date: string, s: Scope) => (!s.start || date >= s.start) && (!s.end || date <= s.end);
export const scopeLogs = (logs: WorkoutLog[], s: Scope) => logs.filter((l) => inRange(l.date, s) && (!s.day || l.dayName === s.day));

export interface WeekOption { index: number; start: string; end: string }

/** Program weeks if there is a program, otherwise calendar weeks since the first log. */
export function weekOptions(t: Trainee, logs: WorkoutLog[], today: string): WeekOption[] {
  if (t.program) return t.program.plan.map((_, i) => ({ index: i, ...weekRange(t.program!, i) })).filter((w) => w.start <= today);
  const first = logs[0]?.date;
  if (!first) return [];
  const out: WeekOption[] = [];
  for (let d = startOfWeek(first), i = 0; d <= today; d = addDays(d, 7), i++) out.push({ index: i, start: d, end: addDays(d, 6) });
  return out;
}

const volumeOf = (sets: LoggedSet[]) => sets.reduce((n, s) => n + s.weight * s.reps, 0);
const bestOf = (sets: LoggedSet[]) => sets.reduce<{ set: LoggedSet; e: number } | null>((b, s) => {
  const e = e1rm(s.weight, s.reps);
  return !b || e > b.e ? { set: s, e } : b;
}, null);

export interface PrEvent {
  date: string;
  logId: string;
  dayName: string;
  exercise: string;
  set: LoggedSet;
  e1rm: number;
  prev: number;
}

/** Every time a lift beat its previous best estimated 1RM (first appearances don't count). */
export function prEvents(allLogs: WorkoutLog[]): PrEvent[] {
  const best = new Map<string, number>();
  const out: PrEvent[] = [];
  for (const l of allLogs) for (const e of l.entries) {
    const b = bestOf(e.sets);
    if (!b || b.e <= 0) continue;
    const prev = best.get(e.exerciseName);
    if (prev !== undefined && b.e > prev + 0.01) out.push({ date: l.date, logId: l.id, dayName: l.dayName, exercise: e.exerciseName, set: b.set, e1rm: b.e, prev });
    best.set(e.exerciseName, Math.max(prev ?? 0, b.e));
  }
  return out;
}

export interface TopLift {
  exercise: string;
  sessions: number;
  sets: number;
  volume: number;
  bestSet: LoggedSet;
  bestE1rm: number;
  bestDate: string;
  startE1rm: number;
  /** Best e1RM per session, oldest first, for the sparkline. */
  series: number[];
  prs: number;
}

export function topLifts(logs: WorkoutLog[], prs: PrEvent[]): TopLift[] {
  const map = new Map<string, TopLift>();
  for (const l of logs) for (const e of l.entries) {
    const b = bestOf(e.sets);
    if (!b) continue;
    const cur = map.get(e.exerciseName);
    if (!cur) {
      map.set(e.exerciseName, { exercise: e.exerciseName, sessions: 1, sets: e.sets.length, volume: volumeOf(e.sets), bestSet: b.set, bestE1rm: b.e, bestDate: l.date, startE1rm: b.e, series: [b.e], prs: 0 });
    } else {
      cur.sessions++;
      cur.sets += e.sets.length;
      cur.volume += volumeOf(e.sets);
      cur.series.push(b.e);
      if (b.e > cur.bestE1rm) Object.assign(cur, { bestSet: b.set, bestE1rm: b.e, bestDate: l.date });
    }
  }
  for (const p of prs) { const x = map.get(p.exercise); if (x) x.prs++; }
  return [...map.values()].sort((a, b) => b.bestE1rm - a.bestE1rm);
}

export interface Summary {
  sessions: number;
  planned: number | null;
  volume: number;
  sets: number;
  avgRpe: number | null;
  avgDuration: number | null;
  prs: number;
}

export function summarize(logs: WorkoutLog[], prs: PrEvent[], t: Trainee, s: Scope, today: string): Summary {
  const n = logs.length;
  let planned: number | null = null;
  if (s.start && !s.day) {
    // Scheduled training weekdays from the period start up to today.
    const slots = slotsFor(t);
    const end = s.end && s.end < today ? s.end : today;
    planned = 0;
    for (let d = s.start; d <= end; d = addDays(d, 1)) if (slots.includes(dayOfWeek(d))) planned++;
  }
  return {
    sessions: n,
    planned,
    volume: logs.reduce((v, l) => v + l.entries.reduce((m, e) => m + volumeOf(e.sets), 0), 0),
    sets: logs.reduce((v, l) => v + l.entries.reduce((m, e) => m + e.sets.length, 0), 0),
    avgRpe: n ? logs.reduce((v, l) => v + l.rpe, 0) / n : null,
    avgDuration: n ? logs.reduce((v, l) => v + l.durationMin, 0) / n : null,
    prs: prs.length,
  };
}

export function volumeByWeek(logs: WorkoutLog[]): { weekStart: string; volume: number; sessions: number }[] {
  const map = new Map<string, { volume: number; sessions: number }>();
  for (const l of logs) {
    const k = startOfWeek(l.date);
    const cur = map.get(k) ?? { volume: 0, sessions: 0 };
    cur.volume += l.entries.reduce((m, e) => m + volumeOf(e.sets), 0);
    cur.sessions++;
    map.set(k, cur);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([weekStart, v]) => ({ weekStart, ...v }));
}

// ---------- Series for coach-built cards ----------

export interface Point { date: string; value: number }

const checkinValue = (c: CheckIn, f: keyof CheckIn) => Number(c[f]);
const scanValue = (x: InBodyScan, f: keyof InBodyScan) => Number(x[f]);

export function seriesFor(src: CardSource, ctx: { state: AppState; trainee: Trainee; logs: WorkoutLog[]; scope: Scope; cardId: string }): Point[] {
  const { state, trainee, logs, scope } = ctx;
  const inScope = (p: Point) => inRange(p.date, scope);
  switch (src.kind) {
    case 'exercise':
      return scopeLogs(logs, scope).flatMap((l) => {
        const e = l.entries.find((x) => x.exerciseName === src.exercise);
        if (!e) return [];
        const b = bestOf(e.sets);
        const value = src.measure === 'e1rm' ? (b?.e ?? 0)
          : src.measure === 'topWeight' ? Math.max(0, ...e.sets.map((s) => s.weight))
          : src.measure === 'volume' ? volumeOf(e.sets)
          : e.sets.reduce((n, s) => n + s.reps, 0);
        return [{ date: l.date, value: Math.round(value * 10) / 10 }];
      });
    case 'workout':
      return scopeLogs(logs, scope).map((l) => ({
        date: l.date,
        value: src.field === 'duration' ? l.durationMin : src.field === 'rpe' ? l.rpe
          : src.field === 'sets' ? l.entries.reduce((n, e) => n + e.sets.length, 0)
          : Math.round(l.entries.reduce((n, e) => n + volumeOf(e.sets), 0)),
      }));
    case 'checkin':
      return state.checkins.filter((c) => c.traineeId === trainee.id).sort((a, b) => a.date.localeCompare(b.date))
        .map((c) => ({ date: c.date, value: checkinValue(c, src.field) })).filter(inScope);
    case 'inbody':
      return state.inbody.filter((x) => x.traineeId === trainee.id).map((x) => ({ date: x.date, value: scanValue(x, src.field) })).filter((p) => p.value > 0 && inScope(p));
    case 'target': {
      const p = trainee.program;
      if (!p) return [];
      return p.plan.map((w, i) => ({ date: weekRange(p, i).start, value: src.field === 'bodyWeight' ? w.targets.bodyWeightKg : w.targets.sleepH }))
        .filter((x): x is Point => x.value !== null).filter(inScope);
    }
    case 'metric':
      return state.metricEntries.filter((m) => m.traineeId === trainee.id && m.cardId === ctx.cardId).sort((a, b) => a.date.localeCompare(b.date))
        .map((m) => ({ date: m.date, value: m.value })).filter(inScope);
  }
}
