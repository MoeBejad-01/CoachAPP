// Sign-in and sign-up for coaches (dashboard) and trainees (app), plus the screens shown while the
// account loads or when it isn't linked to anything yet.

import { useState, type FormEvent, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';
import { useAuth } from './AuthProvider';

type Kind = 'coach' | 'trainee';

/** Translates the common Supabase auth errors; anything else is shown as sent. */
function authMessage(msg: string, t: ReturnType<typeof useI18n>['t']): string {
  if (/invalid login credentials/i.test(msg)) return t('auth.err.credentials');
  if (/email not confirmed/i.test(msg)) return t('auth.err.unconfirmed');
  if (/already registered|already exists/i.test(msg)) return t('auth.err.exists');
  if (/password should be at least|weak password/i.test(msg)) return t('auth.err.weak');
  if (/rate limit|too many/i.test(msg)) return t('auth.err.rate');
  return msg;
}

export function AuthForm({ kind }: { kind: Kind }) {
  const { t, lang, setLang } = useI18n();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    const redirect = `${window.location.origin}${kind === 'coach' ? '/' : '/app'}`;
    const res = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirect, data: kind === 'coach' ? { role: 'coach', name: name.trim() } : { role: 'trainee' } } });
    setBusy(false);
    if (res.error) return setError(authMessage(res.error.message, t));
    // Sign-up with email confirmation returns no session until the link is clicked.
    if (mode === 'up' && !res.data.session) setSent(true);
  };

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 8 && (mode === 'in' || kind === 'trainee' || name.trim().length > 0);

  return (
    <div className="auth-card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="auth-brand">Coach HQ</span>
        <button type="button" className="btn ghost sm" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Icon name="globe" size={15} />{t('nav.switchLang')}</button>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="auth-title">{t(kind === 'coach' ? (mode === 'in' ? 'auth.coachIn' : 'auth.coachUp') : (mode === 'in' ? 'auth.traineeIn' : 'auth.traineeUp'))}</h1>
        <p className="small muted" style={{ lineHeight: 1.5 }}>{t(kind === 'coach' ? 'auth.coachSub' : mode === 'in' ? 'auth.traineeSub' : 'auth.traineeUpSub')}</p>
      </div>

      {sent ? (
        <div className="auth-note">
          <Icon name="check" size={18} />
          <span>{t('auth.checkEmail', { email: email.trim() })}</span>
        </div>
      ) : (
        <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
          {mode === 'up' && kind === 'coach' && (
            <label className="field">{t('settings.name')}<input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
          )}
          <label className="field">{t('form.email')}<input className="input" type="email" dir="ltr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="field">{t('auth.password')} {mode === 'up' && <span className="hint">{t('auth.passwordHint')}</span>}
            <input className="input" type="password" dir="ltr" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div className="tb-warn">{error}</div>}
          <button type="submit" className="btn primary" style={{ height: 44 }} disabled={!valid || busy}>{busy ? t('auth.wait') : t(mode === 'in' ? 'auth.signIn' : 'auth.createAccount')}</button>
        </form>
      )}

      <button type="button" className="link-btn" style={{ alignSelf: 'center' }} onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(''); setSent(false); }}>
        {t(mode === 'in' ? (kind === 'coach' ? 'auth.toCoachUp' : 'auth.toTraineeUp') : 'auth.toSignIn')}
      </button>
    </div>
  );
}

/** Full-page wrapper for the coach side (dark, centred). */
export function CoachAuthPage({ children }: { children?: ReactNode }) {
  return <div className="shell auth-shell" data-theme="dark">{children ?? <AuthForm kind="coach" />}</div>;
}

/** Trainee side: the same phone frame as the app. */
export function TraineeAuthPage({ children }: { children?: ReactNode }) {
  return (
    <div className="ta-stage">
      <div className="ta-phone"><div className="ta-app"><div className="ta-scroll"><div className="ta-auth">{children ?? <AuthForm kind="trainee" />}</div></div></div></div>
    </div>
  );
}

export function LoadingScreen() {
  const { t } = useI18n();
  return <div className="auth-loading"><span className="ai-spinner" aria-hidden="true" /><span className="small muted">{t('auth.loading')}</span></div>;
}

/** Signed in, but the account is neither a coach nor linked to a trainee profile (or loading failed). */
export function AccountProblem() {
  const { t } = useI18n();
  const { status, email, error, signOut, refresh } = useAuth();
  return (
    <div className="auth-card">
      <span className="auth-brand">Coach HQ</span>
      <h1 className="auth-title">{t(status === 'error' ? 'auth.loadFailed' : 'auth.notLinked')}</h1>
      <p className="small muted" style={{ lineHeight: 1.55 }}>{status === 'error' ? error : t('auth.notLinkedBody', { email: email ?? '' })}</p>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn" onClick={() => void refresh()}>{t('ai.retry')}</button>
        <button type="button" className="btn primary" onClick={() => void signOut()}>{t('auth.signOut')}</button>
      </div>
    </div>
  );
}
