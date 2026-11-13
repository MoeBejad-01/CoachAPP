export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}

/** Deterministic PRNG so the generated demo data is stable between resets. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roundTo(n: number, step: number): number {
  // toFixed drops float noise like 6.800000000000001.
  return Number((Math.round(n / step) * step).toFixed(10));
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function initials(first: string, last: string): string {
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}

/** Epley estimated one-rep max. */
export function e1rm(weight: number, reps: number): number {
  if (weight <= 0) return 0;
  return reps <= 1 ? weight : weight * (1 + reps / 30);
}

export function fmtKg(n: number): string {
  const unit = document.documentElement.lang === 'ar' ? 'كجم' : 'kg';
  return `${Number.isInteger(n) ? n : n.toFixed(1)} ${unit}`;
}

/** "7.5 h": hours to one decimal place at most. */
export function fmtHours(n: number): string {
  return `${Number(n.toFixed(1))} h`;
}

export function plural(n: number, word: string, many = word + 's'): string {
  return `${n} ${n === 1 ? word : many}`;
}

export const TONES = ['#E3E8F8', '#F6E7DA', '#E2EFE7', '#EDE6F5', '#F3E3E6', '#E4EEF2'];
