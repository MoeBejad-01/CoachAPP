// Coach page profiles. MOCKED: the demo coach is built in, a coach who signs
// up gets a starter profile from their account, and edits are kept in this
// browser. A backend replaces these functions; the coach page only uses them.

import { DEMO_COACH } from '../coach/demoCoach';
import type { CoachProfile } from '../coach/types';
import { findCoach } from './auth';

const SAVED_KEY = 'coachhq:coachProfiles';

function readSaved(): Record<string, CoachProfile> {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '{}') as Record<string, CoachProfile>;
  } catch {
    return {};
  }
}

/** A new coach's page before they fill it in: just their name, ready to edit. */
function starterProfile(id: string, name: string): CoachProfile {
  return {
    id,
    handle: id,
    name: { en: name },
    title: { en: '' },
    location: { en: '' },
    tagline: { en: '' },
    languages: [],
    currency: 'SAR',
    sections: ['numbers', 'story', 'platform', 'results', 'method', 'programs', 'plans', 'inbox', 'intro', 'faq'],
    stats: [],
    results: [],
    method: [],
    programs: [],
    plans: [],
    inbox: [],
    faq: [],
    socials: [],
  };
}

/** Finds a coach page by its handle (/c/omar) or the coach's account id. */
export async function getCoachProfile(handleOrId: string): Promise<CoachProfile | null> {
  const key = handleOrId.toLowerCase();
  const saved = Object.values(readSaved()).find((p) => p.handle === key || p.id === handleOrId);
  if (saved) return saved;
  if (key === DEMO_COACH.handle || handleOrId === DEMO_COACH.id) return DEMO_COACH;
  const account = await findCoach(handleOrId);
  return account ? starterProfile(account.id, account.name) : null;
}

/** Stores the coach's changes. Returns false when the browser couldn't keep them. */
export function saveCoachProfile(profile: CoachProfile): boolean {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify({ ...readSaved(), [profile.id]: profile }));
    return true;
  } catch {
    return false;
  }
}

export type PhotoError = 'type' | 'size' | 'read';

export class PhotoUploadError extends Error {
  constructor(public code: PhotoError) {
    super(code);
  }
}

/**
 * MOCKED upload: crops the image to the page's 4:5 portrait frame, scales it
 * down and returns it as a data URL. A backend would store the file and
 * return its URL instead.
 */
export async function uploadCoachPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new PhotoUploadError('type');
  if (file.size > 15 * 1024 * 1024) throw new PhotoUploadError('size');
  let img: ImageBitmap;
  try {
    img = await createImageBitmap(file);
  } catch {
    throw new PhotoUploadError('read');
  }
  const frame = 4 / 5;
  // Crop to 4:5; when trimming height, keep more of the top so the face stays in.
  let sw = img.width;
  let sh = img.height;
  let sx = 0;
  let sy = 0;
  if (sw / sh > frame) {
    sw = sh * frame;
    sx = (img.width - sw) / 2;
  } else {
    sh = sw / frame;
    sy = (img.height - sh) * 0.25;
  }
  const scale = Math.min(1, 960 / sw);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  img.close();
  return canvas.toDataURL('image/jpeg', 0.86);
}

export const coachPageUrl = (p: Pick<CoachProfile, 'handle'>) => `/c/${p.handle}`;

/**
 * Where "Join" leads: the intake form for this coach, optionally with a plan
 * or program picked. Visitors who aren't signed in are sent to sign up first.
 */
export const joinUrl = (p: Pick<CoachProfile, 'handle'>, planId?: string) =>
  `/join/${encodeURIComponent(p.handle)}${planId ? `?plan=${encodeURIComponent(planId)}` : ''}`;

/** MOCKED: intro call requests are kept in this browser under `coachhq:introCalls`. */
export async function requestIntroCall(req: { coachId: string; at: string; name: string; phone: string }): Promise<void> {
  await new Promise((r) => setTimeout(r, 800));
  try {
    const all = JSON.parse(localStorage.getItem('coachhq:introCalls') ?? '[]') as unknown[];
    localStorage.setItem('coachhq:introCalls', JSON.stringify([...all, { ...req, requestedAt: new Date().toISOString() }]));
  } catch {
    // Storage blocked: the confirmation still shows.
  }
}
