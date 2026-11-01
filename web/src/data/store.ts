// A tiny persisted store. All state lives in localStorage so the dashboard
// behaves like a real app (edits survive reloads) until a backend exists.
// To move to a server later, replace load/save and the actions in actions.ts.

import { useSyncExternalStore } from 'react';
import { normalizeLayout } from './layout';
import { normalizeGuide } from './guide';
import { latestKg, migrateProgram } from './plan';
import { createSeed, STATE_VERSION } from './seed';
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
    templates: s.templates.map((x) => ({ ...x, guide: normalizeGuide(x.guide) })),
    trainees: s.trainees.map((t) => {
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

export function update(recipe: (s: AppState) => AppState) {
  state = recipe(state);
  persist(state);
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
  if (e.key === KEY && e.newValue) {
    state = JSON.parse(e.newValue) as AppState;
    listeners.forEach((l) => l());
  }
});
