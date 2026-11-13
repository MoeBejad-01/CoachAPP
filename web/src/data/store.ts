// A tiny persisted store. State lives in localStorage so the dashboard behaves
// like a real app (edits survive reloads), and is shared with the local sync
// API when it's running (see sync.ts) so the iOS trainee app sees the same data.
// To move to a real backend later, replace load/save, sync.ts and the actions in actions.ts.

import { useSyncExternalStore } from 'react';
import { normalizeLayout } from './layout';
import { latestKg, migrateProgram } from './plan';
import { createSeed, STATE_VERSION } from './seed';
import { localChanged, replaceRemote, startSync } from './sync';
import type { AppState } from './types';

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
function repair(s: AppState): AppState {
  return {
    ...s,
    traineeLayout: normalizeLayout(s.traineeLayout),
    // Workspaces saved before InBody tracking get the demo scans so the page isn't empty.
    ...(s.inbody ? {} : (({ inbody, inbodyRequests }) => ({ inbody, inbodyRequests }))(createSeed())),
    metricEntries: s.metricEntries ?? [],
    trainees: s.trainees.map((t) => (t.program ? { ...t, program: migrateProgram(t.program, t, latestKg(s.weights, t.id)) } : t)),
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

function set(next: AppState) {
  state = next;
  persist(state);
  listeners.forEach((l) => l());
}

export function update(recipe: (s: AppState) => AppState) {
  const prev = state;
  set(recipe(prev));
  if (state !== prev) localChanged();
}

export function resetState() {
  set(createSeed());
  replaceRemote(state);
}

// Share the workspace with the local sync API (and so with the iOS app).
startSync({ get: getState, adopt: set, version: STATE_VERSION });

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
  if (e.key === KEY && e.newValue) {
    state = JSON.parse(e.newValue) as AppState;
    listeners.forEach((l) => l());
  }
});
