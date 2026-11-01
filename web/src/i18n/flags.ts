import type { Flag } from '../data/selectors';
import { fmtDaysAgo } from '../lib/dates';
import type { T } from './index';

export function flagText(t: T, f: Flag): string {
  switch (f.kind) {
    case 'checkin': return f.missed === 1 ? t('flag.checkinOne') : t('flag.checkinMany', { n: f.missed });
    case 'adherence': return t('flag.adherence', { n: f.value });
    case 'pain': return t('flag.pain');
    case 'idle': return t('flag.idle', { n: f.days });
  }
}

export function flagDetail(t: T, f: Flag): string {
  switch (f.kind) {
    case 'checkin': return f.lastAgo === null ? t('flag.checkinNone') : t('flag.checkinLast', { ago: fmtDaysAgo(f.lastAgo) });
    case 'adherence': return t('flag.adherenceDetail');
    case 'pain': return `${f.exercise}${t('common.comma')} ${f.ago === 0 ? t('common.todayLower') : fmtDaysAgo(f.ago)}`;
    case 'idle': return t('flag.idleDetail', { day: f.lastDay });
  }
}

/** Whether the natural next step for a flag is a message (vs reviewing the profile). */
export const flagWantsMessage = (f: Flag) => f.kind === 'checkin' || f.kind === 'idle';
