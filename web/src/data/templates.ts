import { defaultGuide } from './guide';
import type { Equipment, GoalType, Level, ProgramDay, ProgramGuide, Template } from './types';

const g = (goal: GoalType, level: Level, sessionMin: number, equipment: Equipment[], rest: Partial<ProgramGuide>): ProgramGuide =>
  ({ ...defaultGuide(goal), level, sessionMin, equipment, ...rest });

type Row = [name: string, sets: number, reps: string, intensity: string, rest: string, cue?: string];

function day(id: string, name: string, rows: Row[]): ProgramDay {
  return {
    id,
    name,
    exercises: rows.map(([n, sets, reps, intensity, rest, cue], i) => ({
      id: `${id}-e${i + 1}`,
      name: n,
      sets,
      reps,
      intensity,
      rest,
      cue: cue ?? '',
    })),
  };
}

export function seedTemplates(updatedAt: string): Template[] {
  return [
    {
      id: 'tpl-hyp4',
      name: 'Hypertrophy · 4-day split',
      summary: 'Upper/lower split with double progression and a deload in week 7.',
      tags: ['Intermediate', 'Gym'],
      weeks: 12,
      loadMethod: 'RPE + kg target',
      progression: 'Double progression',
      guide: g('muscle', 'intermediate', 60, ['gym'], {
        cardioPerWeek: 2, cardioMin: 20, cardioType: 'Incline walk or bike, easy pace',
        nutritionNotes: 'Small surplus. Hit protein every day; most carbs around training. One portion of fruit or veg with each meal.',
        restDayNotes: 'Walk, stretch hips and upper back for 10 minutes. Keep protein the same, carbs a little lower.',
        instructions: 'Leave 1–2 reps in reserve on every set unless the sheet says otherwise. When you hit the top of the rep range on all sets, add 2.5 kg next time. Log every set in the app.',
        warmup: '5 min easy cardio, then 2–3 ramp-up sets of the first lift.',
        deloadWeek: 7,
      }),
      updatedAt,
      days: [
        day('hyp-ua', 'Upper A', [
          ['Barbell bench press', 4, '6–8', 'RPE 8', '2:30', '2s eccentric, touch & press'],
          ['Chest-supported row', 4, '8–10', 'RPE 8', '2:00', 'Pause at the top'],
          ['Seated DB shoulder press', 3, '8–10', 'RPE 8', '1:30', 'Neutral grip'],
          ['Lat pulldown', 3, '10–12', 'RPE 8', '1:30', 'Full stretch each rep'],
          ['Cable lateral raise', 3, '12–15', 'RPE 9', '1:00', 'Lead with the elbow'],
        ]),
        day('hyp-la', 'Lower A', [
          ['Back squat', 4, '5–6', 'RPE 8', '3:00', 'Belt on top set only'],
          ['Romanian deadlift', 3, '8', 'RPE 7', '2:00', 'Bar close, hips back'],
          ['Leg press', 3, '10–12', 'RPE 8', '1:30', 'Feet mid-platform'],
          ['Seated calf raise', 4, '12–15', 'RPE 9', '1:00', 'Pause in the stretch'],
        ]),
        day('hyp-ub', 'Upper B', [
          ['Weighted pull-up', 4, '4–6', 'RPE 8', '2:30', 'Dead hang start'],
          ['Incline DB press', 3, '8–10', 'RPE 8', '2:00', '30° bench'],
          ['Single-arm cable row', 3, '10–12', 'RPE 8', '1:30', 'Reach long, pull to hip'],
          ['EZ-bar curl', 3, '10–12', 'RPE 9', '1:00', 'No swing'],
        ]),
        day('hyp-lb', 'Lower B', [
          ['Barbell hip thrust', 3, '6–8', 'RPE 8', '2:00', 'Chin tucked, 1s lockout'],
          ['Trap-bar deadlift', 4, '5', 'RPE 7', '2:30', 'Push the floor away'],
          ['Walking lunge', 3, '12', 'RPE 8', '1:30', 'Reps per leg'],
          ['Lying leg curl', 3, '12–15', 'RPE 9', '1:00', '3s eccentric'],
          ['Standing calf raise', 4, '10–12', 'RPE 9', '1:00', 'Full range, pause at bottom'],
        ]),
      ],
    },
    {
      id: 'tpl-str3',
      name: 'Strength base · 3-day',
      summary: 'Full body sessions with linear loading on the main lifts.',
      tags: ['Beginner', 'Barbell'],
      weeks: 8,
      loadMethod: '% of 1RM',
      progression: 'Linear +2.5 kg / week',
      guide: g('strength', 'beginner', 60, ['barbell', 'gym'], {
        cardioPerWeek: 1, cardioMin: 20, cardioType: 'Easy bike or walk',
        nutritionNotes: 'Eat at maintenance or slightly above. Protein at every meal.',
        restDayNotes: 'Light walk. No extra training needed.',
        instructions: 'Add 2.5 kg to squat and deadlift each session while the bar moves well; 1–2.5 kg on presses. If you miss reps twice in a row, tell your coach.',
        warmup: 'Empty bar x 10, then 3–4 ramp-up sets to your working weight.',
        deloadWeek: null,
      }),
      updatedAt,
      days: [
        day('str-d1', 'Day 1', [
          ['Back squat', 3, '5', '75% 1RM', '3:00'],
          ['Barbell bench press', 3, '5', '75% 1RM', '3:00'],
          ['Barbell row', 3, '8', 'RPE 7', '2:00'],
        ]),
        day('str-d2', 'Day 2', [
          ['Conventional deadlift', 3, '5', '75% 1RM', '3:00'],
          ['Overhead press', 3, '5', '72% 1RM', '2:30'],
          ['Chin-up', 3, '6–10', 'Bodyweight', '2:00'],
        ]),
        day('str-d3', 'Day 3', [
          ['Front squat', 3, '6', 'RPE 7', '2:30'],
          ['Close-grip bench press', 3, '6', 'RPE 7', '2:30'],
          ['Barbell hip thrust', 3, '8', 'RPE 8', '2:00'],
        ]),
      ],
    },
    {
      id: 'tpl-fat',
      name: 'Fat loss + conditioning',
      summary: 'Strength circuits plus intervals, with a daily step target.',
      tags: ['All levels', 'Strength + cardio'],
      weeks: 12,
      loadMethod: 'RPE + kg target',
      progression: 'Double progression',
      guide: g('fatloss', 'all', 50, ['gym', 'dumbbells'], {
        cardioPerWeek: 3, cardioMin: 25, cardioType: 'Intervals on bike or rower, or a brisk incline walk',
        nutritionNotes: 'Moderate deficit. Fill half the plate with vegetables, keep protein high, limit liquid calories. Weekends count too.',
        restDayNotes: 'Hit your steps. 200 kcal less on rest days.',
        instructions: 'Keep rest periods short and stay moving. Strength first, conditioning after. Weigh in daily, we track the weekly average.',
        warmup: '5 min row or bike, then dynamic mobility for hips and shoulders.',
        deloadWeek: null,
      }),
      updatedAt,
      days: [
        day('fat-s1', 'Strength A', [
          ['Goblet squat', 3, '10–12', 'RPE 7', '1:00'],
          ['DB bench press', 3, '10–12', 'RPE 7', '1:00'],
          ['Seated cable row', 3, '12', 'RPE 7', '1:00'],
        ]),
        day('fat-c1', 'Intervals', [
          ['Assault bike sprint', 8, '20s', 'Max effort', '1:40'],
          ['Incline walk', 1, '20 min', 'Zone 2', '—'],
        ]),
        day('fat-s2', 'Strength B', [
          ['Romanian deadlift', 3, '10', 'RPE 7', '1:30'],
          ['Push-up', 3, '8–15', 'Bodyweight', '1:00'],
          ['Reverse lunge', 3, '10', 'RPE 7', '1:00', 'Reps per leg'],
        ]),
        day('fat-c2', 'Conditioning', [
          ['Rower', 5, '500 m', 'RPE 8', '2:00'],
          ['Sled push', 6, '20 m', 'Heavy', '1:30'],
        ]),
      ],
    },
    {
      id: 'tpl-ath',
      name: 'Athletic performance',
      summary: 'Power, speed and single-leg strength for field athletes.',
      tags: ['Advanced', 'Sport'],
      weeks: 10,
      loadMethod: 'RPE + kg target',
      progression: 'Wave loading',
      guide: g('sport', 'advanced', 75, ['gym', 'barbell'], {
        cardioPerWeek: 2, cardioMin: 20, cardioType: 'Tempo runs or sprint intervals',
        nutritionNotes: 'Fuel training: carbs before and after sessions, protein spread over 4 meals.',
        restDayNotes: 'Mobility and soft tissue work. Sleep is the priority.',
        instructions: 'Jumps and sprints are done fresh, at full intent, with full rest. Stop a set if speed drops off.',
        warmup: '10 min RAMP warm-up: raise, activate, mobilise, then build up jumps.',
        deloadWeek: 5,
      }),
      updatedAt,
      days: [
        day('ath-p1', 'Speed & power A', [
          ['Box jump', 4, '3', 'Max height', '2:00'],
          ['Hang power clean', 5, '3', '70% 1RM', '2:30'],
          ['Bulgarian split squat', 3, '6', 'RPE 8', '2:00', 'Reps per leg'],
        ]),
        day('ath-s1', 'Strength A', [
          ['Trap-bar deadlift', 4, '4', 'RPE 8', '3:00'],
          ['Barbell bench press', 4, '5', 'RPE 8', '2:30'],
          ['Nordic curl', 3, '5', 'Bodyweight', '2:00'],
        ]),
        day('ath-p2', 'Speed & power B', [
          ['Sprint', 6, '20 m', 'Max effort', '2:00'],
          ['Med-ball scoop toss', 4, '5', '6 kg', '1:30'],
        ]),
        day('ath-s2', 'Strength B', [
          ['Front squat', 4, '4', 'RPE 8', '3:00'],
          ['Weighted pull-up', 4, '5', 'RPE 8', '2:30'],
          ['Copenhagen plank', 3, '20s', 'Bodyweight', '1:00', 'Each side'],
        ]),
      ],
    },
    {
      id: 'tpl-rtt',
      name: 'Return to training',
      summary: 'Gradual reload after injury or a long break, pain-monitored.',
      tags: ['Rehab-friendly'],
      weeks: 6,
      loadMethod: 'RPE + kg target',
      progression: 'Manual',
      guide: g('rehab', 'beginner', 45, ['gym', 'bands'], {
        cardioPerWeek: 3, cardioMin: 20, cardioType: 'Walking or easy bike',
        nutritionNotes: 'Eat at maintenance. Enough protein helps tissue repair.',
        restDayNotes: 'Daily walk and your mobility routine.',
        instructions: 'Pain during exercise should stay at 3/10 or below and settle within 24 hours. If it does not, stop that exercise and message your coach.',
        warmup: 'Mobility routine from your coach, then 1–2 light sets of each exercise.',
        deloadWeek: null,
      }),
      updatedAt,
      days: [
        day('rtt-1', 'Session 1', [
          ['Box squat', 3, '8', 'RPE 6', '2:00'],
          ['Step-up', 3, '10', 'RPE 6', '1:30', 'Reps per leg'],
          ['Band pull-apart', 3, '15', 'Light band', '1:00'],
        ]),
        day('rtt-2', 'Session 2', [
          ['Single-leg RDL', 3, '8', 'RPE 6', '1:30', 'Reps per leg'],
          ['Incline push-up', 3, '10', 'Bodyweight', '1:00'],
          ['Dead bug', 3, '8', 'Bodyweight', '1:00', 'Each side'],
        ]),
        day('rtt-3', 'Session 3', [
          ['Leg press', 3, '12', 'RPE 6', '1:30'],
          ['Spanish squat hold', 4, '45s', 'Band', '1:00'],
        ]),
      ],
    },
    {
      id: 'tpl-pl',
      name: 'Powerlifting peak',
      summary: 'Competition prep with heavy singles and a week-8 taper.',
      tags: ['Advanced', 'Meet prep'],
      weeks: 8,
      loadMethod: '% of 1RM',
      progression: 'Manual',
      guide: g('strength', 'advanced', 90, ['barbell', 'gym'], {
        cardioPerWeek: 1, cardioMin: 20, cardioType: 'Easy walk',
        nutritionNotes: 'Stay within 1 kg of your weight class. Keep meals familiar in the final two weeks.',
        restDayNotes: 'Full rest or a light walk.',
        instructions: 'Top sets follow the RPE on the sheet; back-off sets are 8–10% lighter. Film every top set for review.',
        warmup: 'General warm-up, then the same ramp-up you will use on meet day.',
        deloadWeek: 7,
      }),
      updatedAt,
      days: [
        day('pl-sq', 'Squat', [
          ['Back squat', 1, '1', 'RPE 8.5', '4:00', 'Competition depth'],
          ['Back squat back-off', 3, '3', '85% of top', '3:00'],
        ]),
        day('pl-bp', 'Bench', [
          ['Barbell bench press', 1, '1', 'RPE 8.5', '4:00', 'Paused, wait for command'],
          ['Paused bench press', 4, '3', '80% 1RM', '3:00'],
        ]),
        day('pl-dl', 'Deadlift', [
          ['Conventional deadlift', 1, '1', 'RPE 8', '4:00'],
          ['Block pull', 3, '3', '85% 1RM', '3:00'],
        ]),
        day('pl-acc', 'Accessory', [
          ['Close-grip bench press', 3, '6', 'RPE 7', '2:00'],
          ['Belt squat', 3, '8', 'RPE 7', '2:00'],
        ]),
      ],
    },
  ];
}
