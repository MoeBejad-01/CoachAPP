// A coach's public page (/c/<handle>): everything on it comes from this
// profile, which the coach fills in from their account. Sections without
// content are skipped, and `sections` sets which ones show and in what order.

/** Text the coach writes, in English and optionally Arabic (English is the fallback). */
export interface Localized {
  en: string;
  ar?: string;
}

export type CoachSection =
  | 'numbers' | 'story' | 'platform' | 'results' | 'method'
  | 'programs' | 'plans' | 'inbox' | 'intro' | 'faq';

export type FitGoal = 'strength' | 'muscle' | 'fatloss' | 'compete';

export interface CoachStat {
  value: number;
  prefix?: string;
  suffix?: string;
  label: Localized;
}

export interface TraineeResult {
  /** Shown with the trainee's permission, e.g. "Sara K.". */
  name: Localized;
  goal: Localized;
  metric: Localized;
  unit: Localized;
  decimals?: number;
  /** One value per week, from week 0. In the app this comes from the trainee's logs. */
  weekly: number[];
  /** Body fat, waist… where going down is the win. */
  lowerIsBetter?: boolean;
}

export interface CoachProgram {
  id: string;
  name: Localized;
  summary: Localized;
  level: Localized;
  weeks: number;
  daysPerWeek: number;
  focus: Localized[];
  /** Planned load for each day, week by week (7 per week): 0 rest, 1 light, 2 moderate, 3 heavy. */
  intensity: number[][];
  sample: { title: Localized; exercises: { name: Localized; prescription: string }[] };
  /** One-off price; leave out when the program comes with coaching. */
  price?: number;
}

export interface CoachPlan {
  id: string;
  name: Localized;
  blurb: Localized;
  pricePerMonth: number;
  minMonths?: number;
  features: Localized[];
  popular?: boolean;
  spotsLeft?: number;
  /** What "Find your fit" matches against. */
  fit: { goals: FitGoal[]; mode: 'online' | 'hybrid'; support: 'weekly' | 'daily' };
}

export interface CoachProfile {
  /** The coach's account id; registration links use it (/signup?coach=<id>). */
  id: string;
  /** Short name in the page address: /c/<handle>. */
  handle: string;
  name: Localized;
  title: Localized;
  location: Localized;
  tagline: Localized;
  /** Portrait URL. Until the coach uploads one, an illustrated portrait shows. */
  photo?: string;
  languages: Localized[];
  responseTime?: Localized;
  rating?: { score: number; count: number };
  /** Trainee slots; drives the "spots open" badge. */
  capacity?: { total: number; taken: number };
  /** ISO currency code for plan and program prices. */
  currency: string;
  sections: CoachSection[];

  stats: CoachStat[];
  story?: {
    quote: Localized;
    paragraphs: Localized[];
    specialties: Localized[];
    credentials: { name: Localized; detail: Localized; year: number }[];
  };
  /** The coach's own competition lifts. */
  platform?: { lifts: { name: Localized; kg: number }[]; bodyweightKg: number; meet: Localized };
  results: TraineeResult[];
  method: { title: Localized; body: Localized }[];
  programs: CoachProgram[];
  plans: CoachPlan[];
  /** Trainee messages shared with permission. */
  inbox: { from: Localized; week: number; text: Localized; pr?: boolean }[];
  introCall?: {
    minutes: number;
    /** IANA zone the times are in, e.g. "Asia/Riyadh". */
    zone: string;
    /** How the zone is named on the page, e.g. "Riyadh time". */
    timezone: Localized;
    /** Open start times (HH:MM) by weekday, 0 = Sunday. */
    slots: Partial<Record<number, string[]>>;
  };
  faq: { q: Localized; a: Localized }[];
  socials: { network: 'instagram' | 'youtube' | 'x' | 'linkedin'; url: string }[];
}
