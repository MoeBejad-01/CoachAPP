// Join requests: the bridge between the coach's public page and this dashboard.
//
// The public site (web/src/site) collects the intake answers and calls sendJoinRequest; the
// request lands in the coach's dashboard as pending. The coach either approves it -- which
// creates the trainee, in onboarding, with their plan -- declines it, or opens WhatsApp first.
//
// Both sides go through Supabase (see supabase/migrations/20261113000000_public_pages.sql,
// where Row Level Security decides who may read and write what). With Supabase unconfigured the
// dashboard runs on local demo data instead, and approving works the same way in memory.

import { todayISO } from '../lib/dates';
import { uid } from '../lib/util';
import { supabase } from '../lib/supabase';
import { defaultPrice, planName } from './plans';
import { isRemote, reloadRemote, update } from './store';
import type { GoalType, JoinAnswers, JoinRequest, PlanTier, Trainee } from './types';

// ---------- Shared helpers ----------

/** The public form's goal values, mapped onto the dashboard's goal types. */
const GOALS: Record<string, GoalType> = {
  muscle: 'muscle', strength: 'strength', fatloss: 'fatloss',
  compete: 'sport', sport: 'sport', rehab: 'rehab', health: 'health',
};
export const goalTypeFor = (answers: JoinAnswers): GoalType => GOALS[answers.goal ?? ''] ?? 'health';

/** How many days a week they said they can train, kept inside the 1-7 the app allows. */
export const frequencyFor = (answers: JoinAnswers): number =>
  Math.min(7, Math.max(1, answers.days?.length ?? 3));

export const splitName = (name: string): [string, string] => {
  const parts = name.trim().split(/\s+/);
  return [parts[0] ?? '', parts.slice(1).join(' ')];
};

/**
 * A wa.me link that opens the chat with this person, message prefilled.
 * Returns null when the request carries no usable number.
 */
export function whatsappLink(req: Pick<JoinRequest, 'phone'>, message?: string): string | null {
  const digits = req.phone.replace(/\D/g, '').replace(/^00/, '');
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

const rpcError = (e: unknown) => new Error(e instanceof Error ? e.message : String(e));

// ---------- The coach's side ----------

export const pendingRequests = (list: JoinRequest[]) => list.filter((r) => r.status === 'pending');

/**
 * Turns a pending request into a trainee in onboarding, with the plan the coach picked.
 * Returns the new trainee's id. The price list stays in plans.ts, so it is passed to the
 * database rather than repeated there.
 */
export async function approveRequest(req: JoinRequest, tier: PlanTier): Promise<string> {
  const plan = planName(tier);
  const price = defaultPrice(tier, 'monthly');

  if (isRemote()) {
    if (!supabase) throw new Error('Not connected');
    const { data, error } = await supabase.rpc('approve_join_request', {
      r: req.id, tier, plan_name: plan, price, cycle: 'monthly',
    });
    if (error) throw rpcError(error);
    await reloadRemote();
    return String(data);
  }

  // Local demo mode: the same thing, in memory.
  const id = uid('t');
  const today = todayISO();
  const now = new Date().toISOString();
  const [firstName, lastName] = splitName(req.name);
  const a = req.answers;
  update((s) => {
    const trainee: Trainee = {
      id, firstName, lastName, email: req.email, phone: req.phone,
      birthDate: a.birthDate ?? '', heightCm: a.heightCm ?? 0,
      tier, status: 'onboarding', goalType: goalTypeFor(a), goals: [],
      injuries: [a.painNotes, a.medications].filter(Boolean).join('\n'),
      frequency: frequencyFor(a), checkinDay: 0, joinedAt: today, lastSeenAt: now,
      tone: s.trainees.length % 6, program: null, pinnedNote: '',
      membership: { plan, price, cycle: 'monthly', renewsOn: today, paid: false },
    };
    return {
      ...s,
      trainees: [...s.trainees, trainee],
      weights: a.weightKg ? [...s.weights, { traineeId: id, date: today, kg: a.weightKg }] : s.weights,
      joinRequests: s.joinRequests.map((r) => (r.id === req.id ? { ...r, status: 'approved' as const, traineeId: id } : r)),
    };
  });
  return id;
}

export async function declineRequest(req: JoinRequest): Promise<void> {
  if (isRemote()) {
    if (!supabase) throw new Error('Not connected');
    const { error } = await supabase.rpc('decline_join_request', { r: req.id });
    if (error) throw rpcError(error);
    await reloadRemote();
    return;
  }
  update((s) => ({
    ...s,
    joinRequests: s.joinRequests.map((r) => (r.id === req.id ? { ...r, status: 'declined' as const } : r)),
  }));
}

// ---------- The public page's side ----------
// These replace the mocked functions in web/src/site/services/, which keep requests and page
// profiles in the visitor's own browser. Same shapes, so the site only changes its imports.

/** A coach's public page, by the handle in /c/<handle> or by their account id. Null when there is no published page. */
export async function getCoachPage(handleOrId: string): Promise<{ coachId: string; handle: string; whatsapp: string; profile: Record<string, unknown> } | null> {
  if (!supabase) return null;
  const key = handleOrId.trim().toLowerCase();
  const { data, error } = await supabase
    .from('coach_pages')
    .select('coach_id, handle, whatsapp, profile')
    .or(`handle.eq.${key},coach_id.eq.${handleOrId}`)
    .eq('published', true)
    .maybeSingle();
  if (error || !data) return null;
  return { coachId: String(data.coach_id), handle: String(data.handle), whatsapp: String(data.whatsapp ?? ''), profile: (data.profile ?? {}) as Record<string, unknown> };
}

/** The coach editing their own page. Returns the saved handle, or throws when it is taken or malformed. */
export async function saveCoachPage(input: { coachId: string; handle: string; published: boolean; whatsapp: string; profile: Record<string, unknown> }): Promise<void> {
  if (!supabase) throw new Error('Not connected');
  const { error } = await supabase.from('coach_pages').upsert({
    coach_id: input.coachId, handle: input.handle.trim().toLowerCase(),
    published: input.published, whatsapp: input.whatsapp.replace(/\D/g, ''), profile: input.profile,
  });
  if (error) throw rpcError(error);
}

export interface SendJoinRequest {
  coachId: string;
  name: string;
  email: string;
  phone: string;
  answers: JoinAnswers;
  planId?: string;
  message?: string;
}

/** The visitor's request, sent as themselves. They must be signed in; the coach's page must be published. */
export async function sendJoinRequest(input: SendJoinRequest): Promise<JoinRequest> {
  if (!supabase) throw new Error('Not connected');
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sign in first');
  const { data, error } = await supabase
    .from('join_requests')
    .insert({
      coach_id: input.coachId, user_id: auth.user.id, name: input.name.trim(), email: input.email.trim(),
      phone: input.phone.replace(/\D/g, ''), answers: input.answers,
      plan_id: input.planId ?? '', message: input.message ?? '',
    })
    .select()
    .single();
  if (error) throw rpcError(error);
  return {
    id: String(data.id), name: String(data.name), email: String(data.email), phone: String(data.phone ?? ''),
    answers: (data.answers ?? {}) as JoinAnswers, planId: String(data.plan_id ?? ''), message: String(data.message ?? ''),
    status: data.status as JoinRequest['status'], sentAt: String(data.sent_at), traineeId: null,
  };
}

/** The visitor's latest request to this coach, so the page can say "already sent" instead of showing the form again. */
export async function findJoinRequest(coachId: string): Promise<JoinRequest | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('join_requests')
    .select('*')
    .eq('coach_id', coachId)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: String(data.id), name: String(data.name), email: String(data.email), phone: String(data.phone ?? ''),
    answers: (data.answers ?? {}) as JoinAnswers, planId: String(data.plan_id ?? ''), message: String(data.message ?? ''),
    status: data.status as JoinRequest['status'], sentAt: String(data.sent_at), traineeId: (data.trainee_id as string | null) ?? null,
  };
}

/** Unchanged from the site's mock: an unfinished form stays in the visitor's own browser until they send it. */
const draftKey = (coachId: string) => `coachhq:joinDraft:${coachId}`;

export function loadDraft<T>(coachId: string): Partial<T> | null {
  try {
    const raw = localStorage.getItem(draftKey(coachId));
    return raw ? (JSON.parse(raw) as Partial<T>) : null;
  } catch {
    return null;
  }
}

export function saveDraft<T>(coachId: string, draft: T): void {
  try {
    localStorage.setItem(draftKey(coachId), JSON.stringify(draft));
  } catch {
    // Storage blocked: the form still works, it just won't survive a reload.
  }
}

export const clearDraft = (coachId: string) => {
  try {
    localStorage.removeItem(draftKey(coachId));
  } catch {
    // ignore
  }
};
