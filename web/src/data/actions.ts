// Every mutation the UI can perform. Each one is a pure state transition
// through `update`, which persists and notifies subscribers.

import { addDays, todayISO } from '../lib/dates';
import { uid } from '../lib/util';
import { defaultLayout, normalizeLayout } from './layout';
import { basisFor, buildPlan, cloneDays, latestKg } from './plan';
import { update } from './store';
import type {
  AppState, AssignedProgram, CheckIn, Coach, CustomCard, Exercise, InBodyScan, Goal, Note, ProgramDay, Session, Template, Trainee, TraineeLayout, TraineeStatus, WidgetId, WorkoutLog,
} from './types';

const mapTrainee = (s: AppState, id: string, fn: (t: Trainee) => Trainee): AppState => ({
  ...s,
  trainees: s.trainees.map((t) => (t.id === id ? fn(t) : t)),
});

// ---------- Trainees ----------

export type NewTrainee = Omit<Trainee, 'id' | 'joinedAt' | 'lastSeenAt' | 'tone' | 'program' | 'status' | 'membership' | 'pinnedNote' | 'goals'> & {
  goalLabel: string;
  templateId: string | null;
  startDate: string;
};

export function createTrainee(input: NewTrainee): string {
  const id = uid('t');
  update((s) => {
    const tpl = s.templates.find((t) => t.id === input.templateId) ?? null;
    const price = input.mode === 'online' ? 150 : input.mode === 'hybrid' ? 280 : 420;
    const { goalLabel, templateId: _tplId, startDate, ...rest } = input;
    const trainee: Trainee = {
      ...rest,
      id,
      status: 'onboarding',
      joinedAt: todayISO(),
      lastSeenAt: new Date().toISOString(),
      tone: s.trainees.length % 6,
      goals: goalLabel.trim() ? [{ id: uid('g'), label: goalLabel.trim(), unit: '', start: 0, current: 0, target: 100 }] : [],
      program: null,
      membership: {
        plan: input.mode === 'online' ? 'Online coaching' : input.mode === 'hybrid' ? 'Hybrid · 2 sessions/week' : 'In person · 3 sessions/week',
        price, cycle: 'monthly', renewsOn: addDays(startDate, 30), paid: false,
      },
      pinnedNote: '',
    };
    if (tpl) trainee.program = programFromTemplate(tpl, startDate, trainee);
    return { ...s, trainees: [...s.trainees, trainee] };
  });
  return id;
}

export function updateTrainee(id: string, patch: Partial<Trainee>) {
  update((s) => mapTrainee(s, id, (t) => ({ ...t, ...patch })));
}

export function setTraineeStatus(id: string, status: TraineeStatus) {
  updateTrainee(id, { status });
}

export function setGoals(id: string, goals: Goal[]) {
  updateTrainee(id, { goals });
}

// ---------- Programs ----------

export function programFromTemplate(tpl: Template, startDate: string, trainee: Pick<Trainee, 'goalType' | 'goals'>, currentKg: number | null = null): AssignedProgram {
  return { templateId: tpl.id, name: tpl.name, startDate, weeks: tpl.weeks, plan: buildPlan(tpl.days, tpl.weeks, basisFor(trainee, tpl.weeks, currentKg), tpl.guide), guide: structuredClone(tpl.guide) };
}

export function assignTemplate(templateId: string, traineeIds: string[], startDate: string) {
  update((s) => {
    const tpl = s.templates.find((t) => t.id === templateId);
    if (!tpl) return s;
    return {
      ...s,
      trainees: s.trainees.map((t) => (traineeIds.includes(t.id) ? { ...t, program: programFromTemplate(tpl, startDate, t, latestKg(s.weights, t.id)) } : t)),
    };
  });
}

export function updateTraineeProgram(id: string, program: AssignedProgram | null) {
  updateTrainee(id, { program });
}

export function blankExercise(name = 'New exercise'): Exercise {
  return { id: uid('e'), name, sets: 3, reps: '8–10', intensity: 'RPE 8', rest: '1:30', cue: '' };
}

export function blankDay(name: string, exerciseName?: string): ProgramDay {
  return { id: uid('d'), name, exercises: [blankExercise(exerciseName)] };
}

// ---------- Templates ----------

export function createTemplate(draft: Omit<Template, 'id' | 'updatedAt'>): string {
  const id = uid('tpl');
  update((s) => ({ ...s, templates: [...s.templates, { ...draft, id, updatedAt: new Date().toISOString() }] }));
  return id;
}

export function updateTemplate(id: string, patch: Partial<Template>) {
  update((s) => ({
    ...s,
    templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)),
  }));
}

export function duplicateTemplate(id: string): string | null {
  const newId = uid('tpl');
  let ok = false;
  update((s) => {
    const src = s.templates.find((t) => t.id === id);
    if (!src) return s;
    ok = true;
    return { ...s, templates: [...s.templates, { ...src, id: newId, name: `${src.name} (copy)`, days: cloneDays(src.days), updatedAt: new Date().toISOString() }] };
  });
  return ok ? newId : null;
}

export function deleteTemplate(id: string) {
  update((s) => ({ ...s, templates: s.templates.filter((t) => t.id !== id) }));
}

// ---------- Notes ----------

export function addNote(traineeId: string, text: string, shared: boolean) {
  const note: Note = { id: uid('n'), traineeId, text, shared, at: new Date().toISOString() };
  update((s) => ({ ...s, notes: [note, ...s.notes] }));
}

export function toggleNoteShared(id: string) {
  update((s) => ({ ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, shared: !n.shared } : n)) }));
}

export function deleteNote(id: string) {
  update((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
}

// ---------- Messages ----------

export function sendMessage(traineeId: string, text: string) {
  update((s) => ({
    ...s,
    messages: [...s.messages, { id: uid('m'), traineeId, from: 'coach', text, at: new Date().toISOString(), read: true, seen: false }],
  }));
}

export function sendBroadcast(traineeIds: string[], text: string) {
  const at = new Date().toISOString();
  update((s) => ({
    ...s,
    messages: [...s.messages, ...traineeIds.map((traineeId) => ({ id: uid('m'), traineeId, from: 'coach' as const, text, at, read: true, seen: false }))],
  }));
}

export function markThreadRead(traineeId: string) {
  update((s) => {
    if (!s.messages.some((m) => m.traineeId === traineeId && !m.read)) return s;
    return { ...s, messages: s.messages.map((m) => (m.traineeId === traineeId ? { ...m, read: true } : m)) };
  });
}

// ---------- Trainee app ----------

/** Saves a finished session from the trainee app; the coach sees it straight away. */
export function logWorkout(log: Omit<WorkoutLog, 'id'>): string {
  const id = uid('l');
  update((s) => ({
    ...s,
    logs: [...s.logs, { ...log, id }].sort((a, b) => a.date.localeCompare(b.date)),
    trainees: s.trainees.map((t) => (t.id === log.traineeId ? { ...t, lastSeenAt: new Date().toISOString() } : t)),
  }));
  return id;
}

/** One weigh-in per day; a new value replaces that day's entry. */
export function logWeight(traineeId: string, date: string, kg: number) {
  update((s) => ({ ...s, weights: [...s.weights.filter((w) => !(w.traineeId === traineeId && w.date === date)), { traineeId, date, kg }] }));
}

export function submitCheckin(c: Omit<CheckIn, 'id'>) {
  update((s) => ({
    ...s,
    checkins: [...s.checkins.filter((x) => !(x.traineeId === c.traineeId && x.date === c.date)), { ...c, id: uid('c') }],
    weights: [...s.weights.filter((w) => !(w.traineeId === c.traineeId && w.date === c.date)), { traineeId: c.traineeId, date: c.date, kg: c.weightKg }],
  }));
}

export function sendTraineeMessage(traineeId: string, text: string) {
  update((s) => ({ ...s, messages: [...s.messages, { id: uid('m'), traineeId, from: 'trainee', text, at: new Date().toISOString(), read: false }] }));
}

export function markCoachMessagesSeen(traineeId: string) {
  update((s) => {
    if (!s.messages.some((m) => m.traineeId === traineeId && m.from === 'coach' && m.seen === false)) return s;
    return { ...s, messages: s.messages.map((m) => (m.traineeId === traineeId && m.from === 'coach' ? { ...m, seen: true } : m)) };
  });
}

/** Opening the app updates "last opened" on the coach side. */
export function touchTrainee(traineeId: string) {
  update((s) => mapTrainee(s, traineeId, (t) => ({ ...t, lastSeenAt: new Date().toISOString() })));
}

// ---------- Calendar ----------

export function addSession(session: Omit<Session, 'id'>) {
  update((s) => ({ ...s, sessions: [...s.sessions, { ...session, id: uid('s') }] }));
}

export function deleteSession(id: string) {
  update((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
}

// ---------- Billing ----------

export function markPaid(traineeId: string) {
  update((s) =>
    mapTrainee(s, traineeId, (t) => ({
      ...t,
      membership: { ...t.membership, paid: true, renewsOn: addDays(t.membership.renewsOn, t.membership.cycle === 'quarterly' ? 91 : 30) },
    })),
  );
}

// ---------- Workspace ----------

export function setWidget(id: WidgetId, on: boolean) {
  update((s) => ({ ...s, widgets: { ...s.widgets, [id]: on } }));
}

export function resetWidgets() {
  update((s) => ({
    ...s,
    widgets: { kpis: true, attention: true, sessions: true, messages: true, roster: true, adherence: true, prs: true, renewals: false },
  }));
}

export function setTraineeLayout(patch: Partial<TraineeLayout>) {
  update((s) => ({ ...s, traineeLayout: normalizeLayout({ ...s.traineeLayout, ...patch }) }));
}

export function resetTraineeLayout() {
  update((s) => ({ ...s, traineeLayout: defaultLayout() }));
}

// ---------- InBody ----------

/** Asks the trainee for a scan: a pending request plus a chat message they see in the app. */
export function requestInBody(traineeId: string, note: string, message: string) {
  const at = new Date().toISOString();
  update((s) => ({
    ...s,
    inbodyRequests: [...s.inbodyRequests.map((r) => (r.traineeId === traineeId && r.status === 'pending' ? { ...r, status: 'cancelled' as const } : r)),
      { id: uid('ibr'), traineeId, requestedAt: at, note, status: 'pending' }],
    messages: [...s.messages, { id: uid('m'), traineeId, from: 'coach', text: message, at, read: true, seen: false }],
  }));
}

export function cancelInBodyRequest(id: string) {
  update((s) => ({ ...s, inbodyRequests: s.inbodyRequests.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)) }));
}

/** Saves a scan and closes the trainee's pending request, if any. */
export function addInBodyScan(scan: Omit<InBodyScan, 'id'>) {
  const id = uid('ib');
  update((s) => ({
    ...s,
    inbody: [...s.inbody, { ...scan, id }].sort((a, b) => a.date.localeCompare(b.date)),
    inbodyRequests: s.inbodyRequests.map((r) => (r.traineeId === scan.traineeId && r.status === 'pending' ? { ...r, status: 'done', scanId: id } : r)),
  }));
  return id;
}

export function deleteInBodyScan(id: string) {
  update((s) => ({ ...s, inbody: s.inbody.filter((x) => x.id !== id) }));
}

// ---------- Coach-built cards ----------

export function addCustomCard(card: Omit<CustomCard, 'id'>, tab: 'overview' | 'progress'): string {
  const id = uid('c');
  update((s) => {
    const L = normalizeLayout({ ...s.traineeLayout, customCards: [...s.traineeLayout.customCards, { ...card, id }] });
    const key = `card:${id}` as const;
    // New cards go first on the chosen tab, switched on.
    const list = [{ ...L[tab].find((x) => x.id === key)!, on: true }, ...L[tab].filter((x) => x.id !== key)];
    return { ...s, traineeLayout: { ...L, [tab]: list } };
  });
  return id;
}

export function updateCustomCard(id: string, patch: Partial<Omit<CustomCard, 'id'>>) {
  update((s) => ({ ...s, traineeLayout: normalizeLayout({ ...s.traineeLayout, customCards: s.traineeLayout.customCards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }) }));
}

export function deleteCustomCard(id: string) {
  update((s) => ({
    ...s,
    traineeLayout: normalizeLayout({ ...s.traineeLayout, customCards: s.traineeLayout.customCards.filter((c) => c.id !== id) }),
    metricEntries: s.metricEntries.filter((m) => m.cardId !== id),
  }));
}

export function addMetricEntry(traineeId: string, cardId: string, date: string, value: number) {
  update((s) => ({ ...s, metricEntries: [...s.metricEntries, { id: uid('me'), traineeId, cardId, date, value }] }));
}

export function deleteMetricEntry(id: string) {
  update((s) => ({ ...s, metricEntries: s.metricEntries.filter((m) => m.id !== id) }));
}

export function updateCoach(patch: Partial<Coach>) {
  update((s) => ({ ...s, coach: { ...s.coach, ...patch } }));
}
