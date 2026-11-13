// What the iOS trainee app can change, applied on the server. Each op carries
// its own id, so the app can resend its outbox after a dropped connection
// without logging anything twice. These mirror the trainee actions in
// src/data/actions.ts (logWorkout, submitCheckin, sendTraineeMessage, ...).

import type { AppState, CardioDetail, CardioSession, CheckIn, DailyLog, InBodyScan, LogEntry, SkippedSession, Trainee, WorkoutLog } from '../src/data/types';

export type AppOp =
  | { id: string; kind: 'log'; log: Omit<WorkoutLog, 'traineeId'> }
  | { id: string; kind: 'weight'; date: string; kg: number }
  | { id: string; kind: 'checkin'; checkin: Omit<CheckIn, 'traineeId'> }
  | { id: string; kind: 'message'; message: { id: string; text: string; at: string } }
  | { id: string; kind: 'seen' }
  | { id: string; kind: 'touch'; at: string }
  | { id: string; kind: 'inbody'; scan: Omit<InBodyScan, 'traineeId' | 'source'> }
  | { id: string; kind: 'daily'; log: Omit<DailyLog, 'traineeId'> }
  | { id: string; kind: 'cardio'; session: Omit<CardioSession, 'traineeId'> }
  | { id: string; kind: 'skip'; skip: Omit<SkippedSession, 'traineeId'> }
  | { id: string; kind: 'unskip'; skipId: string };

const SKIP_REASONS = ['sick', 'busy', 'travel', 'sore', 'motivation', 'other'];

const ACTIVITIES = ['walk', 'run', 'cycle', 'swim', 'row', 'elliptical', 'stairs', 'hiit', 'sport', 'other'];
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const num = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const str = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
const stamp = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

const opt = (v: unknown, lo: number, hi: number) => v === undefined || num(v, lo, hi);

function validCardio(c: CardioDetail | undefined): boolean {
  return !!c && num(c.minutes, 0, 1440) && opt(c.distanceKm, 0, 1000) && opt(c.kcal, 0, 20000) && opt(c.avgHr, 30, 250);
}

function validEntries(entries: unknown): entries is LogEntry[] {
  return Array.isArray(entries) && entries.length <= 40 && entries.every((e: LogEntry) =>
    str(e.exerciseId, 80) && str(e.exerciseName, 120) && Array.isArray(e.sets) && e.sets.length <= 30 &&
    e.sets.every((s) => num(s.weight, 0, 1000) && num(s.reps, 0, 500)) &&
    (e.cardio === undefined || validCardio(e.cardio)) &&
    (e.note === undefined || str(e.note, 1000)) && (e.pain === undefined || typeof e.pain === 'boolean'));
}

/** Rejects anything malformed rather than storing it for the coach to trip over. */
export function isValidOp(op: AppOp): boolean {
  if (!op || !str(op.id, 80) || !op.id) return false;
  switch (op.kind) {
    case 'log': {
      const l = op.log;
      return !!l && str(l.id, 80) && DAY.test(l.date) && str(l.dayName, 120) && num(l.durationMin, 0, 600) && num(l.rpe, 1, 10) &&
        (l.dayId === undefined || str(l.dayId, 80)) && validEntries(l.entries);
    }
    case 'weight': return DAY.test(op.date) && num(op.kg, 20, 400);
    case 'checkin': {
      const c = op.checkin;
      return !!c && str(c.id, 80) && DAY.test(c.date) && num(c.weightKg, 20, 400) && num(c.sleepH, 0, 24) &&
        num(c.energy, 1, 5) && num(c.stress, 1, 5) && num(c.soreness, 1, 5) && str(c.comment, 2000);
    }
    case 'message': return !!op.message && str(op.message.id, 80) && str(op.message.text, 4000) && op.message.text.trim().length > 0 && stamp(op.message.at);
    case 'seen': return true;
    case 'touch': return stamp(op.at);
    case 'inbody': {
      const s = op.scan;
      const fileOk = !s?.file || (str(s.file.name, 200) && str(s.file.type, 100) && (s.file.dataUrl === undefined || str(s.file.dataUrl, 3_000_000)));
      return !!s && str(s.id, 80) && DAY.test(s.date) && fileOk &&
        [s.weightKg, s.muscleKg, s.fatKg, s.fatPct, s.bmi, s.visceral, s.bmr, s.waterL, s.score].every((v) => num(v, 0, 10000));
    }
    case 'daily': {
      const d = op.log;
      return !!d && DAY.test(d.date) && opt(d.sleepH, 0, 24) && opt(d.waterMl, 0, 20000) && opt(d.steps, 0, 200000) &&
        opt(d.stress, 1, 5) && opt(d.soreness, 1, 5) &&
        (d.sorenessAreas === undefined || (Array.isArray(d.sorenessAreas) && d.sorenessAreas.length <= 12 && d.sorenessAreas.every((a) => str(a, 40)))) &&
        Array.isArray(d.meals) && d.meals.length <= 30 &&
        d.meals.every((m) => str(m.id, 80) && MEALS.includes(m.type) && str(m.text, 500) && opt(m.kcal, 0, 10000) && opt(m.proteinG, 0, 1000));
    }
    case 'cardio': {
      const c = op.session;
      return !!c && str(c.id, 80) && DAY.test(c.date) && ACTIVITIES.includes(c.activity) && num(c.effort, 1, 3) &&
        validCardio(c) && (c.note === undefined || str(c.note, 1000));
    }
    case 'skip': {
      const k = op.skip;
      return !!k && str(k.id, 80) && DAY.test(k.weekStart) && DAY.test(k.date) && str(k.dayId, 80) && str(k.dayName, 120) &&
        SKIP_REASONS.includes(k.reason) && (k.note === undefined || str(k.note, 1000)) && stamp(k.at);
    }
    case 'unskip': return str(op.skipId, 80);
    default: return false;
  }
}

const later = (a: string, b: string) => (a > b ? a : b);

function onTrainee(s: AppState, id: string, fn: (t: Trainee) => Trainee): AppState {
  return { ...s, trainees: s.trainees.map((t) => (t.id === id ? fn(t) : t)) };
}

/** Applies one op for the signed-in trainee. The trainee id never comes from the app. */
export function applyOp(s: AppState, traineeId: string, op: AppOp): AppState {
  const now = new Date().toISOString();
  switch (op.kind) {
    case 'log': {
      const log: WorkoutLog = { ...op.log, traineeId };
      const logs = [...s.logs.filter((l) => l.id !== log.id), log].sort((a, b) => a.date.localeCompare(b.date));
      return onTrainee({ ...s, logs }, traineeId, (t) => ({ ...t, lastSeenAt: later(t.lastSeenAt, now) }));
    }
    case 'weight':
      return { ...s, weights: [...s.weights.filter((w) => !(w.traineeId === traineeId && w.date === op.date)), { traineeId, date: op.date, kg: op.kg }] };
    case 'checkin': {
      const c: CheckIn = { ...op.checkin, traineeId };
      return {
        ...s,
        checkins: [...s.checkins.filter((x) => x.id !== c.id && !(x.traineeId === traineeId && x.date === c.date)), c],
        weights: [...s.weights.filter((w) => !(w.traineeId === traineeId && w.date === c.date)), { traineeId, date: c.date, kg: c.weightKg }],
      };
    }
    case 'message': {
      if (s.messages.some((m) => m.id === op.message.id)) return s;
      const { id, text, at } = op.message;
      return { ...s, messages: [...s.messages, { id, traineeId, from: 'trainee', text: text.trim(), at, read: false }] };
    }
    case 'seen':
      if (!s.messages.some((m) => m.traineeId === traineeId && m.from === 'coach' && m.seen === false)) return s;
      return { ...s, messages: s.messages.map((m) => (m.traineeId === traineeId && m.from === 'coach' ? { ...m, seen: true } : m)) };
    case 'touch':
      return onTrainee(s, traineeId, (t) => ({ ...t, lastSeenAt: later(t.lastSeenAt, op.at > now ? now : op.at) }));
    case 'daily': {
      const log: DailyLog = { ...op.log, traineeId };
      return { ...s, dailyLogs: [...(s.dailyLogs ?? []).filter((d) => !(d.traineeId === traineeId && d.date === log.date)), log] };
    }
    case 'cardio': {
      const session: CardioSession = { ...op.session, traineeId };
      const cardio = [...(s.cardio ?? []).filter((c) => c.id !== session.id), session].sort((a, b) => a.date.localeCompare(b.date));
      return onTrainee({ ...s, cardio }, traineeId, (t) => ({ ...t, lastSeenAt: later(t.lastSeenAt, now) }));
    }
    case 'skip': {
      const skip: SkippedSession = { ...op.skip, traineeId };
      const others = (s.skips ?? []).filter((k) => k.id !== skip.id && !(k.traineeId === traineeId && k.weekStart === skip.weekStart && k.dayId === skip.dayId));
      return { ...s, skips: [...others, skip] };
    }
    case 'unskip':
      return { ...s, skips: (s.skips ?? []).filter((k) => !(k.id === op.skipId && k.traineeId === traineeId)) };
    case 'inbody': {
      if (s.inbody.some((x) => x.id === op.scan.id)) return s;
      const scan: InBodyScan = { ...op.scan, traineeId, source: 'trainee' };
      return {
        ...s,
        inbody: [...s.inbody, scan].sort((a, b) => a.date.localeCompare(b.date)),
        inbodyRequests: s.inbodyRequests.map((r) => (r.traineeId === traineeId && r.status === 'pending' ? { ...r, status: 'done', scanId: scan.id } : r)),
      };
    }
  }
}

/** Everything the app needs for one trainee, and nothing about anyone else. */
export function snapshotFor(s: AppState, t: Trainee, rev: number) {
  const mine = <T extends { traineeId: string | null }>(list: T[]) => list.filter((x) => x.traineeId === t.id);
  return {
    rev,
    serverTime: new Date().toISOString(),
    coach: { name: s.coach.name, title: s.coach.title, businessName: s.coach.businessName, currency: s.coach.currency },
    trainee: t,
    logs: mine(s.logs),
    weights: mine(s.weights),
    checkins: mine(s.checkins),
    messages: mine(s.messages),
    notes: mine(s.notes).filter((n) => n.shared),
    sessions: mine(s.sessions),
    inbody: mine(s.inbody).map(({ file, ...scan }) => ({ ...scan, file: file && { name: file.name, type: file.type } })),
    inbodyRequests: mine(s.inbodyRequests),
    cardio: mine(s.cardio ?? []),
    dailyLogs: mine(s.dailyLogs ?? []),
    skips: mine(s.skips ?? []),
  };
}
