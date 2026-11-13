// Builds supabase/seed.sql from the app's demo workspace (src/data/seed.ts).
// The output defines public.load_demo_data(coach_id): it fills one coach's account with the demo
// trainees, programs, logs, check-ins, InBody scans, notes, chat and calls. Dates are written
// relative to the day it runs, so the demo always looks current.
//
//   npx tsx scripts/gen-demo-seed.ts

import { writeFileSync } from 'node:fs';
import { createSeed } from '../src/data/seed.ts';
import { daysBetween, todayISO } from '../src/lib/dates.ts';

const s = createSeed();
const today = todayISO();
const out: string[] = [];

const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const n = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? 'null' : String(v));
const nz = (v: number | null | undefined) => (!v ? 'null' : String(v)); // InBody: 0 meant "not given"
const json = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const id = (key: string) => `public._demo_id(c, ${q(key)})`;
const day = (iso: string) => `(current_date + ${daysBetween(today, iso.slice(0, 10))})`;
/** Local wall-clock time of a timestamp, kept on the same relative day, in Saudi time. */
const ts = (isoTs: string) => {
  const d = new Date(isoTs);
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `((current_date + ${daysBetween(today, local)}) + time '${time}') at time zone 'Asia/Riyadh'`;
};
const localTs = (isoLocal: string) => `((current_date + ${daysBetween(today, isoLocal.slice(0, 10))}) + time '${isoLocal.slice(11, 16)}') at time zone 'Asia/Riyadh'`;

function insert(table: string, cols: string[], rows: string[][]) {
  for (let i = 0; i < rows.length; i += 500) {
    out.push(`  insert into ${table} (${cols.join(', ')}) values\n    ${rows.slice(i, i + 500).map((r) => `(${r.join(', ')})`).join(',\n    ')};`);
  }
}

// ---------- Coach profile & preferences ----------
out.push(`  update coaches set name = coalesce(nullif(name, ''), ${q(s.coach.name)}), title = ${q(s.coach.title)}, business_name = ${q(s.coach.businessName)},
    trainee_layout = ${json(s.traineeLayout)}, widgets = ${json(s.widgets)} where id = c;`);

// ---------- Templates ----------
insert('templates', ['id', 'coach_id', 'name', 'summary', 'tags', 'weeks', 'load_method', 'progression', 'days', 'guide'],
  s.templates.map((t) => [id(t.id), 'c', q(t.name), q(t.summary), `array[${t.tags.map(q).join(', ')}]::text[]`, n(t.weeks), q(t.loadMethod), q(t.progression), json(t.days), json(t.guide)]));

// ---------- Trainees and what hangs off them ----------
insert('trainees', ['id', 'coach_id', 'first_name', 'last_name', 'email', 'phone', 'birth_date', 'height_cm', 'tier', 'status', 'goal_type', 'injuries', 'frequency', 'checkin_day', 'tone', 'joined_at', 'last_seen_at'],
  s.trainees.map((t) => [id(t.id), 'c', q(t.firstName), q(t.lastName), q(t.email), q(t.phone), q(t.birthDate), n(t.heightCm), q(t.tier), q(t.status), q(t.goalType), q(t.injuries), n(t.frequency), n(t.checkinDay), n(t.tone), day(t.joinedAt), ts(t.lastSeenAt)]));

insert('trainee_private', ['trainee_id', 'pinned_note'], s.trainees.map((t) => [id(t.id), q(t.pinnedNote)]));

insert('goals', ['trainee_id', 'position', 'label', 'unit', 'start_value', 'current_value', 'target_value'],
  s.trainees.flatMap((t) => t.goals.map((g, i) => [id(t.id), n(i), q(g.label), q(g.unit), n(g.start), n(g.current), n(g.target)])));

insert('memberships', ['trainee_id', 'plan', 'price_sar', 'cycle', 'renews_on', 'paid'],
  s.trainees.map((t) => [id(t.id), q(t.membership.plan), n(t.membership.price), q(t.membership.cycle), day(t.membership.renewsOn), String(t.membership.paid)]));

const withProgram = s.trainees.filter((t) => t.program);
insert('programs', ['id', 'trainee_id', 'template_id', 'name', 'start_date', 'guide'],
  withProgram.map((t) => [id(`${t.id}-program`), id(t.id), t.program!.templateId ? id(t.program!.templateId) : 'null', q(t.program!.name), day(t.program!.startDate), t.program!.guide ? json(t.program!.guide) : 'null']));
insert('program_weeks', ['program_id', 'week_index', 'body_weight_kg', 'sleep_h', 'calories', 'protein_g', 'steps', 'focus', 'days'],
  withProgram.flatMap((t) => t.program!.plan.map((w, i) => [id(`${t.id}-program`), n(i), n(w.targets.bodyWeightKg), n(w.targets.sleepH), n(w.targets.calories), n(w.targets.proteinG), n(w.targets.steps), q(w.targets.focus), json(w.days)])));

// ---------- Training logs ----------
insert('workout_logs', ['id', 'trainee_id', 'date', 'day_name', 'duration_min', 'rpe'],
  s.logs.map((l) => [id(l.id), id(l.traineeId), day(l.date), q(l.dayName), n(l.durationMin), n(l.rpe)]));
insert('log_entries', ['id', 'log_id', 'position', 'exercise_id', 'exercise_name', 'pain', 'note'],
  s.logs.flatMap((l) => l.entries.map((e, i) => [id(`${l.id}-e${i}`), id(l.id), n(i), q(e.exerciseId), q(e.exerciseName), String(!!e.pain), q(e.note ?? '')])));
insert('log_sets', ['entry_id', 'position', 'weight_kg', 'reps'],
  s.logs.flatMap((l) => l.entries.flatMap((e, i) => e.sets.map((x, j) => [id(`${l.id}-e${i}`), n(j), n(x.weight), n(x.reps)]))));

// ---------- Body, check-ins, InBody ----------
insert('weights', ['trainee_id', 'date', 'kg'], s.weights.map((w) => [id(w.traineeId), day(w.date), n(w.kg)]));
insert('checkins', ['trainee_id', 'date', 'weight_kg', 'sleep_h', 'energy', 'stress', 'soreness', 'comment'],
  s.checkins.map((x) => [id(x.traineeId), day(x.date), n(x.weightKg), n(x.sleepH), n(x.energy), n(x.stress), n(x.soreness), q(x.comment)]));
insert('inbody_scans', ['id', 'trainee_id', 'date', 'weight_kg', 'muscle_kg', 'fat_kg', 'fat_pct', 'bmi', 'visceral', 'bmr', 'water_l', 'score', 'file_name', 'source'],
  s.inbody.map((x) => [id(x.id), id(x.traineeId), day(x.date), nz(x.weightKg), nz(x.muscleKg), nz(x.fatKg), nz(x.fatPct), nz(x.bmi), nz(x.visceral), nz(x.bmr), nz(x.waterL), nz(x.score), x.file ? q(x.file.name) : 'null', q(x.source)]));
// Requests go in after scans so the "scan closes request" trigger doesn't touch them.
insert('inbody_requests', ['trainee_id', 'requested_at', 'note', 'status'],
  s.inbodyRequests.map((r) => [id(r.traineeId), ts(r.requestedAt), q(r.note), q(r.status)]));

// ---------- Notes, chat, calls ----------
insert('notes', ['trainee_id', 'text', 'shared', 'created_at'], s.notes.map((x) => [id(x.traineeId), q(x.text), String(x.shared), ts(x.at)]));
insert('messages', ['trainee_id', 'sender', 'text', 'created_at', 'read_by_coach', 'seen_by_trainee'],
  s.messages.map((m) => [id(m.traineeId), q(m.from), q(m.text), ts(m.at), String(m.from === 'trainee' ? m.read : true), String(m.from === 'coach' ? m.seen !== false : true)]));
const KIND: Record<string, string> = { 'Video call': 'video', 'Voice call': 'voice', 'Focus block': 'focus' };
insert('calls', ['coach_id', 'trainee_id', 'title', 'starts_at', 'duration_min', 'kind'],
  s.sessions.map((x) => ['c', x.traineeId ? id(x.traineeId) : 'null', q(x.title), localTs(x.start), n(x.durationMin), q(KIND[x.location] ?? 'video')]));

const sql = `-- Generated by web/scripts/gen-demo-seed.ts. Do not edit by hand; re-run the script instead.
-- Fills one coach's account with the demo workspace:  select public.load_demo_data('<coach user id>');

-- Stable ids per coach, so the same demo row always gets the same id for that coach.
create or replace function public._demo_id(c uuid, k text) returns uuid
language sql immutable as $$ select md5(c::text || ':' || k)::uuid $$;

create or replace function public.load_demo_data(c uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  -- A coach may load demo data into their own account only (the SQL editor runs as postgres).
  if c is distinct from (select auth.uid()) and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'You can only load demo data into your own account';
  end if;
  if not exists (select 1 from coaches where id = c) then
    raise exception 'No coach profile for %', c;
  end if;
  if exists (select 1 from trainees where coach_id = c) then
    raise exception 'This account already has trainees; demo data is only loaded into an empty account';
  end if;

${out.join('\n\n')}
end $$;

revoke execute on function public.load_demo_data(uuid) from public, anon;
grant execute on function public.load_demo_data(uuid) to authenticated;
`;

writeFileSync(new URL('../../supabase/seed.sql', import.meta.url), sql);
console.log(`seed.sql: ${s.trainees.length} trainees, ${s.templates.length} templates, ${s.logs.length} logs, ${s.logs.reduce((a, l) => a + l.entries.reduce((b, e) => b + e.sets.length, 0), 0)} sets, ${s.messages.length} messages, ${s.sessions.length} calls`);
