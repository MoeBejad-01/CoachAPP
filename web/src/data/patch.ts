// Workspace diffs, shared by the dashboard (src/data/sync.ts) and the local
// sync API (server/syncApi.ts). A patch lists what one side changed since the
// last state it saw, record by record, so edits from the coach and from the
// trainee's phone merge instead of overwriting each other.
// Pure functions only: this file runs in the browser and in Node.

import type { AppState } from './types';

export const COLLECTIONS = [
  'trainees', 'templates', 'logs', 'weights', 'checkins', 'notes', 'messages',
  'sessions', 'inbody', 'inbodyRequests', 'metricEntries',
] as const;
export const FIELDS = ['version', 'coach', 'widgets', 'traineeLayout'] as const;

export type Collection = (typeof COLLECTIONS)[number];
type Field = (typeof FIELDS)[number];
type Item<K extends Collection> = AppState[K][number];

export interface Patch {
  set: Partial<Pick<AppState, Field>>;
  upsert: { [K in Collection]?: Item<K>[] };
  remove: { [K in Collection]?: string[] };
}

/** Weigh-ins have no id: one per trainee per day. */
export function keyOf(k: Collection, item: object): string {
  const r = item as { id?: string; traineeId?: string; date?: string };
  return k === 'weights' ? `${r.traineeId}|${r.date}` : String(r.id);
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** What changed from `base` to `next`, or null when nothing did. */
export function diff(base: AppState, next: AppState): Patch | null {
  if (base === next) return null;
  const p: Patch = { set: {}, upsert: {}, remove: {} };
  let changed = false;
  for (const f of FIELDS) {
    if (!same(base[f], next[f])) {
      (p.set as Record<string, unknown>)[f] = next[f];
      changed = true;
    }
  }
  for (const k of COLLECTIONS) {
    const a: object[] = base[k] ?? [];
    const b: object[] = next[k] ?? [];
    if (a === b) continue;
    const before = new Map(a.map((x) => [keyOf(k, x), x]));
    const up = b.filter((x) => {
      const old = before.get(keyOf(k, x));
      return old !== x && !same(old, x);
    });
    const now = new Set(b.map((x) => keyOf(k, x)));
    const gone = [...before.keys()].filter((key) => !now.has(key));
    if (up.length) (p.upsert as Record<string, object[]>)[k] = up;
    if (gone.length) p.remove[k] = gone;
    if (up.length || gone.length) changed = true;
  }
  return changed ? p : null;
}

/** Keeps flags that only ever turn on, so an older copy can't switch them back off. */
function settle(k: Collection, old: object | undefined, next: object): object {
  if (!old) return next;
  if (k === 'trainees') {
    const o = old as { lastSeenAt: string }, n = next as { lastSeenAt: string };
    return o.lastSeenAt > n.lastSeenAt ? { ...n, lastSeenAt: o.lastSeenAt } : n;
  }
  if (k === 'messages') {
    const o = old as { read: boolean; seen?: boolean }, n = next as { read: boolean; seen?: boolean };
    let m = n;
    if (o.read && !n.read) m = { ...m, read: true };
    if (o.seen === true && n.seen === false) m = { ...m, seen: true };
    return m;
  }
  if (k === 'inbodyRequests') {
    const o = old as { status: string }, n = next as { status: string };
    return o.status === 'done' && n.status === 'pending' ? old : n;
  }
  return next;
}

const BY_DATE: Partial<Record<Collection, true>> = { logs: true, inbody: true };

export function applyPatch(state: AppState, p: Patch): AppState {
  const out = { ...state, ...p.set } as AppState;
  for (const k of COLLECTIONS) {
    const up = (p.upsert[k] ?? []) as object[];
    const gone = new Set(p.remove[k] ?? []);
    if (!up.length && !gone.size) continue;
    const list = ((state[k] ?? []) as object[]).filter((x) => !gone.has(keyOf(k, x)));
    const at = new Map(list.map((x, i) => [keyOf(k, x), i]));
    for (const item of up) {
      const key = keyOf(k, item);
      const i = at.get(key);
      if (i === undefined) {
        at.set(key, list.length);
        list.push(item);
      } else {
        list[i] = settle(k, list[i], item);
      }
    }
    if (BY_DATE[k]) (list as { date: string }[]).sort((a, b) => a.date.localeCompare(b.date));
    (out as unknown as Record<string, object[]>)[k] = list;
  }
  return out;
}
