// Generates a realistic demo workspace relative to today's date, so the
// dashboard always looks "live". Deterministic: the same seed gives the same data.

import { addDays, dayOfWeek, daysBetween, stampAt, startOfWeek, todayISO } from '../lib/dates';
import { mulberry32, roundTo } from '../lib/util';
import { defaultLayout } from './layout';
import { buildPlan, daysOn } from './plan';
import { seedTemplates } from './templates';
import type {
  AppState, AssignedProgram, CheckIn, CoachingMode, Goal, GoalType, InBodyRequest, InBodyScan, LogEntry, Message, Note,
  Session, Template, Trainee, TraineeStatus, WeightEntry, WorkoutLog,
} from './types';

export const STATE_VERSION = 2;

export const WEEKDAY_SLOTS: Record<number, number[]> = {
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
};

interface Profile {
  first: string;
  last: string;
  mode: CoachingMode;
  status: TraineeStatus;
  goalType: GoalType;
  tpl: string | null;
  week: number;
  adh: number;
  strength: number;
  freq: number;
  birth: string;
  height: number;
  startKg: number;
  kgPerWeek: number;
  checkinDay?: number;
  lastDaysAgo?: number;
  missCheckins?: number;
  goals?: Omit<Goal, 'id'>[];
  injuries?: string;
  pinned?: string;
  cycle?: 'monthly' | 'quarterly';
  unpaid?: boolean;
  painOn?: string;
}

const PROFILES: Profile[] = [
  { first: 'Layla', last: 'Mansour', mode: 'online', status: 'active', goalType: 'muscle', tpl: 'tpl-hyp4', week: 6, adh: 0.95, strength: 1, freq: 4, birth: '1999-03-14', height: 165, startKg: 57.8, kgPerWeek: 0.16, lastDaysAgo: 0,
    goals: [{ label: 'Reach 62 kg body weight', unit: 'kg', start: 57.8, current: 59.4, target: 62 }, { label: 'Hip thrust 150 kg × 5', unit: 'kg', start: 110, current: 140, target: 150 }],
    injuries: 'Occasional left hip tightness on lunges.', pinned: 'Lean bulk. 2,250 kcal on training days, 125 g protein. Watch left hip on lunges.' },
  { first: 'Marcus', last: 'Lindqvist', mode: 'inperson', status: 'active', goalType: 'strength', tpl: 'tpl-pl', week: 7, adh: 0.98, strength: 2.1, freq: 4, birth: '1993-08-02', height: 182, startKg: 92.5, kgPerWeek: -0.05, lastDaysAgo: 0,
    goals: [{ label: 'Meet total 600 kg', unit: 'kg', start: 560, current: 585, target: 600 }, { label: 'Make weight under 93 kg', unit: 'kg', start: 94.2, current: 92.1, target: 93 }],
    pinned: 'Meet in 3 weeks. Openers: 200 / 135 / 245. No new exercises until after the meet.' },
  { first: 'Sara', last: 'Al-Qahtani', mode: 'online', status: 'active', goalType: 'fatloss', tpl: 'tpl-fat', week: 9, adh: 0.66, strength: 0.9, freq: 4, birth: '1991-11-20', height: 162, startKg: 74.0, kgPerWeek: -0.35, lastDaysAgo: 4, missCheckins: 2,
    goals: [{ label: 'Lose 6 kg', unit: 'kg', start: 74, current: 70.9, target: 68 }, { label: '9,000 steps per day', unit: 'steps', start: 5200, current: 7800, target: 9000 }],
    pinned: 'Travels for work 1–2 weeks a month. Keep a hotel-gym version of each session ready.' },
  { first: 'Daniel', last: 'Okafor', mode: 'online', status: 'active', goalType: 'strength', tpl: 'tpl-str3', week: 3, adh: 0.9, strength: 1.7, freq: 3, birth: '1996-05-09', height: 178, startKg: 84, kgPerWeek: 0.05, lastDaysAgo: 1,
    goals: [{ label: 'First 180 kg deadlift', unit: 'kg', start: 155, current: 170, target: 180 }],
    injuries: 'Lower-back strain in 2023. Prefers trap-bar for heavy pulls.', pinned: 'Lower-back history. Prefers trap-bar for heavy pulls.' },
  { first: 'Khalid', last: 'Al-Harbi', mode: 'hybrid', status: 'active', goalType: 'sport', tpl: 'tpl-ath', week: 4, adh: 0.92, strength: 1.6, freq: 4, birth: '2001-01-27', height: 184, startKg: 79, kgPerWeek: 0.05, lastDaysAgo: 0,
    goals: [{ label: 'Vertical jump +8 cm', unit: 'cm', start: 58, current: 62, target: 66 }, { label: '20 m sprint under 2.9 s', unit: 's', start: 3.12, current: 3.01, target: 2.9 }],
    pinned: 'Pre-season starts in January. Keep sprint volume low on match weeks.' },
  { first: 'Yousef', last: 'Haddad', mode: 'online', status: 'active', goalType: 'muscle', tpl: 'tpl-hyp4', week: 11, adh: 0.6, strength: 1.4, freq: 4, birth: '1994-07-15', height: 176, startKg: 72, kgPerWeek: 0.08, lastDaysAgo: 6,
    goals: [{ label: 'Add 4 kg lean mass', unit: 'kg', start: 72, current: 73.1, target: 76 }] },
  { first: 'Priya', last: 'Raman', mode: 'hybrid', status: 'active', goalType: 'rehab', tpl: 'tpl-rtt', week: 2, adh: 0.82, strength: 0.8, freq: 3, birth: '1997-09-30', height: 160, startKg: 58, kgPerWeek: 0, lastDaysAgo: 2,
    goals: [{ label: 'Pain-free squat to parallel', unit: '/10 pain', start: 4, current: 1, target: 0 }],
    injuries: 'ACL reconstruction (left), March. Physio cleared loaded squats to parallel.', pinned: 'Post-ACL (left). Physio cleared loaded squats to parallel.' },
  { first: 'Hana', last: 'Sato', mode: 'inperson', status: 'active', goalType: 'strength', tpl: 'tpl-str3', week: 5, adh: 0.86, strength: 0.85, freq: 3, birth: '1995-04-11', height: 158, startKg: 58, kgPerWeek: 0, lastDaysAgo: 1,
    goals: [{ label: 'Bench press bodyweight (58 kg)', unit: 'kg', start: 42.5, current: 52.5, target: 58 }] },
  { first: 'Ali', last: 'Rahimi', mode: 'online', status: 'active', goalType: 'sport', tpl: 'tpl-ath', week: 8, adh: 0.78, strength: 1.3, freq: 4, birth: '1990-12-03', height: 175, startKg: 74, kgPerWeek: -0.1, lastDaysAgo: 3, painOn: 'Bulgarian split squat',
    goals: [{ label: 'Half marathon under 1:45', unit: 'min', start: 118, current: 109, target: 105 }] },
  { first: 'Nora', last: 'Abdullah', mode: 'hybrid', status: 'onboarding', goalType: 'fatloss', tpl: 'tpl-fat', week: 0, adh: 0, strength: 0.8, freq: 3, birth: '1998-06-21', height: 167, startKg: 81, kgPerWeek: 0,
    goals: [{ label: 'Train 3× per week for 8 weeks', unit: 'weeks', start: 0, current: 0, target: 8 }] },
  { first: 'Emily', last: 'Carter', mode: 'online', status: 'paused', goalType: 'health', tpl: 'tpl-str3', week: 4, adh: 0.7, strength: 0.75, freq: 3, birth: '2003-02-17', height: 170, startKg: 63, kgPerWeek: 0, lastDaysAgo: 23,
    pinned: 'Paused for exams until mid-November.' },
  { first: 'Tomás', last: 'Rivera', mode: 'online', status: 'inactive', goalType: 'muscle', tpl: 'tpl-hyp4', week: 2, adh: 0.55, strength: 1.2, freq: 4, birth: '1992-10-08', height: 180, startKg: 82, kgPerWeek: 0, lastDaysAgo: 41, unpaid: true },
];

const FIRST = ['Omar', 'Lina', 'James', 'Fatima', 'Lucas', 'Mei', 'Rami', 'Chloe', 'Faisal', 'Aisha', 'Noah', 'Reem', 'Ethan', 'Dana', 'Samir', 'Grace', 'Ibrahim', 'Maya', 'Tariq', 'Zoe'];
const LAST = ['Saleh', 'Nguyen', 'Walker', 'Zahran', 'Martin', 'Chen', 'Khoury', 'Dubois', 'Al-Otaibi', 'Hassan', 'Brooks', 'Al-Shehri', 'Clarke', 'Barakat', 'Farouk', 'Hughes', 'Yilmaz', 'Petrov', 'Aziz', 'Silva'];
const GOAL_TPL: Record<GoalType, string> = { muscle: 'tpl-hyp4', strength: 'tpl-str3', fatloss: 'tpl-fat', sport: 'tpl-ath', rehab: 'tpl-rtt', health: 'tpl-str3' };
const GOAL_TYPES: GoalType[] = ['muscle', 'strength', 'fatloss', 'muscle', 'health', 'sport', 'fatloss', 'strength'];

function generatedProfiles(rand: () => number): Profile[] {
  return FIRST.map((first, i) => {
    const goalType = GOAL_TYPES[i % GOAL_TYPES.length];
    const tpl = GOAL_TPL[goalType];
    const female = i % 2 === 1;
    const inactive = i === 6 || i === 13 || i === 17;
    const paused = i === 9 || i === 15;
    const startKg = roundTo((female ? 58 : 76) + rand() * 18, 0.1);
    return {
      first,
      last: LAST[(i * 7) % LAST.length],
      mode: (['online', 'online', 'hybrid', 'inperson'] as CoachingMode[])[i % 4],
      status: inactive ? 'inactive' : paused ? 'paused' : 'active',
      goalType,
      tpl,
      week: 1 + Math.floor(rand() * 7),
      adh: 0.8 + rand() * 0.18,
      strength: (female ? 0.75 : 1.25) + rand() * 0.5,
      freq: tpl === 'tpl-str3' ? 3 : 4,
      birth: `${1985 + Math.floor(rand() * 18)}-0${1 + Math.floor(rand() * 9)}-1${Math.floor(rand() * 9)}`,
      height: female ? 158 + Math.floor(rand() * 14) : 172 + Math.floor(rand() * 16),
      startKg,
      kgPerWeek: goalType === 'fatloss' ? -0.3 : goalType === 'muscle' ? 0.12 : 0,
      lastDaysAgo: inactive ? 32 + Math.floor(rand() * 30) : paused ? 15 + Math.floor(rand() * 10) : Math.floor(rand() * 3),
      cycle: rand() > 0.7 ? 'quarterly' : 'monthly',
      checkinDay: [0, 1, 0, 5, 6, 0][i % 6],
    };
  });
}

// Reference working loads (kg) for an intermediate lifter; scaled by Profile.strength.
const BASE_LOADS: [RegExp, number][] = [
  [/back-off/i, 150], [/back squat|box squat/i, 72], [/front squat/i, 58], [/belt squat/i, 80], [/goblet/i, 20],
  [/close-grip/i, 42], [/paused bench/i, 50], [/bench press/i, 48], [/incline db/i, 15], [/db bench/i, 16],
  [/conventional deadlift/i, 105], [/block pull/i, 110], [/trap-bar/i, 90], [/romanian|single-leg rdl/i, 60],
  [/hip thrust/i, 115], [/leg press/i, 130], [/overhead press/i, 32], [/shoulder press/i, 12],
  [/chest-supported row|barbell row/i, 40], [/cable row|seated cable/i, 30], [/lat pulldown/i, 42],
  [/lateral raise/i, 5], [/curl/i, 20], [/leg curl/i, 32], [/calf/i, 40], [/lunge|split squat|step-up/i, 14],
  [/hang power clean/i, 55], [/weighted pull-up/i, 5], [/med-ball/i, 6],
];

function baseLoad(name: string): number {
  if (/pull-up|chin-up|push-up|plank|dead bug|nordic|box jump|sprint|bike|walk|rower|sled|hold|pull-apart/i.test(name) && !/weighted/i.test(name)) return 0;
  for (const [re, kg] of BASE_LOADS) if (re.test(name)) return kg;
  return 20;
}

function repRange(reps: string): [number, number] {
  const m = reps.match(/(\d+)(?:\s*[–-]\s*(\d+))?/);
  if (!m) return [8, 8];
  const lo = Number(m[1]);
  return [lo, m[2] ? Number(m[2]) : lo];
}

const ENTRY_NOTES = ['Felt smooth today.', 'Grip was the limit on the last set.', 'Moved well, could add weight next week.', 'A bit tired from work, kept it controlled.', 'Used the other machine, it was taken.'];
const CHECKIN_COMMENTS = [
  'Good week overall. Sleep was a bit short midweek.', 'Felt strong. Appetite is up, easier to hit protein.', 'Busy at work but got every session in.',
  'Quite sore after the leg days, recovering fine.', 'Energy was low on Thursday, otherwise great.', 'Loving the program, sessions feel productive.',
  'Struggled with nutrition on the weekend.', 'Best week so far!',
];

function buildProgram(tpl: Template, startDate: string, p: Profile): AssignedProgram {
  // Targets follow the profile's weight trend; ids are fixed so the seed stays deterministic.
  const plan = buildPlan(tpl.days, tpl.weeks, { goalType: p.goalType, startKg: p.startKg, kgPerWeek: p.kgPerWeek })
    .map((w, wi) => ({ ...w, id: `w${wi + 1}`, days: w.days.map((d, di) => ({ ...d, id: tpl.days[di].id, exercises: d.exercises.map((e, ei) => ({ ...e, id: tpl.days[di].exercises[ei].id })) })) }));
  plan[0].targets.focus = 'Technique and starting loads. Leave 2–3 reps in the tank.';
  return { templateId: tpl.id, name: tpl.name, startDate, weeks: plan.length, plan };
}

export function createSeed(): AppState {
  const rand = mulberry32(20261030);
  const today = todayISO();
  const templates = seedTemplates(new Date().toISOString());
  const tplById = new Map(templates.map((t) => [t.id, t]));
  const profiles = [...PROFILES, ...generatedProfiles(rand)];

  const trainees: Trainee[] = [];
  const logs: WorkoutLog[] = [];
  const weights: WeightEntry[] = [];
  const checkins: CheckIn[] = [];

  profiles.forEach((p, idx) => {
    const id = `t${idx + 1}`;
    const tpl = p.tpl ? tplById.get(p.tpl)! : null;
    const programStart = p.status === 'onboarding' ? addDays(startOfWeek(today), 7) : addDays(startOfWeek(today), -7 * Math.max(0, p.week - 1));
    const joinedAt = p.status === 'onboarding' ? addDays(today, -2) : addDays(programStart, -Math.floor(rand() * 50));
    const program = tpl ? buildProgram(tpl, programStart, p) : null;
    const lastActive = p.lastDaysAgo !== undefined ? addDays(today, -p.lastDaysAgo) : today;
    const slots = WEEKDAY_SLOTS[p.freq] ?? WEEKDAY_SLOTS[3];

    // Workout logs for the current program, with gentle weekly progression.
    if (program && p.status !== 'onboarding') {
      const traineeLogs: WorkoutLog[] = [];
      for (let d = programStart; d <= lastActive; d = addDays(d, 1)) {
        const slot = slots.indexOf(dayOfWeek(d));
        if (slot === -1) continue;
        const forced = d === lastActive && p.lastDaysAgo !== undefined;
        if (!forced && rand() > p.adh) continue;
        const wd = daysOn(program, d);
        const day = wd[slot % wd.length];
        const weekIdx = Math.floor(daysBetween(programStart, d) / 7);
        const entries: LogEntry[] = day.exercises.map((ex) => {
          const base = baseLoad(ex.name) * p.strength;
          const load = base > 0 ? roundTo(base * (1 + 0.015 * weekIdx), base < 25 ? 1 : 2.5) : 0;
          const [lo, hi] = repRange(ex.reps);
          const sets = Array.from({ length: ex.sets }, (_, s) => ({
            weight: load,
            reps: Math.max(1, Math.round(hi - (hi - lo) * (s / Math.max(1, ex.sets - 1)) - (rand() < 0.15 ? 1 : 0))),
          }));
          const entry: LogEntry = { exerciseId: ex.id, exerciseName: ex.name, sets };
          if (rand() < 0.05) entry.note = ENTRY_NOTES[Math.floor(rand() * ENTRY_NOTES.length)];
          return entry;
        });
        traineeLogs.push({ id: `${id}-l${traineeLogs.length + 1}`, traineeId: id, date: d, dayName: day.name, durationMin: 45 + Math.floor(rand() * 25), rpe: 7 + Math.round(rand() * 2), entries });
      }
      if (p.painOn) {
        const hit = [...traineeLogs].reverse().find((l) => l.entries.some((e) => e.exerciseName === p.painOn));
        const entry = hit?.entries.find((e) => e.exerciseName === p.painOn);
        if (entry) {
          entry.pain = true;
          entry.note = 'Sharp pain on the inside of the right knee on set 3, stopped there.';
          entry.sets = entry.sets.slice(0, 3);
          entry.sets[2] = { ...entry.sets[2], reps: Math.max(1, entry.sets[2].reps - 3) };
        }
      }
      logs.push(...traineeLogs);
    }

    // Body weight every other day, trending toward the goal.
    for (let d = joinedAt; d <= lastActive; d = addDays(d, 2)) {
      const weeksIn = daysBetween(joinedAt, d) / 7;
      weights.push({ traineeId: id, date: d, kg: roundTo(p.startKg + p.kgPerWeek * weeksIn + (rand() - 0.5) * 0.6, 0.1) });
    }

    // Weekly check-ins on the trainee's check-in day.
    const checkinDay = p.checkinDay ?? 0;
    const due: string[] = [];
    for (let d = addDays(joinedAt, 6); d <= lastActive; d = addDays(d, 1)) if (dayOfWeek(d) === checkinDay) due.push(d);
    due.slice(0, due.length - (p.missCheckins ?? 0)).forEach((d, i) => {
      const w = weights.filter((x) => x.traineeId === id && x.date <= d).at(-1);
      checkins.push({
        id: `${id}-c${i + 1}`, traineeId: id, date: d, weightKg: w?.kg ?? p.startKg,
        sleepH: roundTo(6.3 + rand() * 1.6, 0.1), energy: 3 + Math.round(rand() * 2), stress: 1 + Math.round(rand() * 2), soreness: 2 + Math.round(rand() * 2),
        comment: CHECKIN_COMMENTS[Math.floor(rand() * CHECKIN_COMMENTS.length)],
      });
    });

    const goals: Goal[] = (p.goals ?? defaultGoals(p)).map((g, i) => ({ ...g, id: `${id}-g${i + 1}` }));
    const lastLog = logs.filter((l) => l.traineeId === id).at(-1);
    const price = p.mode === 'online' ? 150 : p.mode === 'hybrid' ? 280 : 420;
    const cycle = p.cycle ?? 'monthly';

    trainees.push({
      id, firstName: p.first, lastName: p.last,
      email: `${p.first}.${p.last}`.toLowerCase().normalize('NFD').replace(/[^a-z.]/g, '') + '@example.com',
      phone: `+1 555 01${String(idx).padStart(2, '0')}`,
      birthDate: p.birth, heightCm: p.height, mode: p.mode, status: p.status, goalType: p.goalType, goals,
      injuries: p.injuries ?? '', frequency: p.freq, checkinDay, joinedAt,
      lastSeenAt: lastLog ? new Date(`${lastLog.date}T${String(17 + (idx % 4)).padStart(2, '0')}:20:00`).toISOString() : stampAt(2, 10, 0),
      tone: idx % 6, program,
      membership: {
        plan: `${p.mode === 'online' ? 'Online coaching' : p.mode === 'hybrid' ? 'Hybrid · 2 sessions/week' : 'In person · 3 sessions/week'}`,
        price: cycle === 'quarterly' ? price * 3 * 0.9 : price, cycle,
        renewsOn: addDays(today, 1 + ((idx * 5) % 28)),
        paid: !p.unpaid && p.status !== 'inactive',
      },
      pinnedNote: p.pinned ?? '',
    });
  });

  // Nicer "today" for the hero trainee: a PR on hip thrust.
  const layla = logs.filter((l) => l.traineeId === 't1').at(-1);
  const thrust = layla?.entries.find((e) => e.exerciseName === 'Barbell hip thrust');
  if (thrust) {
    thrust.sets = thrust.sets.map((s) => ({ ...s, weight: 140, reps: 6 }));
    thrust.note = 'Felt amazing, could have done 7 on the first set.';
  }

  return {
    version: STATE_VERSION,
    coach: { name: 'Omar Haddad', title: 'Head coach', email: 'omar@coachhq.example', businessName: 'Coach HQ', currency: 'USD' },
    trainees,
    templates,
    logs,
    weights,
    checkins,
    notes: seedNotes(),
    messages: seedMessages(),
    sessions: seedSessions(trainees, today),
    traineeLayout: defaultLayout(),
    ...seedInBody(trainees, weights, today, rand),
    metricEntries: [],
    cardio: [],
    dailyLogs: [],
    skips: [],
    widgets: { kpis: true, attention: true, sessions: true, messages: true, roster: true, adherence: true, prs: true, renewals: false },
  };
}

/** InBody scans roughly every four weeks, following each trainee's weight trend. */
function seedInBody(trainees: Trainee[], weights: WeightEntry[], today: string, rand: () => number): Pick<AppState, 'inbody' | 'inbodyRequests'> {
  const inbody: InBodyScan[] = [];
  const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
  for (const t of trainees) {
    if (t.status === 'onboarding') continue;
    const own = weights.filter((w) => w.traineeId === t.id).sort((a, b) => a.date.localeCompare(b.date));
    if (own.length === 0) continue;
    const start = own[0].date;
    const dates: string[] = [];
    for (let d = start; d <= today; d = addDays(d, 28)) dates.push(d);
    let fatPct = t.goalType === 'fatloss' ? 31 + rand() * 4 : t.goalType === 'muscle' ? 19 + rand() * 4 : 21 + rand() * 5;
    let muscleShare = 0.42 + rand() * 0.04;
    dates.forEach((date, i) => {
      const kg = (own.find((w) => w.date >= date) ?? own.at(-1)!).kg;
      if (i > 0) {
        fatPct += t.goalType === 'fatloss' ? -(0.9 + rand() * 0.6) : t.goalType === 'muscle' ? 0.1 - rand() * 0.4 : -(rand() * 0.5);
        muscleShare += t.goalType === 'muscle' || t.goalType === 'strength' ? 0.004 + rand() * 0.004 : 0.002 * rand();
      }
      const fatKg = (kg * fatPct) / 100;
      const lean = kg - fatKg;
      inbody.push({
        id: `ib-${t.id}-${i + 1}`, traineeId: t.id, date,
        weightKg: round(kg), muscleKg: round(kg * muscleShare), fatKg: round(fatKg), fatPct: round(fatPct),
        bmi: round(kg / (t.heightCm / 100) ** 2), visceral: Math.max(1, Math.round(fatPct / 3.2)), bmr: Math.round(370 + 21.6 * lean),
        waterL: round(lean * 0.73), score: Math.max(55, Math.min(95, Math.round(70 + (muscleShare - 0.42) * 300 - (fatPct - 20) * 0.8))),
        file: { name: `InBody_${t.firstName}_${date}.pdf`, type: 'application/pdf' }, source: 'trainee',
      });
    });
  }
  const inbodyRequests: InBodyRequest[] = [
    { id: 'ibr1', traineeId: 't1', requestedAt: stampAt(1, 9, 30), note: 'Monthly scan, morning before breakfast please.', status: 'pending' },
    { id: 'ibr2', traineeId: 't3', requestedAt: stampAt(5, 18, 0), note: '', status: 'pending' },
  ];
  return { inbody, inbodyRequests };
}

function defaultGoals(p: Profile): Omit<Goal, 'id'>[] {
  switch (p.goalType) {
    case 'fatloss': return [{ label: `Reach ${roundTo(p.startKg - 5, 0.5)} kg`, unit: 'kg', start: p.startKg, current: roundTo(p.startKg - 1.8, 0.1), target: roundTo(p.startKg - 5, 0.5) }];
    case 'muscle': return [{ label: `Reach ${roundTo(p.startKg + 4, 0.5)} kg`, unit: 'kg', start: p.startKg, current: roundTo(p.startKg + 1.2, 0.1), target: roundTo(p.startKg + 4, 0.5) }];
    case 'strength': return [{ label: 'Squat 1.5× bodyweight', unit: 'kg', start: roundTo(p.startKg, 2.5), current: roundTo(p.startKg * 1.25, 2.5), target: roundTo(p.startKg * 1.5, 2.5) }];
    default: return [{ label: 'Train consistently for 12 weeks', unit: 'weeks', start: 0, current: p.week, target: 12 }];
  }
}

function seedNotes(): Note[] {
  const n = (traineeId: string, daysAgo: number, shared: boolean, text: string, i: number): Note => ({ id: `n${i}`, traineeId, at: stampAt(daysAgo, 12, 0), shared, text });
  return [
    n('t1', 0, true, 'Great hip thrust PR. Next week we add a 4th set and keep load at 140 kg. Aim for 7+ reps on all sets before going up.', 1),
    n('t1', 4, false, 'Left hip tightness on lunges. Swap to reverse lunges if it shows up in two consecutive sessions.', 2),
    n('t1', 12, true, 'Calories up to 2,250 on training days (protein 125 g). Weigh in daily, we only track the weekly average.', 3),
    n('t2', 1, true, 'Openers locked: 200 / 135 / 245. Attempt selection meeting next Saturday.', 4),
    n('t3', 3, false, 'Two missed check-ins. Reach out with a shorter travel plan before she drops off.', 5),
    n('t4', 2, true, 'Swap conventional deadlift for trap-bar on heavy days if the back feels tight. Send video of the top set.', 6),
    n('t7', 5, true, 'Box squat to parallel is cleared. Stop the set if pain goes above 3/10.', 7),
    n('t9', 3, false, 'Knee pain flagged on split squats. Review video and consider swapping to step-ups this week.', 8),
  ];
}

function seedMessages(): Message[] {
  const out: Message[] = [];
  const add = (traineeId: string, from: 'coach' | 'trainee', daysAgo: number, hh: number, mm: number, text: string, read = true) =>
    out.push({ id: `m${out.length + 1}`, traineeId, from, text, at: stampAt(daysAgo, hh, mm), read: from === 'coach' ? true : read });

  add('t3', 'coach', 6, 18, 30, 'Hi Sara, how did the week go? Your check-in is due tonight.');
  add('t3', 'trainee', 0, 8, 10, 'Morning coach. Sorry I went quiet, travelling for work this week.', false);
  add('t3', 'trainee', 0, 8, 12, 'Can we swap Thursday for a hotel gym session? They only have dumbbells up to 25 kg and a bike.', false);
  add('t4', 'trainee', 1, 19, 2, 'Deadlift felt heavy today but all reps were clean.');
  add('t4', 'trainee', 0, 7, 40, 'Last set of RDLs felt heavy on the lower back. Should I drop the weight next time?', false);
  add('t7', 'coach', 1, 17, 20, 'How did the box squats feel today? Any pain during or after?');
  add('t7', 'trainee', 1, 18, 5, 'Knee felt great on the box squats! 0/10 pain, a bit of soreness in the quads.', false);
  add('t1', 'trainee', 0, 10, 48, 'Hip thrust 140 × 6!! First time ever.');
  add('t1', 'coach', 0, 11, 2, 'Huge PR! Next week we add a fourth set at 140.');
  add('t5', 'trainee', 2, 20, 14, 'Match on Saturday. Should I skip Friday speed work?');
  add('t5', 'coach', 2, 20, 30, 'Yes, swap it for 20 min mobility and a few strides only.');
  add('t9', 'trainee', 3, 19, 45, 'Had some knee pain on the split squats, stopped after set 3.', false);
  add('t11', 'trainee', 23, 14, 22, 'I need to pause for a few weeks for exams. Back mid-November.');
  add('t11', 'coach', 23, 15, 0, 'Of course, good luck! I have paused your plan and billing.');
  add('t2', 'coach', 1, 9, 0, 'Squat looked fast today. Same plan tomorrow.');
  add('t2', 'trainee', 1, 9, 15, 'Thanks coach, feeling ready.');
  return out;
}

function seedSessions(trainees: Trainee[], today: string): Session[] {
  const sessions: Session[] = [];
  const times = ['07:00', '09:30', '12:00', '16:00', '17:30', '19:00'];
  const weekStart = startOfWeek(today);
  trainees
    .filter((t) => (t.mode === 'inperson' || t.mode === 'hybrid') && (t.status === 'active' || t.status === 'onboarding') && t.program)
    .forEach((t, i) => {
      const slots = (WEEKDAY_SLOTS[t.frequency] ?? WEEKDAY_SLOTS[3]).slice(0, t.mode === 'hybrid' ? 2 : 3);
      for (let d = weekStart; d <= addDays(weekStart, 13); d = addDays(d, 1)) {
        const slot = slots.indexOf(dayOfWeek(d));
        if (slot === -1) continue;
        const wd = daysOn(t.program!, d);
        const day = wd[slot % wd.length];
        sessions.push({
          id: `s${sessions.length + 1}`, traineeId: t.id, title: day.name,
          start: `${d}T${times[(i + slot) % times.length]}:00`, durationMin: 60,
          location: t.mode === 'inperson' ? 'In person' : i % 2 ? 'Remote' : 'In person',
        });
      }
    });
  sessions.push({ id: `s${sessions.length + 1}`, traineeId: 't10', title: 'Onboarding & movement screen', start: `${today}T19:00:00`, durationMin: 60, location: 'In person' });
  sessions.push({ id: `s${sessions.length + 1}`, traineeId: 't1', title: 'Monthly progress review', start: `${today}T12:00:00`, durationMin: 30, location: 'Video call' });
  sessions.push({ id: `s${sessions.length + 1}`, traineeId: null, title: 'Admin: program reviews', start: `${addDays(today, 1)}T08:00:00`, durationMin: 90, location: 'Remote' });
  return sessions;
}
