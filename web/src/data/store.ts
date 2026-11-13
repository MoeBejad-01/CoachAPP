// The app's single store. Two modes:
// - local: everything lives in localStorage (demo mode, used when Supabase isn't configured);
// - remote: state is loaded from Supabase for the signed-in user and every change is saved back
//   in the background (see remote.ts). Pages and actions work the same in both.

import { useSyncExternalStore } from 'react';
import { normalizeLayout } from './layout';
import { normalizeGuide } from './guide';
import { defaultPrice, planName, tierFromMode } from './plans';
import { latestKg, migrateProgram } from './plan';
import { createSeed, STATE_VERSION } from './seed';
import { loadRemoteState, saveDiff, type Role } from './remote';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppState, Trainee } from './types';

const KEY = 'coachhq:state';
const listeners = new Set<() => void>();

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === STATE_VERSION) return repair(parsed);
    }
  } catch {
    // Corrupt or unavailable storage: fall through to fresh demo data.
  }
  const seed = createSeed();
  persist(seed);
  return seed;
}

/** Bring a saved workspace up to the current shape without losing the coach's data. */
/** Approximate rates used once to convert saved prices into SAR. */
const TO_SAR: Record<string, number> = { SAR: 1, USD: 3.75, EUR: 4.05, GBP: 4.75, AED: 1.02, KWD: 12.2, QAR: 1.03, CAD: 2.75, AUD: 2.45 };

function repair(s: AppState): AppState {
  // Billing is SAR-only: convert prices saved in another currency, then drop the setting.
  const { currency: oldCurrency, ...coach } = s.coach as AppState['coach'] & { currency?: string };
  const rate = oldCurrency ? TO_SAR[oldCurrency] ?? 1 : 1;
  if (rate !== 1) {
    // Untouched old default prices move to the new SAR plan price; custom prices are converted.
    const OLD_DEFAULTS = new Set([150, 250, 280, 400, 420, 405, 675, 756, 1080, 1134]);
    s = { ...s, trainees: s.trainees.map((t) => {
      const tier = t.tier ?? tierFromMode((t as Trainee & { mode?: string }).mode);
      const m = t.membership;
      const price = oldCurrency === 'USD' && OLD_DEFAULTS.has(m.price) ? defaultPrice(tier, m.cycle) : Math.round(m.price * rate);
      return { ...t, membership: { ...m, price } };
    }) };
  }
  return {
    ...s,
    coach,
    traineeLayout: normalizeLayout(s.traineeLayout),
    // Workspaces saved before InBody tracking get the demo scans so the page isn't empty.
    ...(s.inbody ? {} : (({ inbody, inbodyRequests }) => ({ inbody, inbodyRequests }))(createSeed())),
    metricEntries: s.metricEntries ?? [],
    importLayouts: s.importLayouts ?? [],
    // Workspaces saved before the public page existed get the demo requests, so the page isn't empty.
    joinRequests: s.joinRequests ?? createSeed().joinRequests,
    // "Hybrid" used to tag strength + cardio programs; renamed so it isn't read as hybrid (in-person) coaching.
    templates: s.templates.map((x) => ({ ...x, tags: x.tags.map((g) => (g === 'Hybrid' ? 'Strength + cardio' : g)), guide: normalizeGuide(x.guide) })),
    // The platform is online-only: old coaching modes become plans, in-person sessions become calls.
    sessions: s.sessions.map((x) => ({ ...x, location: x.location === 'Video call' || x.location === 'Voice call' || x.location === 'Focus block' ? x.location : x.traineeId ? 'Video call' : 'Focus block' })),
    trainees: s.trainees.map((t0) => {
      const legacy = t0 as Trainee & { mode?: string };
      const tier = legacy.tier ?? tierFromMode(legacy.mode);
      const { mode: _mode, ...rest } = legacy;
      const t: Trainee = { ...rest, tier, membership: { ...rest.membership, plan: /coaching$/.test(rest.membership.plan) && !/^Online coaching$/.test(rest.membership.plan) ? rest.membership.plan : planName(tier) } };
      if (!t.program) return t;
      const p = migrateProgram(t.program, t, latestKg(s.weights, t.id));
      // Programs assigned before guides existed pick up their template's guide.
      const guide = p.guide ?? s.templates.find((x) => x.id === p.templateId)?.guide;
      return { ...t, program: { ...p, guide: guide ? normalizeGuide(guide, t.goalType) : undefined } };
    }),
  };
}

function persist(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked; the app keeps working in memory.
  }
}

let state: AppState = load();

export function getState(): AppState {
  return state;
}

// ---------- Remote (Supabase) mode ----------

type Remote = { db: SupabaseClient; role: Role; userId: string };
export type SyncStatus = { pending: number; error: string | null };
let remote: Remote | null = null;
let queue: Promise<void> = Promise.resolve();
let sync: SyncStatus = { pending: 0, error: null };
const syncListeners = new Set<() => void>();
const setSync = (patch: Partial<SyncStatus>) => { sync = { ...sync, ...patch }; syncListeners.forEach((l) => l()); };

/** Loads the signed-in user's workspace from Supabase and switches the store to save there. */
export async function startRemote(db: SupabaseClient, role: Role, userId: string) {
  const loaded = await loadRemoteState(db, role, userId);
  remote = { db, role, userId };
  state = loaded;
  setSync({ pending: 0, error: null });
  listeners.forEach((l) => l());
}

/** Re-reads everything from the database (after loading demo data, or to pick up others' changes). */
export async function reloadRemote() {
  if (!remote) return;
  await queue;
  state = await loadRemoteState(remote.db, remote.role, remote.userId);
  listeners.forEach((l) => l());
}

export function stopRemote() {
  remote = null;
  state = load();
  listeners.forEach((l) => l());
}

export const isRemote = () => remote !== null;

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore((l) => { syncListeners.add(l); return () => syncListeners.delete(l); }, () => sync);
}

export function update(recipe: (s: AppState) => AppState) {
  const prev = state;
  state = recipe(state);
  if (remote) {
    // Saves run one after another so related writes (a trainee, then their program) stay in order.
    const ctx = remote;
    const next = state;
    setSync({ pending: sync.pending + 1 });
    queue = queue
      .then(() => saveDiff(ctx, prev, next))
      .then(() => setSync({ pending: sync.pending - 1, error: null }))
      .catch((e: unknown) => setSync({ pending: sync.pending - 1, error: e instanceof Error ? e.message : String(e) }));
  } else {
    persist(state);
  }
  listeners.forEach((l) => l());
}

export function resetState() {
  state = createSeed();
  persist(state);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The whole state object; derive what you need with useMemo. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState);
}

// Keep tabs in sync when the app is open in more than one window.
window.addEventListener('storage', (e) => {
  if (!remote && e.key === KEY && e.newValue) {
    state = JSON.parse(e.newValue) as AppState;
    listeners.forEach((l) => l());
  }
});
