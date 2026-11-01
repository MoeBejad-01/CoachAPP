// Weekly program structure: each week of an assigned program has its own
// targets (body weight, sleep, nutrition, steps) and its own training days.

import { addDays, daysBetween } from '../lib/dates';
import { uid } from '../lib/util';
import type { AssignedProgram, GoalType, ProgramDay, ProgramGuide, ProgramWeek, Trainee, WeekTargets } from './types';

const CALORIES: Record<GoalType, number> = { muscle: 2700, strength: 2800, fatloss: 1900, sport: 2600, rehab: 2300, health: 2200 };
const PROTEIN: Record<GoalType, number> = { muscle: 160, strength: 160, fatloss: 140, sport: 140, rehab: 130, health: 120 };

export interface PlanBasis {
  goalType: GoalType;
  /** Body weight at the start and the expected weekly change, if known. */
  startKg?: number | null;
  kgPerWeek?: number;
}

export function cloneDays(days: ProgramDay[]): ProgramDay[] {
  return days.map((d) => ({ ...d, id: uid('d'), exercises: d.exercises.map((e) => ({ ...e, id: uid('e') })) }));
}

export function defaultTargets(basis: PlanBasis, weekIdx: number): WeekTargets {
  const kg = basis.startKg ? Math.round((basis.startKg + (basis.kgPerWeek ?? 0) * (weekIdx + 1)) * 10) / 10 : null;
  return {
    bodyWeightKg: kg,
    sleepH: basis.goalType === 'rehab' || basis.goalType === 'sport' ? 8.5 : 8,
    calories: CALORIES[basis.goalType],
    proteinG: PROTEIN[basis.goalType],
    steps: basis.goalType === 'fatloss' ? 10000 : 8000,
    focus: '',
  };
}

/** Weekly targets start from the template's guide when there is one; body weight follows the trainee. */
export function buildPlan(days: ProgramDay[], weeks: number, basis: PlanBasis, guide?: ProgramGuide): ProgramWeek[] {
  return Array.from({ length: Math.max(1, weeks) }, (_, i) => {
    const base = defaultTargets(basis, i);
    const targets: WeekTargets = guide
      ? { ...base, calories: guide.calories ?? base.calories, proteinG: guide.proteinG ?? base.proteinG, sleepH: guide.sleepH ?? base.sleepH, steps: guide.steps ?? base.steps, focus: guide.deloadWeek === i + 1 ? 'Deload week: same exercises, about 40% fewer sets and lighter loads.' : '' }
      : base;
    return { id: uid('w'), targets, days: cloneDays(days) };
  });
}

/** Basis for targets from a trainee's goals (a kg goal sets the weight trend; otherwise hold current weight). */
export function basisFor(t: Pick<Trainee, 'goalType' | 'goals'>, weeks: number, currentKg?: number | null): PlanBasis {
  const g = t.goals.find((x) => x.unit === 'kg' && /weight|reach|lose|make weight|وزن/i.test(x.label));
  if (g) return { goalType: t.goalType, startKg: g.current, kgPerWeek: (g.target - g.current) / Math.max(1, weeks) };
  return { goalType: t.goalType, startKg: currentKg ?? null, kgPerWeek: 0 };
}

export function latestKg(weights: { traineeId: string; date: string; kg: number }[], traineeId: string): number | null {
  let best: { date: string; kg: number } | null = null;
  for (const w of weights) if (w.traineeId === traineeId && (!best || w.date > best.date)) best = w;
  return best?.kg ?? null;
}

/** Index of the program week a date falls in, clamped to the plan. */
export function weekIndex(p: AssignedProgram, date: string): number {
  const i = Math.floor(daysBetween(p.startDate, date) / 7);
  return Math.max(0, Math.min(p.plan.length - 1, i));
}

export function weekRange(p: AssignedProgram, i: number): { start: string; end: string } {
  const start = addDays(p.startDate, i * 7);
  return { start, end: addDays(start, 6) };
}

export const daysOn = (p: AssignedProgram, date: string): ProgramDay[] => p.plan[weekIndex(p, date)]?.days ?? [];

/** Older saved programs had one list of days repeated every week. */
export function migrateProgram(p: AssignedProgram & { days?: ProgramDay[] }, t: Pick<Trainee, 'goalType' | 'goals'>, currentKg: number | null): AssignedProgram {
  if (p.plan?.length) return p;
  const { days = [], ...rest } = p;
  const plan = buildPlan(days, p.weeks, basisFor(t, p.weeks, currentKg));
  return { ...rest, plan, weeks: plan.length };
}
