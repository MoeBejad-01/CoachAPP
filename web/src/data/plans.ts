// Online coaching plans. Every plan is fully remote; they differ in how much
// direct contact the trainee gets with the coach.

import type { Membership, PlanTier } from './types';

export const TIERS: PlanTier[] = ['essential', 'premium', 'elite'];

/** Monthly prices in SAR. */
export const MONTHLY_PRICE: Record<PlanTier, number> = { essential: 499, premium: 899, elite: 1499 };

/** Coaching calls per month included in each plan. */
export const CALLS_PER_MONTH: Record<PlanTier, number> = { essential: 0, premium: 2, elite: 4 };

/** A quarter is three months at 10% off. */
export const defaultPrice = (tier: PlanTier, cycle: Membership['cycle']) =>
  cycle === 'quarterly' ? Math.round(MONTHLY_PRICE[tier] * 3 * 0.9) : MONTHLY_PRICE[tier];

/** Stored plan name (English); the UI shows the translated tier label instead. */
export const planName = (tier: PlanTier) => ({ essential: 'Essential online coaching', premium: 'Premium online coaching', elite: 'Elite online coaching' })[tier];

/** Maps the old coaching modes (online / hybrid / in person) onto plans. */
export const tierFromMode = (mode: string | undefined): PlanTier => (mode === 'inperson' ? 'elite' : mode === 'hybrid' ? 'premium' : 'essential');
