// Supabase persistence. The app keeps working on one in-memory AppState; this module loads it from
// the database for the signed-in user and writes every change back.
//
// Changes are found by comparing the previous and next state: actions replace only the objects they
// change, so a different object reference means "changed", a missing id means "deleted".
// Row Level Security limits what each user can load and write (see supabase/migrations).

import type { SupabaseClient } from '@supabase/supabase-js';
import { defaultLayout, normalizeLayout } from './layout';
import { normalizeGuide } from './guide';
import type {
  AppState, CheckIn, Coach, Goal, ImportLayout, InBodyRequest, InBodyScan, LogEntry, Message, MetricEntry,
  CardioSession, DailyLog, JoinRequest, Note, ProgramWeek, Session, SkippedSession, Template, Trainee,
  WeightEntry, WidgetId, WorkoutLog,
} from './types';

export type Role = 'coach' | 'trainee';
type Row = Record<string, unknown>;

const DEFAULT_WIDGETS: Record<WidgetId, boolean> = { kpis: true, attention: true, sessions: true, messages: true, roster: true, adherence: true, prs: true, renewals: false };
const KIND_TO_LOCATION: Record<string, Session['location']> = { video: 'Video call', voice: 'Voice call', focus: 'Focus block' };
const LOCATION_TO_KIND: Record<Session['location'], string> = { 'Video call': 'video', 'Voice call': 'voice', 'Focus block': 'focus' };
const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
/** Columns the trainee app may leave empty are optional in the app's types, not null. */
const opt = (v: unknown): number | undefined => (v === null || v === undefined ? undefined : Number(v));
const optStr = (v: unknown): string | undefined => (v === null || v === undefined || v === '' ? undefined : String(v));

/** Reads every row of a table (PostgREST returns at most 1000 per request). */
async function fetchAll(db: SupabaseClient, table: string, select = '*'): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(select).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < 1000) return rows;
  }
}

// ---------- Loading ----------

export async function loadRemoteState(db: SupabaseClient, role: Role, userId: string): Promise<AppState> {
  const [coaches, trainees, priv, goals, members, templates, programs, weeks, logs, entries, sets, weights, checkins, scans, requests, metrics, notes, messages, calls, layouts, joins, daily, cardio, skips] = await Promise.all([
    fetchAll(db, 'coaches'), fetchAll(db, 'trainees'), role === 'coach' ? fetchAll(db, 'trainee_private') : Promise.resolve([]),
    fetchAll(db, 'goals'), fetchAll(db, 'memberships'), role === 'coach' ? fetchAll(db, 'templates') : Promise.resolve([]),
    fetchAll(db, 'programs'), fetchAll(db, 'program_weeks'), fetchAll(db, 'workout_logs'), fetchAll(db, 'log_entries'), fetchAll(db, 'log_sets'),
    fetchAll(db, 'weights'), fetchAll(db, 'checkins'), fetchAll(db, 'inbody_scans'), fetchAll(db, 'inbody_requests'), fetchAll(db, 'metric_entries'),
    fetchAll(db, 'notes'), fetchAll(db, 'messages'), fetchAll(db, 'calls'), role === 'coach' ? fetchAll(db, 'import_layouts') : Promise.resolve([]),
    // Join requests are the coach's inbox from their public page; a trainee never loads them.
    role === 'coach' ? fetchAll(db, 'join_requests') : Promise.resolve([]),
    // What the trainee app logs beyond workouts.
    fetchAll(db, 'daily_logs'), fetchAll(db, 'cardio_sessions'), fetchAll(db, 'skipped_sessions'),
  ]);

  const coachRow = (role === 'coach' ? coaches.find((c) => c.id === userId) : coaches[0]) ?? {};
  const coach: Coach = { name: String(coachRow.name ?? ''), title: String(coachRow.title ?? ''), email: String(coachRow.email ?? ''), businessName: String(coachRow.business_name ?? 'Coach HQ'), theme: (coachRow.theme as Coach['theme']) ?? 'dark' };

  const group = <T>(rows: Row[], key: string, map: (r: Row) => T) => {
    const m = new Map<string, T[]>();
    for (const r of rows) { const k = String(r[key]); m.set(k, [...(m.get(k) ?? []), map(r)]); }
    return m;
  };
  const goalsBy = group(goals.sort((a, b) => num(a.position) - num(b.position)), 'trainee_id', (r): Goal => ({ id: String(r.id), label: String(r.label), unit: String(r.unit), start: num(r.start_value), current: num(r.current_value), target: num(r.target_value) }));
  const weeksBy = group(weeks.sort((a, b) => num(a.week_index) - num(b.week_index)), 'program_id', (r): ProgramWeek => ({
    id: String(r.id), days: (r.days as ProgramWeek['days']) ?? [],
    targets: { bodyWeightKg: numOrNull(r.body_weight_kg), sleepH: numOrNull(r.sleep_h), calories: numOrNull(r.calories), proteinG: numOrNull(r.protein_g), steps: numOrNull(r.steps), focus: String(r.focus ?? '') },
  }));
  const privBy = new Map(priv.map((r) => [String(r.trainee_id), String(r.pinned_note ?? '')]));
  const memberBy = new Map(members.map((r) => [String(r.trainee_id), r]));
  const programBy = new Map(programs.map((r) => [String(r.trainee_id), r]));

  const traineeList: Trainee[] = trainees.map((r) => {
    const id = String(r.id);
    const m = memberBy.get(id);
    const p = programBy.get(id);
    const plan = p ? weeksBy.get(String(p.id)) ?? [] : [];
    return {
      id, firstName: String(r.first_name), lastName: String(r.last_name), email: String(r.email), phone: String(r.phone ?? ''),
      birthDate: String(r.birth_date ?? ''), heightCm: num(r.height_cm), tier: r.tier as Trainee['tier'], status: r.status as Trainee['status'],
      goalType: r.goal_type as Trainee['goalType'], goals: goalsBy.get(id) ?? [], injuries: String(r.injuries ?? ''), frequency: num(r.frequency),
      checkinDay: num(r.checkin_day), joinedAt: String(r.joined_at), lastSeenAt: String(r.last_seen_at ?? r.created_at ?? new Date().toISOString()), tone: num(r.tone),
      pinnedNote: privBy.get(id) ?? '',
      membership: m ? { plan: String(m.plan), price: num(m.price_sar), cycle: m.cycle as 'monthly' | 'quarterly', renewsOn: String(m.renews_on), paid: Boolean(m.paid) } : { plan: '', price: 0, cycle: 'monthly', renewsOn: String(r.joined_at), paid: false },
      program: p ? { templateId: (p.template_id as string | null) ?? null, name: String(p.name), startDate: String(p.start_date), weeks: plan.length, plan, guide: p.guide ? normalizeGuide(p.guide as object) : undefined } : null,
    };
  });

  const setsBy = group(sets.sort((a, b) => num(a.position) - num(b.position)), 'entry_id', (r) => ({ weight: num(r.weight_kg), reps: num(r.reps) }));
  const entriesBy = group(entries.sort((a, b) => num(a.position) - num(b.position)), 'log_id', (r): LogEntry => ({
    exerciseId: String(r.exercise_id), exerciseName: String(r.exercise_name), sets: setsBy.get(String(r.id)) ?? [],
    ...(r.pain ? { pain: true } : {}), ...(r.note ? { note: String(r.note) } : {}),
  }));

  return {
    version: 0,
    coach,
    trainees: traineeList,
    templates: templates.map((r): Template => ({ id: String(r.id), name: String(r.name), summary: String(r.summary), tags: (r.tags as string[]) ?? [], weeks: num(r.weeks), loadMethod: String(r.load_method), progression: String(r.progression), days: (r.days as Template['days']) ?? [], guide: normalizeGuide(r.guide as object), updatedAt: String(r.updated_at) })),
    logs: logs.map((r): WorkoutLog => ({ id: String(r.id), traineeId: String(r.trainee_id), date: String(r.date), dayName: String(r.day_name), durationMin: num(r.duration_min), rpe: num(r.rpe), entries: entriesBy.get(String(r.id)) ?? [] })).sort((a, b) => a.date.localeCompare(b.date)),
    weights: weights.map((r): WeightEntry => ({ traineeId: String(r.trainee_id), date: String(r.date), kg: num(r.kg) })),
    checkins: checkins.map((r): CheckIn => ({ id: String(r.id), traineeId: String(r.trainee_id), date: String(r.date), weightKg: num(r.weight_kg), sleepH: num(r.sleep_h), energy: num(r.energy), stress: num(r.stress), soreness: num(r.soreness), comment: String(r.comment ?? '') })),
    notes: notes.map((r): Note => ({ id: String(r.id), traineeId: String(r.trainee_id), at: String(r.created_at), text: String(r.text), shared: Boolean(r.shared) })).sort((a, b) => b.at.localeCompare(a.at)),
    messages: messages.map((r): Message => ({ id: String(r.id), traineeId: String(r.trainee_id), from: r.sender as Message['from'], text: String(r.text), at: String(r.created_at), read: r.sender === 'trainee' ? Boolean(r.read_by_coach) : true, ...(r.sender === 'coach' ? { seen: Boolean(r.seen_by_trainee) } : {}) })).sort((a, b) => a.at.localeCompare(b.at)),
    sessions: calls.map((r): Session => ({ id: String(r.id), traineeId: (r.trainee_id as string | null) ?? null, title: String(r.title), start: localStamp(String(r.starts_at)), durationMin: num(r.duration_min), location: KIND_TO_LOCATION[String(r.kind)] ?? 'Video call' })),
    widgets: { ...DEFAULT_WIDGETS, ...((coachRow.widgets as object) ?? {}) },
    traineeLayout: Object.keys((coachRow.trainee_layout as object) ?? {}).length ? normalizeLayout(coachRow.trainee_layout as object) : defaultLayout(),
    inbody: scans.map((r): InBodyScan => ({
      id: String(r.id), traineeId: String(r.trainee_id), date: String(r.date), weightKg: num(r.weight_kg), muscleKg: num(r.muscle_kg), fatKg: num(r.fat_kg), fatPct: num(r.fat_pct),
      bmi: num(r.bmi), visceral: num(r.visceral), bmr: num(r.bmr), waterL: num(r.water_l), score: num(r.score), source: r.source as InBodyScan['source'],
      ...(r.file_name ? { file: { name: String(r.file_name), type: '', ...(r.file_path ? { path: String(r.file_path) } : {}) } } : {}),
    })).sort((a, b) => a.date.localeCompare(b.date)),
    inbodyRequests: requests.map((r): InBodyRequest => ({ id: String(r.id), traineeId: String(r.trainee_id), requestedAt: String(r.requested_at), note: String(r.note ?? ''), status: r.status as InBodyRequest['status'], ...(r.scan_id ? { scanId: String(r.scan_id) } : {}) })),
    metricEntries: metrics.map((r): MetricEntry => ({ id: String(r.id), traineeId: String(r.trainee_id), cardId: String(r.card_id), date: String(r.date), value: num(r.value) })),
    importLayouts: layouts.map((r): ImportLayout => ({ id: String(r.id), name: String(r.name), signature: String(r.signature), headerRow: num(r.header_row), roles: (r.roles as string[]) ?? [], split: r.split as ImportLayout['split'] })),
    joinRequests: joins.map((r): JoinRequest => ({
      id: String(r.id), name: String(r.name), email: String(r.email), phone: String(r.phone ?? ''),
      answers: (r.answers as JoinRequest['answers']) ?? {}, planId: String(r.plan_id ?? ''), message: String(r.message ?? ''),
      status: r.status as JoinRequest['status'], sentAt: String(r.sent_at), traineeId: (r.trainee_id as string | null) ?? null,
    })).sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    dailyLogs: daily.map((r): DailyLog => ({
      traineeId: String(r.trainee_id), date: String(r.date), sleepH: opt(r.sleep_h), waterMl: opt(r.water_ml), steps: opt(r.steps),
      stress: opt(r.stress), soreness: opt(r.soreness), sorenessAreas: (r.soreness_areas as string[]) ?? [],
      meals: (r.meals as DailyLog['meals']) ?? [],
    })).sort((a, b) => a.date.localeCompare(b.date)),
    cardio: cardio.map((r): CardioSession => ({
      id: String(r.id), traineeId: String(r.trainee_id), date: String(r.date), activity: r.activity as CardioSession['activity'],
      effort: num(r.effort), minutes: num(r.minutes), distanceKm: opt(r.distance_km), kcal: opt(r.kcal), avgHr: opt(r.avg_hr),
      note: optStr(r.note),
    })).sort((a, b) => a.date.localeCompare(b.date)),
    skips: skips.map((r): SkippedSession => ({
      id: String(r.id), traineeId: String(r.trainee_id), weekStart: String(r.week_start), date: String(r.date),
      dayId: String(r.day_id), dayName: String(r.day_name), reason: r.reason as SkippedSession['reason'],
      note: optStr(r.note), at: String(r.at),
    })),
  };
}

/** Calls are stored as timestamptz; the app works with local "YYYY-MM-DDTHH:MM:SS" strings. */
function localStamp(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

// ---------- Saving ----------

interface Ctx { db: SupabaseClient; role: Role; userId: string }

const traineeRow = (t: Trainee, coachId: string): Row => ({
  id: t.id, coach_id: coachId, first_name: t.firstName, last_name: t.lastName, email: t.email, phone: t.phone, birth_date: t.birthDate || null,
  height_cm: t.heightCm || null, tier: t.tier, status: t.status, goal_type: t.goalType, injuries: t.injuries, frequency: t.frequency,
  checkin_day: t.checkinDay, tone: t.tone, joined_at: t.joinedAt,
});
const weekRows = (programId: string, plan: ProgramWeek[]): Row[] => plan.map((w, i) => ({
  program_id: programId, week_index: i, body_weight_kg: w.targets.bodyWeightKg, sleep_h: w.targets.sleepH, calories: w.targets.calories,
  protein_g: w.targets.proteinG, steps: w.targets.steps, focus: w.targets.focus, days: w.days,
}));
const goalRow = (traineeId: string, g: Goal, i: number): Row => ({ id: g.id, trainee_id: traineeId, position: i, label: g.label, unit: g.unit, start_value: g.start, current_value: g.current, target_value: g.target });
const BASE_KEYS: (keyof Trainee)[] = ['firstName', 'lastName', 'email', 'phone', 'birthDate', 'heightCm', 'tier', 'status', 'goalType', 'injuries', 'frequency', 'checkinDay', 'tone', 'joinedAt'];

async function must<T extends { error: { message: string } | null }>(p: PromiseLike<T>, what: string): Promise<T> {
  const r = await p;
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r;
}

/** Diff two collections by key: what to write (new or changed objects) and which keys disappeared. */
function diff<T>(prev: T[], next: T[], key: (x: T) => string) {
  const before = new Map(prev.map((x) => [key(x), x]));
  const after = new Map(next.map((x) => [key(x), x]));
  const changed = next.filter((x) => before.get(key(x)) !== x);
  const added = changed.filter((x) => !before.has(key(x)));
  const removed = prev.filter((x) => !after.has(key(x)));
  return { changed, added, updated: changed.filter((x) => before.has(key(x))), removed, before };
}

async function saveTrainees(c: Ctx, prev: AppState, next: AppState) {
  const { db, role, userId } = c;
  const d = diff(prev.trainees, next.trainees, (t) => t.id);
  if (role === 'trainee') {
    // Trainees can't edit their profile; opening the app or logging a workout only bumps "last seen".
    if (d.updated.some((t) => t.lastSeenAt !== d.before.get(t.id)!.lastSeenAt)) await db.rpc('touch_last_seen');
    return;
  }
  for (const t of d.changed) {
    const old = d.before.get(t.id);
    if (!old || BASE_KEYS.some((k) => t[k] !== old[k])) await must(db.from('trainees').upsert(traineeRow(t, userId)), 'trainee');
    if (!old || t.pinnedNote !== old.pinnedNote) await must(db.from('trainee_private').upsert({ trainee_id: t.id, pinned_note: t.pinnedNote }), 'pinned note');
    if (!old || t.membership !== old.membership) {
      const m = t.membership;
      await must(db.from('memberships').upsert({ trainee_id: t.id, plan: m.plan, price_sar: m.price, cycle: m.cycle, renews_on: m.renewsOn, paid: m.paid }), 'membership');
    }
    if (!old || t.goals !== old.goals) {
      const gd = diff(old?.goals ?? [], t.goals, (g) => g.id);
      if (gd.removed.length) await must(db.from('goals').delete().in('id', gd.removed.map((g) => g.id)), 'goals');
      if (t.goals.length) await must(db.from('goals').upsert(t.goals.map((g, i) => goalRow(t.id, g, i))), 'goals');
    }
    if (!old || t.program !== old.program) {
      if (!t.program) {
        await must(db.from('programs').delete().eq('trainee_id', t.id), 'program');
      } else {
        const p = t.program;
        const { data } = await must(db.from('programs').upsert({ trainee_id: t.id, template_id: p.templateId, name: p.name, start_date: p.startDate, guide: p.guide ?? null }, { onConflict: 'trainee_id' }).select('id').single(), 'program');
        const programId = (data as { id: string }).id;
        // Weeks are replaced as a set: edits can add, remove or reorder them.
        await must(db.from('program_weeks').delete().eq('program_id', programId), 'program weeks');
        if (p.plan.length) await must(db.from('program_weeks').insert(weekRows(programId, p.plan)), 'program weeks');
      }
    }
  }
  if (d.removed.length) await must(db.from('trainees').delete().in('id', d.removed.map((t) => t.id)), 'trainees');
}

async function saveLogs(c: Ctx, prev: AppState, next: AppState) {
  const d = diff(prev.logs, next.logs, (l) => l.id);
  for (const l of d.changed) {
    if (d.before.has(l.id)) await must(c.db.from('workout_logs').delete().eq('id', l.id), 'log');
    await must(c.db.from('workout_logs').insert({ id: l.id, trainee_id: l.traineeId, date: l.date, day_name: l.dayName, duration_min: l.durationMin, rpe: l.rpe || null }), 'log');
    const entryIds = l.entries.map(() => crypto.randomUUID());
    if (l.entries.length) {
      await must(c.db.from('log_entries').insert(l.entries.map((e, i) => ({ id: entryIds[i], log_id: l.id, position: i, exercise_id: e.exerciseId, exercise_name: e.exerciseName, pain: !!e.pain, note: e.note ?? '' }))), 'log entries');
      const setRows = l.entries.flatMap((e, i) => e.sets.map((s, j) => ({ entry_id: entryIds[i], position: j, weight_kg: s.weight, reps: s.reps })));
      if (setRows.length) await must(c.db.from('log_sets').insert(setRows), 'log sets');
    }
  }
  if (d.removed.length) await must(c.db.from('workout_logs').delete().in('id', d.removed.map((l) => l.id)), 'logs');
}

async function saveMessages(c: Ctx, prev: AppState, next: AppState) {
  const d = diff(prev.messages, next.messages, (m) => m.id);
  if (d.added.length) {
    await must(c.db.from('messages').insert(d.added.map((m) => ({ id: m.id, trainee_id: m.traineeId, sender: m.from, text: m.text, created_at: m.at, read_by_coach: false, seen_by_trainee: false }))), 'messages');
  }
  if (c.role === 'coach') {
    const nowRead = d.updated.filter((m) => m.from === 'trainee' && m.read && !d.before.get(m.id)!.read).map((m) => m.id);
    if (nowRead.length) await must(c.db.from('messages').update({ read_by_coach: true }).in('id', nowRead), 'mark read');
    if (d.removed.length) await must(c.db.from('messages').delete().in('id', d.removed.map((m) => m.id)), 'messages');
  } else {
    const seenFor = new Set(d.updated.filter((m) => m.from === 'coach' && m.seen && d.before.get(m.id)!.seen === false).map((m) => m.traineeId));
    for (const t of seenFor) await c.db.rpc('mark_coach_messages_seen', { t });
  }
}

/** Simple id-keyed tables: upsert what changed, delete what's gone. */
async function saveSimple<T extends { id: string }>(c: Ctx, table: string, prev: T[], next: T[], toRow: (x: T) => Row, opts: { canDelete?: boolean; canUpdate?: boolean } = {}) {
  const d = diff(prev, next, (x) => x.id);
  const rows = (opts.canUpdate === false ? d.added : d.changed).map(toRow);
  if (rows.length) await must(c.db.from(table).upsert(rows), table);
  if (d.removed.length && opts.canDelete !== false) await must(c.db.from(table).delete().in('id', d.removed.map((x) => x.id)), table);
}

async function uploadReport(c: Ctx, scan: InBodyScan): Promise<string | null> {
  const f = scan.file;
  if (!f?.dataUrl) return null;
  const blob = await (await fetch(f.dataUrl)).blob();
  const path = `${scan.traineeId}/${scan.id}-${f.name.replace(/[^\w.\-]+/g, '_')}`;
  const { error } = await c.db.storage.from('inbody').upload(path, blob, { contentType: f.type || blob.type, upsert: true });
  return error ? null : path;
}

export async function saveDiff(c: Ctx, prev: AppState, next: AppState) {
  const { db, role, userId } = c;
  const coachSide = role === 'coach';

  if (coachSide && (prev.coach !== next.coach || prev.traineeLayout !== next.traineeLayout || prev.widgets !== next.widgets)) {
    const k = next.coach;
    await must(db.from('coaches').update({ name: k.name, title: k.title, email: k.email, business_name: k.businessName, theme: k.theme ?? 'dark', trainee_layout: next.traineeLayout, widgets: next.widgets }).eq('id', userId), 'coach');
  }
  if (prev.trainees !== next.trainees) await saveTrainees(c, prev, next);
  if (coachSide && prev.templates !== next.templates) {
    await saveSimple(c, 'templates', prev.templates, next.templates, (t) => ({ id: t.id, coach_id: userId, name: t.name, summary: t.summary, tags: t.tags, weeks: t.weeks, load_method: t.loadMethod, progression: t.progression, days: t.days, guide: t.guide }));
  }
  if (prev.logs !== next.logs) await saveLogs(c, prev, next);
  if (prev.weights !== next.weights) {
    const d = diff(prev.weights, next.weights, (w) => `${w.traineeId}|${w.date}`);
    if (d.changed.length) await must(db.from('weights').upsert(d.changed.map((w) => ({ trainee_id: w.traineeId, date: w.date, kg: w.kg }))), 'weights');
    for (const w of coachSide ? d.removed.filter((x) => !next.weights.some((y) => y.traineeId === x.traineeId && y.date === x.date)) : []) {
      await must(db.from('weights').delete().eq('trainee_id', w.traineeId).eq('date', w.date), 'weights');
    }
  }
  if (prev.checkins !== next.checkins) {
    // One check-in per trainee per day: a resubmission replaces the day's row.
    const d = diff(prev.checkins, next.checkins, (x) => `${x.traineeId}|${x.date}`);
    if (d.changed.length) await must(db.from('checkins').upsert(d.changed.map((x) => ({ trainee_id: x.traineeId, date: x.date, weight_kg: x.weightKg, sleep_h: x.sleepH, energy: x.energy, stress: x.stress, soreness: x.soreness, comment: x.comment })), { onConflict: 'trainee_id,date' }), 'check-ins');
  }
  if (prev.dailyLogs !== next.dailyLogs) {
    // One row per trainee per day; the app sends the whole day, so a later edit replaces it.
    const d = diff(prev.dailyLogs, next.dailyLogs, (x) => `${x.traineeId}|${x.date}`);
    if (d.changed.length) {
      await must(db.from('daily_logs').upsert(d.changed.map((x) => ({
        trainee_id: x.traineeId, date: x.date, sleep_h: x.sleepH ?? null, water_ml: x.waterMl ?? null, steps: x.steps ?? null,
        stress: x.stress ?? null, soreness: x.soreness ?? null, soreness_areas: x.sorenessAreas ?? [], meals: x.meals ?? [],
      })), { onConflict: 'trainee_id,date' }), 'daily logs');
    }
  }
  if (prev.cardio !== next.cardio) {
    await saveSimple(c, 'cardio_sessions', prev.cardio, next.cardio, (x) => ({
      id: x.id, trainee_id: x.traineeId, date: x.date, activity: x.activity, effort: x.effort, minutes: x.minutes,
      distance_km: x.distanceKm ?? null, kcal: x.kcal ?? null, avg_hr: x.avgHr ?? null, note: x.note ?? '',
    }));
  }
  if (prev.skips !== next.skips) {
    await saveSimple(c, 'skipped_sessions', prev.skips, next.skips, (x) => ({
      id: x.id, trainee_id: x.traineeId, week_start: x.weekStart, date: x.date, day_id: x.dayId, day_name: x.dayName,
      reason: x.reason, note: x.note ?? '', at: x.at,
    }));
  }
  if (prev.notes !== next.notes) await saveSimple(c, 'notes', prev.notes, next.notes, (n) => ({ id: n.id, trainee_id: n.traineeId, text: n.text, shared: n.shared, created_at: n.at }));
  if (prev.messages !== next.messages) await saveMessages(c, prev, next);
  if (coachSide && prev.sessions !== next.sessions) {
    await saveSimple(c, 'calls', prev.sessions, next.sessions, (s) => ({ id: s.id, coach_id: userId, trainee_id: s.traineeId, title: s.title, starts_at: new Date(s.start).toISOString(), duration_min: s.durationMin, kind: LOCATION_TO_KIND[s.location] }));
  }
  if (prev.inbody !== next.inbody) {
    const d = diff(prev.inbody, next.inbody, (x) => x.id);
    for (const s of d.added) {
      const path = await uploadReport(c, s);
      await must(db.from('inbody_scans').insert({
        id: s.id, trainee_id: s.traineeId, date: s.date, weight_kg: s.weightKg || null, muscle_kg: s.muscleKg || null, fat_kg: s.fatKg || null, fat_pct: s.fatPct || null,
        bmi: s.bmi || null, visceral: s.visceral || null, bmr: s.bmr || null, water_l: s.waterL || null, score: s.score || null,
        file_name: s.file?.name ?? null, file_path: path, source: role === 'trainee' ? 'trainee' : s.source,
      }), 'InBody scan');
    }
    if (coachSide && d.removed.length) await must(db.from('inbody_scans').delete().in('id', d.removed.map((x) => x.id)), 'InBody scans');
  }
  // Trainee uploads close requests through a database trigger; only coaches write requests directly.
  if (coachSide && prev.inbodyRequests !== next.inbodyRequests) {
    await saveSimple(c, 'inbody_requests', prev.inbodyRequests, next.inbodyRequests, (r) => ({ id: r.id, trainee_id: r.traineeId, requested_at: r.requestedAt, note: r.note, status: r.status, scan_id: r.scanId ?? null }));
  }
  if (prev.metricEntries !== next.metricEntries) {
    await saveSimple(c, 'metric_entries', prev.metricEntries, next.metricEntries, (m) => ({ id: m.id, trainee_id: m.traineeId, card_id: m.cardId, date: m.date, value: m.value, source: role }), { canDelete: coachSide, canUpdate: coachSide });
  }
  if (coachSide && prev.importLayouts !== next.importLayouts) {
    await saveSimple(c, 'import_layouts', prev.importLayouts, next.importLayouts, (l) => ({ id: l.id, coach_id: userId, name: l.name, signature: l.signature, header_row: l.headerRow, roles: l.roles, split: l.split }));
  }
}

/** A short-lived link to a stored InBody report. */
export async function reportUrl(db: SupabaseClient, path: string): Promise<string | null> {
  const { data } = await db.storage.from('inbody').createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
