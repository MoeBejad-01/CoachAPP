import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import { Checkbox, FormAlert, PasswordField, TextField, isEmail } from '../../components/Field';
import { Button } from '../../components/ui';
import { AuthError, DEMO_ACCOUNTS, homeFor, logIn, type Role } from '../../services/auth';
import { AuthShell, OrDivider, SocialButtons } from './AuthShell';

export function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<'invalid' | 'unknown' | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null);

  const errors = {
    email: !isEmail(email) ? t(email.trim() ? 'site.form.errEmail' : 'site.auth.errEmailRequired') : undefined,
    password: !password ? t('site.auth.errPasswordRequired') : undefined,
  };
  const show = (f: keyof typeof errors) => (submitted || touched[f] ? errors[f] : undefined);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFailed(null);
    if (errors.email || errors.password) {
      document.getElementById(errors.email ? 'login-email' : 'login-password')?.focus();
      return;
    }
    setLoading(true);
    try {
      const session = await logIn({ email, password, remember });
      setWelcome(session.name.split(' ')[0]);
      window.setTimeout(() => navigate(homeFor(session.role)), 700);
    } catch (err) {
      setFailed(err instanceof AuthError && err.code === 'invalid_credentials' ? 'invalid' : 'unknown');
      setLoading(false);
    }
  };

  const fillDemo = (role: Role) => {
    setEmail(DEMO_ACCOUNTS[role].email);
    setPassword(DEMO_ACCOUNTS[role].password);
    setFailed(null);
  };

  if (welcome) {
    return (
      <AuthShell>
        <div className="auth-done" role="status">
          <span className="auth-done-ico"><Icon name="check" size={30} strokeWidth={2.5} /></span>
          <h1>{t('site.auth.welcome', { name: welcome })}</h1>
          <p>{t('site.auth.redirecting')}</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="auth-head">
        <h1>{t('site.login.title')}</h1>
        <p>{t('site.login.lead')}</p>
      </div>
      <SocialButtons />
      <OrDivider />
      <form className="auth-form" onSubmit={submit} noValidate>
        {failed && <FormAlert>{t(failed === 'invalid' ? 'site.login.invalid' : 'site.form.errSend')}</FormAlert>}
        <TextField id="login-email" label={t('site.form.email')} type="email" inputMode="email" autoComplete="email" dir="ltr"
          value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => email.trim() && setTouched({ ...touched, email: true })} error={show('email')} />
        <PasswordField id="login-password" label={t('site.auth.password')} autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => password && setTouched({ ...touched, password: true })} error={show('password')} />
        <div className="auth-row">
          <Checkbox id="login-remember" checked={remember} onChange={setRemember}>{t('site.login.remember')}</Checkbox>
          <Link to="/forgot-password" className="auth-link">{t('site.login.forgot')}</Link>
        </div>
        <Button type="submit" size="lg" block loading={loading}>{t(loading ? 'site.login.submitting' : 'site.login.submit')}</Button>
      </form>
      <div className="auth-demo">
        <span>{t('site.auth.demo')}</span>
        <button type="button" onClick={() => fillDemo('coach')}>{t('site.auth.demoCoach')}</button>
        <button type="button" onClick={() => fillDemo('trainee')}>{t('site.auth.demoTrainee')}</button>
      </div>
      <p className="auth-switch">
        {t('site.login.noAccount')} <Link to="/signup">{t('site.login.create')}</Link>
      </p>
    </AuthShell>
  );
}
