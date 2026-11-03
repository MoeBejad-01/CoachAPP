// Homepage content lists. Add, remove or reorder items here; each title and
// body is a key in i18n/strings.ts (add the English and Arabic text there).

import type { IconName } from '../../components/Icon';
import type { StringKey } from '../../i18n/strings';

export interface Item {
  icon: IconName;
  title: StringKey;
  body: StringKey;
}

export const ABOUT_VALUES: Item[] = [
  { icon: 'clipboard', title: 'site.about.v1.title', body: 'site.about.v1.body' },
  { icon: 'translate', title: 'site.about.v2.title', body: 'site.about.v2.body' },
  { icon: 'bolt', title: 'site.about.v3.title', body: 'site.about.v3.body' },
];

export const SERVICES: Item[] = [
  { icon: 'users', title: 'site.svc.online.title', body: 'site.svc.online.body' },
  { icon: 'clipboard', title: 'site.svc.programs.title', body: 'site.svc.programs.body' },
  { icon: 'chart', title: 'site.svc.tracking.title', body: 'site.svc.tracking.body' },
  { icon: 'calendar', title: 'site.svc.booking.title', body: 'site.svc.booking.body' },
  { icon: 'sparkles', title: 'site.svc.ai.title', body: 'site.svc.ai.body' },
];

/** A small illustration shown inside the larger feature cards. */
export type FeatureVisual = 'video' | 'chart' | 'ai' | 'sync' | 'language' | 'page';

export interface Feature extends Item {
  id: string;
  /** Card size in the bento grid: `lg` is 2×2, `wide` is 2×1, default 1×1. */
  size?: 'lg' | 'wide';
  visual?: FeatureVisual;
}

/**
 * Bento grid, in reading order. On the 4-column desktop grid the sizes should
 * add up to a multiple of 4 cells (lg = 4, wide = 2, default = 1) so no gaps remain.
 */
export const FEATURES: Feature[] = [
  { id: 'programs', icon: 'video', title: 'site.feat.programs.title', body: 'site.feat.programs.body', size: 'lg', visual: 'video' },
  { id: 'progress', icon: 'chart', title: 'site.feat.progress.title', body: 'site.feat.progress.body', size: 'wide', visual: 'chart' },
  { id: 'chat', icon: 'message', title: 'site.feat.chat.title', body: 'site.feat.chat.body' },
  { id: 'inbody', icon: 'scale', title: 'site.feat.inbody.title', body: 'site.feat.inbody.body' },
  { id: 'whoop', icon: 'activity', title: 'site.feat.whoop.title', body: 'site.feat.whoop.body' },
  { id: 'calories', icon: 'calculator', title: 'site.feat.calories.title', body: 'site.feat.calories.body' },
  { id: 'ai', icon: 'sparkles', title: 'site.feat.ai.title', body: 'site.feat.ai.body', size: 'wide', visual: 'ai' },
  { id: 'sync', icon: 'devices', title: 'site.feat.sync.title', body: 'site.feat.sync.body', size: 'wide', visual: 'sync' },
  { id: 'calendar', icon: 'calendar', title: 'site.feat.calendar.title', body: 'site.feat.calendar.body' },
  { id: 'link', icon: 'link', title: 'site.feat.link.title', body: 'site.feat.link.body' },
  { id: 'page', icon: 'palette', title: 'site.feat.page.title', body: 'site.feat.page.body', size: 'wide', visual: 'page' },
  { id: 'language', icon: 'translate', title: 'site.feat.language.title', body: 'site.feat.language.body', size: 'wide', visual: 'language' },
];

/** How It Works. Each step loads one plate pair on the barbell (weights in kg). */
export const STEPS: (Item & { plateKg: number })[] = [
  { icon: 'palette', title: 'site.how.s1.title', body: 'site.how.s1.body', plateKg: 25 },
  { icon: 'link', title: 'site.how.s2.title', body: 'site.how.s2.body', plateKg: 20 },
  { icon: 'clipboard', title: 'site.how.s3.title', body: 'site.how.s3.body', plateKg: 15 },
  { icon: 'trophy', title: 'site.how.s4.title', body: 'site.how.s4.body', plateKg: 10 },
];

export const COACH_BENEFITS: StringKey[] = [
  'site.coaches.b1', 'site.coaches.b2', 'site.coaches.b3', 'site.coaches.b4', 'site.coaches.b5',
];

export const TRAINEE_BENEFITS: StringKey[] = [
  'site.trainees.b1', 'site.trainees.b2', 'site.trainees.b3', 'site.trainees.b4', 'site.trainees.b5',
];
