// Pricing plans. Pricing isn't decided yet: while PRICING_LIVE is false every
// card shows "Coming soon" and a waitlist button instead of a price.
//
// To launch: set PRICING_LIVE to true and give each plan a `price`.
// Plan names, blurbs and feature lines are keys in i18n/strings.ts
// (`site.pricing.*`), so they can be written in English and Arabic.

import type { StringKey } from '../../i18n/strings';

export const PRICING_LIVE = false;

/** ISO currency code used to format prices. */
export const CURRENCY = 'USD';

export type PlanId = 'starter' | 'pro' | 'elite';

export interface PlanFeature {
  key: StringKey;
  /** Values for placeholders in the string, e.g. `{n}` in "Up to {n} trainees". */
  vars?: Record<string, string | number>;
}

export interface Plan {
  id: PlanId;
  name: StringKey;
  blurb: StringKey;
  /** Price per month when billed monthly, and per year when billed yearly. */
  price: { monthly: number; yearly: number } | null;
  /** The plan this one builds on; its card opens with "Everything in <plan>, plus:". */
  extends?: PlanId;
  features: PlanFeature[];
  /** Draws the card with the accent border and "Most popular" badge. */
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'site.pricing.starter.name',
    blurb: 'site.pricing.starter.blurb',
    price: null,
    features: [
      { key: 'site.pricing.f.trainees', vars: { n: 10 } },
      { key: 'site.pricing.f.programs' },
      { key: 'site.pricing.f.chat' },
      { key: 'site.pricing.f.link' },
    ],
  },
  {
    id: 'pro',
    name: 'site.pricing.pro.name',
    blurb: 'site.pricing.pro.blurb',
    price: null,
    extends: 'starter',
    highlighted: true,
    features: [
      { key: 'site.pricing.f.trainees', vars: { n: 50 } },
      { key: 'site.pricing.f.inbody' },
      { key: 'site.pricing.f.booking' },
      { key: 'site.pricing.f.ai' },
    ],
  },
  {
    id: 'elite',
    name: 'site.pricing.elite.name',
    blurb: 'site.pricing.elite.blurb',
    price: null,
    extends: 'pro',
    features: [
      { key: 'site.pricing.f.unlimited' },
      { key: 'site.pricing.f.team' },
      { key: 'site.pricing.f.brand' },
      { key: 'site.pricing.f.support' },
    ],
  },
];
