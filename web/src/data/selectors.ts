// Derived metrics. Everything the dashboard shows as a number is computed
// here from raw logs, check-ins and messages, never stored.

import { addDays, dayOfWeek, daysBetween, startOfWeek, todayISO } from '../lib/dates';
import { e1rm } from '../lib/util';
import { daysOn } from './plan';
import { WEEKDAY_SLOTS } from './seed';
import type { AppState, CheckIn, Message, ProgramDay, Trainee, WorkoutLog } from './types';

export type RosterGroup = 'active' | 'attention' | 'onboarding' | 'paused' | 'inactive';

/** Raw flag data; the UI turns it into words in the active language (see i18n/flags.ts). */
export type Flag =
  | { kind: 'checkin'; missed: number; lastAgo: number | null }
  | { kind: 'adherence'; value: number }
  | { kind: 'pain'; exercise: string; ago: number }
  | { kind: 'idle'; days: number; lastDay: string };

export interface TraineeStats {
  logs: WorkoutLog[];
  lastLog: WorkoutLog | undefined;
  adherence: number | null;
  week: number | null;
  nextCheckin: string;
  missedCheckins: number;
  lastCheckin: CheckIn | undefined;
  currentWeight: number | null;
  flags: Flag[];
  group: RosterGroup;
}

export const fullName = (t: Pick<Trainee, 'firstName' | 'lastName'>) => `${t.firstName} ${t.lastName}`;

export function slotsFor(t: Trainee): number[] {
  return WEEKDAY_SLOTS[t.frequency] ?? WEEKDAY_SLOTS[3];
}

export function isActiveStatus(t: Trainee) {
  return t.status === 'active' || t.status === 'onboarding';
}

export function logsByTrainee(state: AppState): Map<string, WorkoutLog[]> {
  const map = new Map<string, WorkoutLog[]>();
  for (const l of state.logs) {
    const arr = map.get(l.traineeId);
    if (arr) arr.push(l);
    else map.set(l.traineeId, [l]);
  }
  for (const arr of map.values()) arr.sort((a, b) => a.date.localeCompare(b.date));
  return map;
}

/** Sessions logged ÷ sessions expected over a window ending on `end`. */
export function adherenceFor(t: Trainee, logs: WorkoutLog[], end = todayISO(), windowDays = 28): number | null {
  if (!t.program) return null;
  const from = [addDays(end, -windowDays + 1), t.program.startDate].sort().at(-1)!;
  const span = daysBetween(from, end) + 1;
  if (span < 7) return null;
  const expected = (t.frequency * span) / 7;
  const done = logs.filter((l) => l.date >= from && l.date <= end).length;
  return Math.min(100, Math.round((done / expected) * 100));
}

export function programWeek(t: Trainee, today = todayISO()): number | null {
  if (!t.program || t.program.startDate > today) return null;
  return Math.min(t.program.weeks, Math.floor(daysBetween(t.program.startDate, today) / 7) + 1);
}

export function nextDow(dow: number, from = todayISO()): string {
  let d = from;
  while (dayOfWeek(d) !== dow) d = addDays(d, 1);
  return d;
}

export function computeStats(state: AppState, t: Trainee, logs: WorkoutLog[]): TraineeStats {
  const today = todayISO();
  const lastLog = logs.at(-1);
  const adherence = adherenceFor(t, logs);
  const checkins = state.checkins.filter((c) => c.traineeId === t.id).sort((a, b) => a.date.localeCompare(b.date));
  const lastCheckin = checkins.at(-1);
  const weights = state.weights.filter((w) => w.traineeId === t.id);
  const currentWeight = weights.length ? weights.reduce((a, b) => (b.date > a.date ? b : a)).kg : null;

  // Count check-in days that have passed since the last submitted one.
  let missedCheckins = 0;
  if (t.status === 'active') {
    const since = lastCheckin ? addDays(lastCheckin.date, 1) : addDays(t.joinedAt, 6);
    for (let d = since; d < today; d = addDays(d, 1)) if (dayOfWeek(d) === t.checkinDay) missedCheckins++;
  }

  const flags: Flag[] = [];
  if (t.status === 'active') {
    if (missedCheckins > 0) flags.push({ kind: 'checkin', missed: missedCheckins, lastAgo: lastCheckin ? daysBetween(lastCheckin.date, today) : null });
    if (adherence !== null && adherence < 75) flags.push({ kind: 'adherence', value: adherence });
    const pain = [...logs].reverse().find((l) => daysBetween(l.date, today) <= 10 && l.entries.some((e) => e.pain));
    if (pain) flags.push({ kind: 'pain', exercise: pain.entries.find((x) => x.pain)!.exerciseName, ago: daysBetween(pain.date, today) });
    const idle = lastLog ? daysBetween(lastLog.date, today) : null;
    if (t.program && t.program.startDate <= addDays(today, -7) && idle !== null && idle >= 5) flags.push({ kind: 'idle', days: idle, lastDay: lastLog!.dayName });
  }

  const group: RosterGroup = t.status === 'active' ? (flags.length ? 'attention' : 'active') : t.status;

  return {
    logs, lastLog, adherence, week: programWeek(t), nextCheckin: nextDow(t.checkinDay), missedCheckins, lastCheckin, currentWeight, flags, group,
  };
}

export function allStats(state: AppState): Map<string, TraineeStats> {
  const byT = logsByTrainee(state);
  return new Map(state.trainees.map((t) => [t.id, computeStats(state, t, byT.get(t.id) ?? [])]));
}

/** Average adherence across active trainees for a 28-day window ending `end`. */
export function teamAdherence(state: AppState, end: string, windowDays = 28): number | null {
  const byT = logsByTrainee(state);
  const vals = state.trainees
    .filter((t) => t.status === 'active')
    .map((t) => adherenceFor(t, byT.get(t.id) ?? [], end, windowDays))
    .filter((v): v is number => v !== null);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

export function weeklyTeamAdherence(state: AppState, weeks = 8): { weekStart: string; value: number }[] {
  const thisWeek = startOfWeek(todayISO());
  return Array.from({ length: weeks }, (_, i) => {
    const ws = addDays(thisWeek, -7 * (weeks - 1 - i));
    const we = addDays(ws, 6);
    const end = we < todayISO() ? we : todayISO();
    return { weekStart: ws, value: teamAdherence(state, end, 7) ?? 0 };
  });
}

export interface PR {
  traineeId: string;
  exercise: string;
  date: string;
  weight: number;
  reps: number;
  gainKg: number;
}

export function recentPRs(state: AppState, days = 7): PR[] {
  const best = new Map<string, { e: number; w: number }>();
  const out: PR[] = [];
  const since = addDays(todayISO(), -days);
  const logs = [...state.logs].sort((a, b) => a.date.localeCompare(b.date));
  for (const l of logs) {
    for (const entry of l.entries) {
      const top = entry.sets.reduce<{ e: number; w: number; r: number }>((acc, s) => {
        const v = e1rm(s.weight, s.reps);
        return v > acc.e ? { e: v, w: s.weight, r: s.reps } : acc;
      }, { e: 0, w: 0, r: 0 });
      if (top.e <= 0) continue;
      const key = `${l.traineeId}|${entry.exerciseName}`;
      const prev = best.get(key);
      if (prev && top.e > prev.e + 0.01 && l.date >= since) {
        out.push({ traineeId: l.traineeId, exercise: entry.exerciseName, date: l.date, weight: top.w, reps: top.r, gainKg: Math.max(0, top.w - prev.w) });
      }
      if (!prev || top.e > prev.e) best.set(key, { e: top.e, w: top.w });
    }
  }
  // One PR per trainee+exercise, latest first.
  const seen = new Set<string>();
  return out.reverse().filter((p) => {
    const k = `${p.traineeId}|${p.exercise}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export interface LiftProgress {
  exercise: string;
  first: number;
  best: number;
  sessions: number;
}

export function liftProgress(logs: WorkoutLog[], limit = 6): LiftProgress[] {
  const map = new Map<string, LiftProgress>();
  for (const l of logs) {
    for (const entry of l.entries) {
      const top = Math.max(0, ...entry.sets.map((s) => e1rm(s.weight, s.reps)));
      if (top <= 0) continue;
      const cur = map.get(entry.exerciseName);
      if (!cur) map.set(entry.exerciseName, { exercise: entry.exerciseName, first: top, best: top, sessions: 1 });
      else map.set(entry.exerciseName, { ...cur, best: Math.max(cur.best, top), sessions: cur.sessions + 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.sessions - a.sessions || b.best - a.best).slice(0, limit);
}

export interface WeekDayPlan {
  date: string;
  planned: ProgramDay | null;
  log: WorkoutLog | undefined;
  isCheckin: boolean;
  checkinDone: boolean;
}

const pick = (days: ProgramDay[], slot: number) => (days.length ? days[slot % days.length] : null);

export function weekPlan(state: AppState, t: Trainee, logs: WorkoutLog[], weekStart = startOfWeek(todayISO())): WeekDayPlan[] {
  const slots = slotsFor(t);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const slot = slots.indexOf(dayOfWeek(date));
    const started = t.program && t.program.startDate <= date;
    return {
      date,
      planned: started && slot !== -1 ? pick(daysOn(t.program!, date), slot) : null,
      log: logs.find((l) => l.date === date),
      isCheckin: dayOfWeek(date) === t.checkinDay,
      checkinDone: state.checkins.some((c) => c.traineeId === t.id && c.date === date),
    };
  });
}

export function sessionsPerWeek(logs: WorkoutLog[], weeks = 6): { weekStart: string; count: number }[] {
  const thisWeek = startOfWeek(todayISO());
  return Array.from({ length: weeks }, (_, i) => {
    const ws = addDays(thisWeek, -7 * (weeks - 1 - i));
    const we = addDays(ws, 6);
    return { weekStart: ws, count: logs.filter((l) => l.date >= ws && l.date <= we).length };
  });
}

export function threads(state: AppState): { trainee: Trainee; last: Message | undefined; unread: number }[] {
  const byT = new Map<string, Message[]>();
  for (const m of state.messages) {
    const arr = byT.get(m.traineeId);
    if (arr) arr.push(m);
    else byT.set(m.traineeId, [m]);
  }
  return state.trainees
    .map((trainee) => {
      const msgs = byT.get(trainee.id) ?? [];
      const last = msgs.reduce<Message | undefined>((a, b) => (!a || b.at > a.at ? b : a), undefined);
      return { trainee, last, unread: msgs.filter((m) => m.from === 'trainee' && !m.read).length };
    })
    .sort((a, b) => (b.last?.at ?? '').localeCompare(a.last?.at ?? ''));
}

export function unreadTotal(state: AppState): number {
  return state.messages.filter((m) => m.from === 'trainee' && !m.read).length;
}

export function formatMoney(state: AppState, n: number): string {
  try {
    const locale = document.documentElement.lang === 'ar' ? 'ar-u-nu-latn' : 'en';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: state.coach.currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${state.coach.currency} ${Math.round(n)}`;
  }
}
