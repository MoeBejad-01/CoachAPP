// Defaults and repair for the coach's trainee-page layout. Saved layouts are
// merged with the catalog so new items added in code show up without a reset.

import type { BuiltinSectionId, CustomCard, LayoutItem, SectionId, SectionItem, TabItem, TraineeLayout } from './types';

type Catalog<T extends string> = readonly (readonly [T, boolean])[];

const BADGES = [['group', true], ['plan', true], ['goalType', false]] as const;
const DETAILS = [['age', true], ['height', true], ['since', true], ['seen', true], ['contact', false], ['frequency', false]] as const;
const BANNERS = [['flags', true], ['pinned', false], ['injuries', false]] as const;
const ACTIONS = [['status', true], ['edit', true], ['message', true]] as const;
const STATS = [
  ['program', true], ['adherence', true], ['weight', true], ['lastSession', true], ['checkin', true],
  ['renewal', false], ['sessions30', false], ['goal', false], ['unread', false], ['prs30', false],
] as const;
const TABS = [['overview', true], ['program', true], ['workouts', true], ['progress', true], ['notes', true], ['checkins', true]] as const;
const PROGRAM_COLS = [['cue', true], ['prescribed', true], ['intensity', true], ['rest', false], ['logged', true]] as const;
const TARGET_FIELDS = [['bodyWeight', true], ['sleep', true], ['calories', true], ['protein', true], ['steps', true], ['focus', true]] as const;
const WORKOUT_COLS = [['date', true], ['session', true], ['duration', true], ['rpe', true], ['volume', true], ['exercises', true], ['sets', false]] as const;
const CHECKIN_COLS = [['date', true], ['weight', true], ['sleep', true], ['energy', true], ['stress', true], ['soreness', true], ['comment', true]] as const;

export const LAYOUT_VERSION = 2;
export const ALL_SECTIONS: BuiltinSectionId[] = [
  'week', 'goals', 'checkin', 'notes', 'weight', 'lifts', 'perWeek', 'goalBars', 'profile', 'membership', 'lastWorkout',
  'summary', 'prs', 'topLifts', 'volume', 'rpe', 'checkinTrend', 'inbody', 'inbodyTrend', 'inbodyHistory',
];
const OVERVIEW_ON: SectionId[] = ['week', 'goals', 'checkin', 'notes'];
const PROGRESS_ON: SectionId[] = ['summary', 'topLifts', 'prs', 'inbody', 'weight', 'volume', 'inbodyTrend', 'checkinTrend', 'perWeek', 'goalBars', 'inbodyHistory'];
const WIDE_BY_DEFAULT = new Set<SectionId>(['summary', 'topLifts', 'inbodyHistory']);

function merge<T extends string, I extends LayoutItem<T>>(saved: I[] | undefined, catalog: Catalog<T>, make: (id: T, on: boolean) => I): I[] {
  const ids = new Set(catalog.map(([id]) => id));
  const kept = (saved ?? []).filter((x) => ids.has(x.id));
  const have = new Set(kept.map((x) => x.id));
  return [...kept, ...catalog.filter(([id]) => !have.has(id)).map(([id, on]) => make(id, on))];
}

const plain = <T extends string>(id: T, on: boolean): LayoutItem<T> => ({ id, on });
const sections = (on: SectionId[], cards: CustomCard[]): Catalog<SectionId> =>
  [...on, ...[...ALL_SECTIONS, ...cards.map((c) => `card:${c.id}` as const)].filter((x) => !on.includes(x))].map((id) => [id, on.includes(id)] as const);
const section = (id: SectionId, on: boolean): SectionItem => ({ id, on, wide: WIDE_BY_DEFAULT.has(id) });

export function normalizeLayout(l?: Partial<TraineeLayout>): TraineeLayout {
  const tabs = merge<TabItem['id'], TabItem>(l?.tabs, TABS, (id, on) => ({ id, on, label: '' }));
  if (!tabs.some((x) => x.on)) tabs[0] = { ...tabs[0], on: true };
  const defaultTab = tabs.find((x) => x.id === l?.defaultTab && x.on)?.id ?? tabs.find((x) => x.on)!.id;
  const cards = l?.customCards ?? [];
  // Layouts saved before v2 get the new Progress defaults (PRs, InBody, …).
  const fresh = (l?.version ?? 1) < LAYOUT_VERSION;
  return {
    version: LAYOUT_VERSION,
    customCards: cards,
    badges: merge(l?.badges, BADGES, plain),
    details: merge(l?.details, DETAILS, plain),
    banners: merge(l?.banners, BANNERS, plain),
    actions: merge(l?.actions, ACTIONS, plain),
    stats: merge(l?.stats, STATS, plain),
    tabs,
    defaultTab,
    overview: merge(l?.overview, sections(OVERVIEW_ON, cards), section),
    progress: merge(fresh ? undefined : l?.progress, sections(PROGRESS_ON, cards), section),
    programCols: merge(l?.programCols, PROGRAM_COLS, plain),
    targetFields: merge(l?.targetFields, TARGET_FIELDS, plain),
    workoutCols: merge(l?.workoutCols, WORKOUT_COLS, plain),
    workoutExpand: l?.workoutExpand ?? 'latest',
    checkinCols: merge(l?.checkinCols, CHECKIN_COLS, plain),
    notesDefaultShared: l?.notesDefaultShared ?? true,
    adherenceWarn: l?.adherenceWarn ?? 75,
  };
}

export const defaultLayout = () => normalizeLayout();

/** Visible ids in the coach's order. */
export const shown = <T extends string>(items: LayoutItem<T>[]): T[] => items.filter((x) => x.on).map((x) => x.id);
export const isOn = <T extends string>(items: LayoutItem<T>[], id: T): boolean => items.some((x) => x.id === id && x.on);
