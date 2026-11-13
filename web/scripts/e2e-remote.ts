/**
 * End-to-end check of the app's data layer against a real PostgreSQL.
 *
 * Loads and saves a whole workspace through src/data/remote.ts and the real
 * @supabase/supabase-js client, so the migrations, Row Level Security, the
 * PostgREST wire format and our own mapping are all exercised together.
 * supabase/README.md explains how to bring up the database and API it needs.
 *
 *   npx tsx scripts/e2e-remote.ts <api-url> <coach-jwt> <coach-id> [trainee-jwt] [trainee-id]
 */

import { createClient } from '@supabase/supabase-js';
import { loadRemoteState, saveDiff } from '../src/data/remote';
import type { AppState } from '../src/data/types';

const [url, coachJwt, coachId, traineeJwt, traineeId] = process.argv.slice(2);
if (!url || !coachJwt || !coachId) throw new Error('usage: e2e-remote.ts <api-url> <coach-jwt> <coach-id> [trainee-jwt] [trainee-id]');

const client = (jwt: string) => createClient(url, jwt, { auth: { persistSession: false, autoRefreshToken: false } });

let passed = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, detail: unknown = '') {
  if (ok) { passed++; console.log(`  PASS  ${name}${detail ? `  (${String(detail)})` : ''}`); }
  else { failures.push(name); console.log(`  FAIL  ${name}  got: ${String(detail)}`); }
}

const uuid = () => crypto.randomUUID();

async function main() {
  const db = client(coachJwt);
  const ctx = { db, role: 'coach' as const, userId: coachId };

  console.log('\nLoading the workspace through remote.ts');
  const s1 = await loadRemoteState(db, 'coach', coachId);
  check('coach profile loaded', s1.coach.name.length > 0, s1.coach.name);
  check('every trainee loaded', s1.trainees.length === 32, s1.trainees.length);
  check('templates loaded', s1.templates.length === 6, s1.templates.length);
  check('workout logs loaded', s1.logs.length > 300, s1.logs.length);
  check('sets inside the logs loaded', s1.logs.some((l) => l.entries.some((e) => e.sets.length > 0)), s1.logs[0]?.entries.length);
  check('messages loaded', s1.messages.length > 0, s1.messages.length);
  const withProgram = s1.trainees.find((t) => t.program);
  check('a program came back with its weeks', (withProgram?.program?.plan.length ?? 0) > 0, withProgram?.program?.plan.length);
  check('memberships loaded', s1.trainees.every((t) => t.membership.plan !== ''), s1.trainees[0]?.membership.plan);
  check('pinned notes reached the coach', s1.trainees.some((t) => t.pinnedNote !== ''), 'coach-only field');

  console.log('\nSaving changes back');
  const target = s1.trainees[0];
  const next: AppState = {
    ...s1,
    trainees: s1.trainees.map((t) => (t.id === target.id ? { ...t, status: 'paused' as const, pinnedNote: 'e2e pinned note' } : t)),
    messages: [...s1.messages, { id: uuid(), traineeId: target.id, from: 'coach' as const, text: 'e2e: does this persist?', at: new Date().toISOString(), read: true, seen: false }],
    cardio: [...s1.cardio, { id: uuid(), traineeId: target.id, date: '2026-11-13', activity: 'run' as const, effort: 2, minutes: 31, distanceKm: 5.2, avgHr: 150 }],
    dailyLogs: [...s1.dailyLogs, { traineeId: target.id, date: '2026-11-13', sleepH: 7.5, waterMl: 2400, steps: 9120, stress: 2, soreness: 3, sorenessAreas: ['quads'], meals: [{ id: uuid(), type: 'breakfast' as const, text: 'Eggs and oats', kcal: 520, proteinG: 34 }] }],
    skips: [...s1.skips, { id: uuid(), traineeId: target.id, weekStart: '2026-11-09', date: '2026-11-12', dayId: 'd3', dayName: 'Upper B', reason: 'sick' as const, note: 'Sore throat', at: new Date().toISOString() }],
  };
  await saveDiff(ctx, s1, next);

  console.log('\nReloading to confirm it stuck');
  const s2 = await loadRemoteState(db, 'coach', coachId);
  const reloaded = s2.trainees.find((t) => t.id === target.id);
  check('status change persisted', reloaded?.status === 'paused', reloaded?.status);
  check('pinned note persisted', reloaded?.pinnedNote === 'e2e pinned note', reloaded?.pinnedNote);
  check('the message persisted', s2.messages.some((m) => m.text === 'e2e: does this persist?'), s2.messages.length);
  check('the cardio session persisted', s2.cardio.some((c) => c.minutes === 31 && c.distanceKm === 5.2), s2.cardio.length);
  check('the habit day persisted, meals and all', s2.dailyLogs.some((d) => d.steps === 9120 && d.meals[0]?.text === 'Eggs and oats'), s2.dailyLogs.length);
  check('the skipped session persisted', s2.skips.some((k) => k.dayName === 'Upper B' && k.reason === 'sick'), s2.skips.length);
  check('nothing else changed', s2.trainees.length === 32 && s2.templates.length === 6, `${s2.trainees.length}/${s2.templates.length}`);

  if (traineeJwt && traineeId) {
    console.log('\nLoading the same database as the trainee');
    const t = await loadRemoteState(client(traineeJwt), 'trainee', traineeId);
    check('the trainee sees only herself', t.trainees.length === 1, t.trainees.length);
    check('she sees no templates', t.templates.length === 0, t.templates.length);
    check('she sees no pinned note', t.trainees[0]?.pinnedNote === '', JSON.stringify(t.trainees[0]?.pinnedNote));
    check('she sees her own program', (t.trainees[0]?.program?.plan.length ?? 0) > 0, t.trainees[0]?.program?.plan.length);
    check('she sees her own logs only', t.logs.every((l) => l.traineeId === t.trainees[0]?.id), t.logs.length);
    check('she sees the chat with her coach', t.messages.length > 0, t.messages.length);
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
}

main().catch((e: unknown) => { console.error('\nharness error:', e); process.exit(1); });
