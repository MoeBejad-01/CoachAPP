// Sign up in two steps: pick a role, then the account details. A coach's
// registration link (`/signup?coach=<id>`) skips straight to a trainee account
// with that coach; `?role=coach|trainee` preselects the role.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon, type IconName } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import type { StringKey } from '../../../i18n/strings';
import { Checkbox, FormAlert, PasswordField, TextField, isEmail, isPhone, isStrongPassword } from '../../components/Field';
import { Button, cx } from '../../components/ui';
import { AuthError, findCoach, homeFor, signUp, type Role } from '../../services/auth';
import { AuthShell, OrDivider, SocialButtons } from './AuthShell';

const ROLES: { id: Role; icon: IconName; title: StringKey; body: StringKey }[] = [
  { id: 'coach', icon: 'clipboard', title: 'site.signup.coach', body: 'site.signup.coachBody' },
  { id: 'trainee', icon: 'dumbbell', title: 'site.signup.trainee', body: 'site.signup.traineeBody' },
];

type Field = 'name' | 'email' | 'phone' | 'password' | 'terms';
type CoachLink = { state: 'none' } | { state: 'loading' } | { state: 'invalid' } | { state: 'ok'; id: string; name: string };

export function SignupPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const coachParam = params.get('coach');
  const roleParam = params.get('role');
  const presetRole: Role | null = coachParam ? 'trainee' : roleParam === 'coach' || roleParam === 'trainee' ? roleParam : null;

  const [role, setRole] = useState<Role | null>(presetRole);
  const [step, setStep] = useState<1 | 2>(presetRole ? 2 : 1);
  const [roleError, setRoleError] = useState(false);
  const [coach, setCoach] = useState<CoachLink>({ state: coachParam ? 'loading' : 'none' });
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '' });
  const [terms, setTerms] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<'taken' | 'unknown' | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!coachParam) return;
    let live = true;
    findCoach(coachParam).then((c) => {
      if (live) setCoach(c ? { state: 'ok', ...c } : { state: 'invalid' });
    });
    return () => { live = false; };
  }, [coachParam]);

  // Move focus to the new step's heading (not on first load).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const errors: Partial<Record<Field, string>> = {};
  if (!values.name.trim()) errors.name = t('site.auth.errName');
  if (!isEmail(values.email)) errors.email = t(values.email.trim() ? 'site.form.errEmail' : 'site.auth.errEmailRequired');
  if (values.phone.trim() && !isPhone(values.phone)) errors.phone = t('site.auth.errPhone');
  if (!isStrongPassword(values.password)) errors.password = t('site.auth.errPassword');
  if (!terms) errors.terms = t('site.auth.errTerms');
  const show = (f: Field) => (submitted || touched[f] ? errors[f] : undefined);
  const field = (f: Exclude<Field, 'terms'>) => ({
    value: values[f],
    onChange: (e: { target: { value: string } }) => setValues({ ...values, [f]: e.target.value }),
    onBlur: () => { if (values[f].trim()) setTouched({ ...touched, [f]: true }); },
    error: show(f),
  });

  const next = () => {
    if (!role) {
      setRoleError(true);
      return;
    }
    setStep(2);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFailed(null);
    const first = (['name', 'email', 'phone', 'password', 'terms'] as Field[]).find((f) => errors[f]);
    if (first || !role) {
      document.getElementById(`su-${first}`)?.focus();
      return;
    }
    setLoading(true);
    try {
      await signUp({ role, ...values, coachId: coach.state === 'ok' ? coach.id : undefined });
      setDone(true);
      window.setTimeout(() => navigate(homeFor(role)), 900);
    } catch (err) {
      setFailed(err instanceof AuthError && err.code === 'email_taken' ? 'taken' : 'unknown');
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell>
        <div className="auth-done" role="status">
          <span className="auth-done-ico"><Icon name="check" size={30} strokeWidth={2.5} /></span>
          <h1>{t('site.signup.doneTitle')}</h1>
          <p>{t('site.auth.redirecting')}</p>
        </div>
      </AuthShell>
    );
  }

  const progress = (
    <div className="auth-steps" aria-hidden="true">
      <span className="on" /><span className={step === 2 ? 'on' : undefined} />
    </div>
  );

  if (step === 1) {
    return (
      <AuthShell>
        {progress}
        <div className="auth-head">
          <p className="auth-step">{t('site.signup.step', { n: 1 })}</p>
          <h1 ref={heading} tabIndex={-1}>{t('site.signup.title')}</h1>
          <p>{t('site.signup.lead')}</p>
        </div>
        <fieldset className="roles" aria-describedby={roleError ? 'role-err' : undefined}>
          <legend className="sr-only">{t('site.signup.roleLegend')}</legend>
          {ROLES.map((r) => (
            <label key={r.id} className={cx('role', role === r.id && 'is-on')}>
              <input type="radio" name="role" value={r.id} checked={role === r.id}
                onChange={() => { setRole(r.id); setRoleError(false); }} />
              <span className="role-ico"><Icon name={r.icon} size={24} /></span>
              <span className="role-text">
                <b>{t(r.title)}</b>
                <span>{t(r.body)}</span>
              </span>
              <span className="role-tick" aria-hidden="true"><Icon name="check" size={14} strokeWidth={3} /></span>
            </label>
          ))}
        </fieldset>
        {roleError && <p id="role-err" className="s-err" role="alert"><Icon name="alert" size={14} strokeWidth={2} />{t('site.auth.errRole')}</p>}
        <Button size="lg" block onClick={next}>{t('site.signup.continue')}<Icon name="arrow" size={18} strokeWidth={2} /></Button>
        <p className="auth-switch">
          {t('site.signup.haveAccount')} <Link to="/login">{t('site.nav.login')}</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      {progress}
      <div className="auth-head">
        <p className="auth-step">{t('site.signup.step', { n: 2 })}</p>
        <h1 ref={heading} tabIndex={-1}>{t(role === 'coach' ? 'site.signup.titleCoach' : 'site.signup.titleTrainee')}</h1>
      </div>

      {coach.state === 'loading' && <p className="auth-invite is-loading" role="status"><span className="s-spinner" aria-hidden="true" />{t('site.signup.checkingLink')}</p>}
      {coach.state === 'ok' && (
        <div className="auth-invite" role="status">
          <span className="auth-invite-av" aria-hidden="true">{coach.name.slice(0, 1)}</span>
          <div>
            <b>{t('site.signup.joining', { name: coach.name })}</b>
            <span>{t('site.signup.joiningBody')}</span>
          </div>
        </div>
      )}
      {coach.state === 'invalid' && <FormAlert tone="info">{t('site.signup.badLink')}</FormAlert>}
      {coach.state === 'none' && role && (
        <div className="auth-role">
          <span><Icon name={role === 'coach' ? 'clipboard' : 'dumbbell'} size={16} />{t(role === 'coach' ? 'site.signup.asCoach' : 'site.signup.asTrainee')}</span>
          <button type="button" onClick={() => setStep(1)}>{t('site.signup.change')}</button>
        </div>
      )}

      <SocialButtons />
      <OrDivider />

      <form className="auth-form" onSubmit={submit} noValidate>
        {failed === 'taken' && <FormAlert>{t('site.auth.errTaken')} <Link to="/login">{t('site.nav.login')}</Link></FormAlert>}
        {failed === 'unknown' && <FormAlert>{t('site.form.errSend')}</FormAlert>}
        <TextField id="su-name" label={t('site.auth.name')} autoComplete="name" {...field('name')} />
        <TextField id="su-email" label={t('site.form.email')} type="email" inputMode="email" autoComplete="email" dir="ltr" {...field('email')} />
        <TextField id="su-phone" label={t('site.auth.phone')} optional={t('site.auth.optional')} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" {...field('phone')} />
        <PasswordField id="su-password" label={t('site.auth.password')} autoComplete="new-password" hint={t('site.auth.passwordHint')} {...field('password')} />
        <Checkbox id="su-terms" checked={terms} onChange={(v) => { setTerms(v); setTouched({ ...touched, terms: true }); }} error={show('terms')}>
          {t('site.signup.terms')}
        </Checkbox>
        <Button type="submit" size="lg" block loading={loading}>{t(loading ? 'site.signup.submitting' : 'site.signup.submit')}</Button>
      </form>
      <p className="auth-switch">
        {t('site.signup.haveAccount')} <Link to="/login">{t('site.nav.login')}</Link>
      </p>
    </AuthShell>
  );
}
