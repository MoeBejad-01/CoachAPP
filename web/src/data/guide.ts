// Defaults for a program's nutrition, recovery and instructions, and the
// macro maths the template builder shows as you type.

import type { GoalType, ProgramGuide } from './types';

const CALORIES: Record<GoalType, number> = { muscle: 2700, strength: 2800, fatloss: 1900, sport: 2600, rehab: 2300, health: 2200 };
const PROTEIN: Record<GoalType, number> = { muscle: 160, strength: 160, fatloss: 140, sport: 140, rehab: 130, health: 120 };

/** Fat at ~27% of calories, carbs fill the rest. */
export function macrosFor(calories: number, proteinG: number): { carbsG: number; fatG: number } {
  const fatG = Math.round((calories * 0.27) / 9);
  return { fatG, carbsG: Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4)) };
}

export const macroKcal = (p: number | null, c: number | null, f: number | null) => (p ?? 0) * 4 + (c ?? 0) * 4 + (f ?? 0) * 9;

export function nutritionFor(goal: GoalType): Pick<ProgramGuide, 'calories' | 'restCalories' | 'proteinG' | 'carbsG' | 'fatG' | 'waterL' | 'meals'> {
  const calories = CALORIES[goal];
  const proteinG = PROTEIN[goal];
  return { calories, restCalories: goal === 'fatloss' ? calories - 200 : null, proteinG, ...macrosFor(calories, proteinG), waterL: goal === 'sport' ? 3.5 : 3, meals: goal === 'muscle' ? 4 : 3 };
}

export function defaultGuide(goal: GoalType = 'health'): ProgramGuide {
  return {
    goal,
    level: 'intermediate',
    sessionMin: 60,
    equipment: ['gym'],
    ...nutritionFor(goal),
    nutritionNotes: '',
    sleepH: goal === 'rehab' || goal === 'sport' ? 8.5 : 8,
    steps: goal === 'fatloss' ? 10000 : 8000,
    cardioPerWeek: goal === 'fatloss' ? 3 : goal === 'health' ? 2 : 0,
    cardioMin: goal === 'fatloss' ? 25 : goal === 'health' ? 20 : null,
    cardioType: '',
    restDayNotes: '',
    instructions: '',
    warmup: '',
    deloadWeek: null,
  };
}

/** Fills in fields missing from guides saved by older versions. */
export const normalizeGuide = (g: Partial<ProgramGuide> | undefined, goal?: GoalType): ProgramGuide => ({ ...defaultGuide(g?.goal ?? goal), ...g });
