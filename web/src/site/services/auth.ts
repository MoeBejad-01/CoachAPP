// Auth service for the public site. MOCKED: accounts and the session live in
// this browser's storage and every call resolves after a short delay. A real
// backend replaces the bodies of the exported functions; the pages only use
// these functions and the types below.

import { getState } from '../../data/store';

export type Role = 'coach' | 'trainee';
export type AuthErrorCode = 'invalid_credentials' | 'email_taken' | 'unknown';

export class AuthError extends Error {
  constructor(public code: AuthErrorCode) {
    super(code);
  }
}

export interface Session {
  accountId: string;
  role: Role;
  name: string;
  email: string;
}

export interface SignUpInput {
  role: Role;
  name: string;
  email: string;
  phone?: string;
  password: string;
  /** Set when a trainee signs up through their coach's registration link. */
  coachId?: string;
}

interface StoredAccount extends Session {
  phone?: string;
  coachId?: string;
  passwordHash: string;
  createdAt: string;
}

const ACCOUNTS_KEY = 'coachhq:auth:accounts';
const SESSION_KEY = 'coachhq:auth:session';
const LATENCY_MS = 700;

/** Demo logins that always work. Shown on the login page while auth is mocked. */
export const DEMO_ACCOUNTS: Record<Role, { email: string; password: string }> = {
  coach: { email: 'coach@coachhq.example', password: 'demo1234' },
  trainee: { email: 'trainee@coachhq.example', password: 'demo1234' },
};

/** The demo coach's id, for trying the registration link: /signup?coach=demo */
export const DEMO_COACH_ID = 'demo';

/** Where each role lands after logging in or signing up. */
export const homeFor = (role: Role) => (role === 'coach' ? '/coach' : '/app');

/** A `?next=` path to continue to after auth, if it stays on this site. */
export function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null;
}

const wait = (ms = LATENCY_MS) => new Promise((r) => setTimeout(r, ms));
const normalizeEmail = (email: string) => email.trim().toLowerCase();

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`coachhq:${password}`);
  if (crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Insecure contexts (plain http on a LAN address) have no SubtleCrypto.
  let h = 5381;
  for (const b of data) h = ((h << 5) + h + b) | 0;
  return `djb2:${h >>> 0}`;
}

function readAccounts(): StoredAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]') as StoredAccount[];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // Storage blocked: the account lasts for this visit only.
  }
}

function demoAccount(role: Role): Session {
  const { email } = DEMO_ACCOUNTS[role];
  if (role === 'coach') return { accountId: DEMO_COACH_ID, role, name: getState().coach.name, email };
  const first = getState().trainees.find((t) => t.status === 'active');
  return { accountId: 'demo-trainee', role, name: first ? `${first.firstName} ${first.lastName}` : 'Trainee', email };
}

function startSession(session: Session, remember: boolean) {
  const value = JSON.stringify(session);
  try {
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, value);
    (remember ? sessionStorage : localStorage).removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
  return session;
}

export async function logIn(input: { email: string; password: string; remember: boolean }): Promise<Session> {
  await wait();
  const email = normalizeEmail(input.email);
  for (const role of ['coach', 'trainee'] as const) {
    const demo = DEMO_ACCOUNTS[role];
    if (email === demo.email && input.password === demo.password) return startSession(demoAccount(role), input.remember);
  }
  const hash = await hashPassword(input.password);
  const account = readAccounts().find((a) => a.email === email && a.passwordHash === hash);
  if (!account) throw new AuthError('invalid_credentials');
  const { accountId, role, name } = account;
  return startSession({ accountId, role, name, email }, input.remember);
}

export async function signUp(input: SignUpInput): Promise<Session> {
  await wait();
  const email = normalizeEmail(input.email);
  const accounts = readAccounts();
  if (accounts.some((a) => a.email === email) || Object.values(DEMO_ACCOUNTS).some((d) => d.email === email)) {
    throw new AuthError('email_taken');
  }
  const account: StoredAccount = {
    accountId: `acc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    role: input.role,
    name: input.name.trim(),
    email,
    phone: input.phone?.trim() || undefined,
    coachId: input.role === 'trainee' ? input.coachId : undefined,
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  writeAccounts([...accounts, account]);
  const { accountId, role, name } = account;
  return startSession({ accountId, role, name, email }, true);
}

/** Always resolves, whether or not the email has an account, so the page can't be used to probe for accounts. */
export async function requestPasswordReset(email: string): Promise<void> {
  void email;
  await wait();
}

/** Looks up the coach behind a registration link (`/signup?coach=<id>`). */
export async function findCoach(coachId: string): Promise<{ id: string; name: string } | null> {
  await wait(250);
  if (coachId === DEMO_COACH_ID) return { id: coachId, name: getState().coach.name };
  const coach = readAccounts().find((a) => a.role === 'coach' && a.accountId === coachId);
  return coach ? { id: coach.accountId, name: coach.name } : null;
}

export function getSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function logOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
