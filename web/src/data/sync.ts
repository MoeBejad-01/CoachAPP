// Keeps the dashboard's workspace in step with the local sync API
// (server/syncApi.ts), which the iOS trainee app also talks to.
//
// - On load: adopt the server's workspace, or publish ours if it has none.
// - After each local change: send a patch of what changed since the last
//   server copy; the server merges it and returns the result.
// - When the server announces a new revision (server-sent events): fetch it
//   and replay any local changes that haven't been sent yet on top.
//
// When there is no API (a static build) the dashboard just keeps using
// localStorage, as before.

import { applyPatch, diff } from './patch';
import type { AppState } from './types';

interface Hooks {
  get: () => AppState;
  /** Replace local state with a merged copy (no new push). */
  adopt: (s: AppState) => void;
  version: number;
}

interface Workspace {
  rev: number;
  state: AppState | null;
}

export type SyncStatus = 'off' | 'connecting' | 'live' | 'offline';

let hooks: Hooks | null = null;
let base: AppState | null = null;
let rev = -1;
let status: SyncStatus = 'connecting';
let pushing = false;
let pullAgain = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const watchers = new Set<() => void>();

function setStatus(s: SyncStatus) {
  if (s === status) return;
  status = s;
  watchers.forEach((w) => w());
}

export const syncStatus = () => status;
export function watchSync(fn: () => void) {
  watchers.add(fn);
  return () => watchers.delete(fn);
}

async function call<T>(method: string, path: string, body?: unknown, keepalive = false): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status}`);
  return (await res.json()) as T;
}

function settle(w: Workspace) {
  base = w.state;
  rev = w.rev;
}

async function publish(state: AppState) {
  settle(await call<Workspace>('PUT', '/api/workspace', { state }));
}

async function boot() {
  const h = hooks!;
  try {
    const health = await fetch('/api/health');
    if (!health.ok || !(health.headers.get('content-type') ?? '').includes('json')) return setStatus('off');
    const w = await call<Workspace>('GET', '/api/workspace');
    if (!w.state || w.state.version !== h.version) {
      await publish(h.get());
    } else {
      settle(w);
      h.adopt(w.state);
    }
    setStatus('live');
    listen();
  } catch {
    setStatus('offline');
    setTimeout(boot, 5000);
  }
}

function listen() {
  const es = new EventSource('/api/events');
  es.addEventListener('rev', (e) => {
    setStatus('live');
    const next = (JSON.parse((e as MessageEvent<string>).data) as { rev: number }).rev;
    if (next > rev) void pull();
  });
  es.onerror = () => setStatus('offline');
}

async function pull() {
  if (pushing) {
    pullAgain = true;
    return;
  }
  const h = hooks!;
  try {
    const w = await call<Workspace>('GET', '/api/workspace');
    if (!w.state || w.rev <= rev || !base) return;
    const pending = diff(base, h.get());
    settle(w);
    h.adopt(pending ? applyPatch(w.state, pending) : w.state);
    if (pending) schedulePush(0);
  } catch {
    setStatus('offline');
  }
}

async function push() {
  const h = hooks!;
  if (pushing || !base || status === 'off') return;
  const sent = h.get();
  const patch = diff(base, sent);
  if (!patch) return;
  pushing = true;
  try {
    const w = await call<Workspace>('POST', '/api/workspace/patch', { patch });
    if (!w.state) return;
    settle(w);
    const now = h.get();
    const later = now === sent ? null : diff(sent, now);
    h.adopt(later ? applyPatch(w.state, later) : w.state);
    if (later) schedulePush(0);
    setStatus('live');
  } catch {
    setStatus('offline');
    schedulePush(4000);
  } finally {
    pushing = false;
    if (pullAgain) {
      pullAgain = false;
      void pull();
    }
  }
}

function schedulePush(ms = 400) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void push();
  }, ms);
}

/** Call once with the store's accessors. */
export function startSync(h: Hooks) {
  if (hooks) return;
  hooks = h;
  void boot();
  // Send anything still waiting when the tab closes.
  window.addEventListener('pagehide', () => {
    if (!timer || !base) return;
    const patch = diff(base, h.get());
    if (patch) void call('POST', '/api/workspace/patch', { patch }, true).catch(() => {});
  });
}

/** The store calls this after every local change. */
export function localChanged() {
  if (hooks && status !== 'off') schedulePush();
}

/** "Reset demo data": replace the shared workspace outright. */
export function replaceRemote(state: AppState) {
  if (!hooks || status === 'off') return;
  void publish(state).catch(() => setStatus('offline'));
}
