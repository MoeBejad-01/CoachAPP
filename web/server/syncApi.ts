// A small local sync API that runs inside the Vite dev server (`npm run dev`)
// and `npm run preview`. The coach dashboard publishes its workspace here and
// the iOS trainee app reads and writes through it, so a set logged on the
// phone shows up on the dashboard a moment later.
//
// It stands in for the real backend: one workspace, demo sign-in, data kept in
// web/.data/sync.json. Delete that file to start over.
//
//   GET  /api/health                 is the API up, and has a dashboard published?
//   GET  /api/workspace              the whole workspace (dashboard)
//   PUT  /api/workspace              replace it (first publish, "Reset demo data")
//   POST /api/workspace/patch        merge the dashboard's changes
//   GET  /api/events                 server-sent events: {"rev": n} after every change
//   POST /api/app/login              { email, password } → { token, traineeId }
//   GET  /api/app/me                 the signed-in trainee's data
//   POST /api/app/ops                { ops: AppOp[] } → applies them, returns the same as /me
//   POST /api/app/logout

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, resolve } from 'node:path';
import type { Connect, Plugin } from 'vite';
import { applyPatch, type Patch } from '../src/data/patch';
import type { AppState, Trainee } from '../src/data/types';
import { applyOp, isValidOp, snapshotFor, type AppOp } from './appOps';

/** Every demo trainee signs in with their email and this password. */
export const DEMO_PASSWORD = 'demo1234';
const MAX_BODY = 8 * 1024 * 1024;
const KEEP_OPS = 5000;

interface Db {
  rev: number;
  state: AppState | null;
  /** token → trainee email (emails survive "Reset demo data"; ids might not). */
  tokens: Record<string, string>;
  /** Ids of app ops already applied, newest last. */
  applied: string[];
}

class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

function createApi(file: string) {
  let db: Db = { rev: 0, state: null, tokens: {}, applied: [] };
  try {
    if (existsSync(file)) db = { ...db, ...(JSON.parse(readFileSync(file, 'utf8')) as Db) };
  } catch {
    // Unreadable file: start empty; the dashboard publishes again on its next load.
  }
  let applied = new Set(db.applied);
  const clients = new Set<ServerResponse>();
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  function save() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(`${file}.tmp`, JSON.stringify(db));
      renameSync(`${file}.tmp`, file);
    }, 150);
  }

  function changed(state: AppState) {
    db.state = state;
    db.rev += 1;
    save();
    const msg = `event: rev\ndata: ${JSON.stringify({ rev: db.rev })}\n\n`;
    for (const res of clients) res.write(msg);
  }

  function traineeFor(req: IncomingMessage): Trainee {
    const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
    const email = token && db.tokens[token];
    if (!email) throw new HttpError(401, 'signed-out');
    if (!db.state) throw new HttpError(503, 'no-workspace');
    const t = db.state.trainees.find((x) => x.email.toLowerCase() === email);
    if (!t) throw new HttpError(401, 'account-gone');
    return t;
  }

  async function readBody<T>(req: IncomingMessage): Promise<T> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += (chunk as Buffer).length;
      if (size > MAX_BODY) throw new HttpError(413, 'too-large');
      chunks.push(chunk as Buffer);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as T;
    } catch {
      throw new HttpError(400, 'bad-json');
    }
  }

  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  };

  const workspace = () => ({ rev: db.rev, state: db.state });

  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const path = (req.url ?? '').split('?')[0];
    const method = req.method ?? 'GET';

    if (path === '/api/health') return send(res, 200, { ok: true, rev: db.rev, workspace: !!db.state });

    if (path === '/api/events' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`retry: 3000\nevent: rev\ndata: ${JSON.stringify({ rev: db.rev })}\n\n`);
      clients.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
      req.on('close', () => {
        clearInterval(ping);
        clients.delete(res);
      });
      return;
    }

    if (path === '/api/workspace') {
      if (method === 'GET') return send(res, 200, workspace());
      if (method === 'PUT') {
        const { state } = await readBody<{ state: AppState }>(req);
        if (!state || !Array.isArray(state.trainees)) throw new HttpError(400, 'bad-state');
        changed(state);
        return send(res, 200, workspace());
      }
    }

    if (path === '/api/workspace/patch' && method === 'POST') {
      const { patch } = await readBody<{ patch: Patch }>(req);
      if (!db.state) throw new HttpError(409, 'no-workspace');
      if (!patch || typeof patch !== 'object') throw new HttpError(400, 'bad-patch');
      changed(applyPatch(db.state, { set: patch.set ?? {}, upsert: patch.upsert ?? {}, remove: patch.remove ?? {} }));
      return send(res, 200, workspace());
    }

    if (path === '/api/app/login' && method === 'POST') {
      const { email = '', password = '' } = await readBody<{ email?: string; password?: string }>(req);
      if (!db.state) throw new HttpError(503, 'no-workspace');
      const key = String(email).trim().toLowerCase();
      const t = db.state.trainees.find((x) => x.email.toLowerCase() === key);
      if (!t || password !== DEMO_PASSWORD) throw new HttpError(401, 'bad-credentials');
      const token = randomBytes(24).toString('base64url');
      db.tokens[token] = key;
      save();
      return send(res, 200, { token, traineeId: t.id });
    }

    if (path === '/api/app/me' && method === 'GET') {
      const t = traineeFor(req);
      return send(res, 200, snapshotFor(db.state!, t, db.rev));
    }

    if (path === '/api/app/ops' && method === 'POST') {
      const t = traineeFor(req);
      const { ops = [] } = await readBody<{ ops?: AppOp[] }>(req);
      if (!Array.isArray(ops) || ops.length > 200) throw new HttpError(400, 'bad-ops');
      let state = db.state!;
      const rejected: string[] = [];
      for (const op of ops) {
        if (applied.has(op?.id)) continue;
        if (!isValidOp(op)) {
          rejected.push(String(op?.id));
          continue;
        }
        state = applyOp(state, t.id, op);
        applied.add(op.id);
        db.applied.push(op.id);
      }
      if (db.applied.length > KEEP_OPS) {
        db.applied = db.applied.slice(-KEEP_OPS);
        applied = new Set(db.applied);
      }
      if (state !== db.state) changed(state);
      else save();
      const fresh = state.trainees.find((x) => x.id === t.id) ?? t;
      return send(res, 200, { ...snapshotFor(state, fresh, db.rev), rejected });
    }

    if (path === '/api/app/logout' && method === 'POST') {
      const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
      if (token) delete db.tokens[token];
      save();
      return send(res, 200, { ok: true });
    }

    throw new HttpError(404, 'not-found');
  }

  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (!req.url?.startsWith('/api/')) return next();
    route(req, res).catch((err: unknown) => {
      if (res.headersSent) return res.end();
      if (err instanceof HttpError) send(res, err.status, { error: err.code });
      else {
        console.error('[sync api]', err);
        send(res, 500, { error: 'server' });
      }
    });
  };
  return middleware;
}

/** Vite plugin: mounts the sync API on the dev and preview servers. */
export function coachSyncApi(): Plugin {
  let file = '';
  return {
    name: 'coach-hq-sync-api',
    configResolved(config) {
      file = resolve(config.root, '.data/sync.json');
    },
    configureServer(server) {
      server.middlewares.use(createApi(file));
    },
    configurePreviewServer(server) {
      server.middlewares.use(createApi(file));
    },
  };
}
