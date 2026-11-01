import type { ProgramDay, Template } from './types';

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
      tags: ['All levels', 'Hybrid'],
      weeks: 12,
      loadMethod: 'RPE + kg target',
      progression: 'Double progression',
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
