// A trainee's request to join a coach, with the intake answers the coach
// needs. MOCKED: requests and unfinished drafts are kept in this browser
// (`coachhq:joinRequests`, `coachhq:joinDraft:*`). A backend replaces these
// functions; what the coach does with a request comes later.

import type { FitGoal } from '../coach/types';
import type { MuscleGroup } from '../components/anatomy/shapes';

export type Gender = 'male' | 'female' | 'unsaid';
export type Activity = 'desk' | 'mixed' | 'active';
export type Experience = 'new' | 'under1' | 'one3' | 'over3';
export type TrainingPlace = 'gym' | 'home' | 'both';
export type Condition = 'none' | 'heart' | 'bp' | 'diabetes' | 'asthma' | 'joints' | 'pregnancy' | 'other';
export type StartWhen = 'asap' | 'twoWeeks' | 'month';

/** What the coach receives. Measurements are always metric (cm, kg). */
export interface IntakeAnswers {
  name: string;
  birthDate: string;
  gender: Gender;
  phone: string;
  city: string;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number | null;
  targetWeightKg: number | null;
  activity: Activity;
  sleepHours: number | null;
  goal: FitGoal | 'health';
  experience: Experience;
  /** Weekdays they can train, 0 = Sunday. */
  days: number[];
  sessionMinutes: number;
  place: TrainingPlace;
  lifts: { squat: number | null; bench: number | null; deadlift: number | null };
  painAreas: MuscleGroup[];
  painNotes: string;
  conditions: Condition[];
  medications: string;
  /** A plan or program id from the coach's page, or 'unsure'. */
  planId: string;
  start: StartWhen;
  message: string;
  /** The units the trainee filled the form in, so the coach can answer in kind. */
  units: 'metric' | 'imperial';
}

export interface JoinRequest {
  id: string;
  coachId: string;
  traineeAccountId: string;
  email: string;
  sentAt: string;
  status: 'pending';
  answers: IntakeAnswers;
}

const REQUESTS_KEY = 'coachhq:joinRequests';
const draftKey = (coachId: string, accountId: string) => `coachhq:joinDraft:${coachId}:${accountId}`;

function readRequests(): JoinRequest[] {
  try {
    return JSON.parse(localStorage.getItem(REQUESTS_KEY) ?? '[]') as JoinRequest[];
  } catch {
    return [];
  }
}

/** The trainee's latest request to this coach, if they've sent one. */
export function findJoinRequest(coachId: string, accountId: string): JoinRequest | null {
  return readRequests().filter((r) => r.coachId === coachId && r.traineeAccountId === accountId).at(-1) ?? null;
}

export async function sendJoinRequest(req: Omit<JoinRequest, 'id' | 'sentAt' | 'status'>): Promise<JoinRequest> {
  await new Promise((r) => setTimeout(r, 900));
  const sent: JoinRequest = { ...req, id: `jr_${Date.now().toString(36)}`, sentAt: new Date().toISOString(), status: 'pending' };
  try {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify([...readRequests(), sent]));
    localStorage.removeItem(draftKey(req.coachId, req.traineeAccountId));
  } catch {
    // Storage blocked: the confirmation still shows.
  }
  return sent;
}

/** Unfinished form, so a trainee who leaves halfway doesn't start over. */
export function loadDraft<T>(coachId: string, accountId: string): Partial<T> | null {
  try {
    const raw = localStorage.getItem(draftKey(coachId, accountId));
    return raw ? (JSON.parse(raw) as Partial<T>) : null;
  } catch {
    return null;
  }
}

export function saveDraft<T>(coachId: string, accountId: string, draft: T) {
  try {
    localStorage.setItem(draftKey(coachId, accountId), JSON.stringify(draft));
  } catch {
    // ignore
  }
}
