// Helpers every coach page section shares: the profile, its text in the
// current language, money and counted phrases ("3 spots", "12 weeks").

import { createContext, useContext } from 'react';
import type { Lang, T } from '../../i18n';
import type { StringKey } from '../../i18n/strings';
import { joinUrl } from '../services/coachProfiles';
import type { CoachProfile, Localized } from './types';

interface Owner {
  /** The signed-in coach is looking at their own page. */
  owner: boolean;
  /** Saves changes to the profile and shows them right away; false if they couldn't be stored. */
  update: (next: CoachProfile) => boolean;
}

/** Strings with one variant per plural category: `<base>.one|two|few|many|other`. */
export type CountBase = 'site.cp.weeks' | 'site.cp.months' | 'site.cp.reviews' | 'site.cp.perWeek' | 'site.cp.spots' | 'site.cp.left';

const PLURALS: Record<Lang, Intl.PluralRules> = { en: new Intl.PluralRules('en'), ar: new Intl.PluralRules('ar') };

export function makeCoachKit(p: CoachProfile, lang: Lang, t: T, { owner, update }: Owner) {
  const numLocale = lang === 'ar' ? 'ar-u-nu-latn' : 'en';
  const L = (l?: Localized) => (l ? (lang === 'ar' && l.ar ? l.ar : l.en) : '');
  const name = L(p.name);
  return {
    p,
    owner,
    update,
    lang,
    L,
    name,
    first: name.split(/\s+/)[0],
    numLocale,
    num: (n: number, decimals = 0) => n.toLocaleString(numLocale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
    money(n: number) {
      try {
        return new Intl.NumberFormat(numLocale, { style: 'currency', currency: p.currency, maximumFractionDigits: 0 }).format(n);
      } catch {
        return `${p.currency} ${n}`;
      }
    },
    count(base: CountBase, n: number, vars: Record<string, string | number> = {}) {
      const cat = PLURALS[lang].select(n);
      return t(`${base}.${cat === 'zero' ? 'other' : cat}` as StringKey, { n, ...vars });
    },
    join: (planId?: string) => joinUrl(p, planId),
  };
}

export type CoachKit = ReturnType<typeof makeCoachKit>;

export const CoachCtx = createContext<CoachKit | null>(null);

export function useCoach(): CoachKit {
  const kit = useContext(CoachCtx);
  if (!kit) throw new Error('useCoach must be used inside a coach page');
  return kit;
}
