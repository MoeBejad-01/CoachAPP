// Who is signed in, and as what. Without Supabase settings the app runs in local demo mode.
// With them: a coach account (has a coaches row) or a trainee account (linked to the profile their
// coach created, by verified email). The signed-in user's data is loaded into the store once known.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { startRemote, stopRemote } from '../data/store';
import type { Role } from '../data/remote';

export type AuthStatus = 'local' | 'loading' | 'signedOut' | 'ready' | 'noProfile' | 'error';

interface Auth {
  status: AuthStatus;
  role: Role | null;
  userId: string | null;
  email: string | null;
  /** The signed-in trainee's profile id (trainee accounts only). */
  traineeId: string | null;
  error: string | null;
  signOut: () => Promise<void>;
  /** Re-run role detection, e.g. after the coach profile is created. */
  refresh: () => Promise<void>;
}

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'local');
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [traineeId, setTraineeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!supabase) return;
    if (!s) {
      stopRemote();
      setRole(null);
      setTraineeId(null);
      setStatus('signedOut');
      return;
    }
    setStatus('loading');
    try {
      const uid = s.user.id;
      const { data: coach } = await supabase.from('coaches').select('id').eq('id', uid).maybeSingle();
      if (coach) {
        await startRemote(supabase, 'coach', uid);
        setRole('coach');
        setTraineeId(null);
        setStatus('ready');
        return;
      }
      // Trainee: link to the coach-created profile with this verified email (no-op once linked).
      const { data: linked, error: claimErr } = await supabase.rpc('claim_trainee_profile');
      if (claimErr) throw claimErr;
      if (linked) {
        await startRemote(supabase, 'trainee', uid);
        setRole('trainee');
        setTraineeId(linked as string);
        setStatus('ready');
        return;
      }
      setRole(null);
      setStatus('noProfile');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let current: string | null = null;
    void supabase.auth.getSession().then(({ data }) => { current = data.session?.user.id ?? null; void resolve(data.session); });
    // Only react to sign-in / sign-out changes, not to the hourly token refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      const id = s?.user.id ?? null;
      if (id !== current) { current = id; void resolve(s); }
    });
    return () => sub.subscription.unsubscribe();
  }, [resolve]);

  const signOut = useCallback(async () => { await supabase?.auth.signOut(); }, []);
  const refresh = useCallback(async () => { await resolve(session); }, [resolve, session]);

  return (
    <Ctx.Provider value={{ status, role, userId: session?.user.id ?? null, email: session?.user.email ?? null, traineeId, error, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
