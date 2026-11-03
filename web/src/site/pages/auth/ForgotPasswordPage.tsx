import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import { TextField, isEmail } from '../../components/Field';
import { Button, ButtonLink } from '../../components/ui';
import { requestPasswordReset } from '../../services/auth';
import { AuthShell } from './AuthShell';

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const error = !isEmail(email) ? t(email.trim() ? 'site.form.errEmail' : 'site.auth.errEmailRequired') : undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (error) {
      document.getElementById('fp-email')?.focus();
      return;
    }
    setLoading(true);
    await requestPasswordReset(email);
    setLoading(false);
    setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <AuthShell>
        <div className="auth-done" role="status">
          <span className="auth-done-ico"><Icon name="mail" size={28} strokeWidth={2} /></span>
          <h1>{t('site.forgot.sentTitle')}</h1>
          <p>{t('site.forgot.sentBody', { email: sentTo })}</p>
          <ButtonLink to="/login" variant="secondary" block>{t('site.forgot.back')}</ButtonLink>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="auth-head">
        <h1>{t('site.forgot.title')}</h1>
        <p>{t('site.forgot.lead')}</p>
      </div>
      <form className="auth-form" onSubmit={submit} noValidate>
        <TextField id="fp-email" label={t('site.form.email')} type="email" inputMode="email" autoComplete="email" dir="ltr"
          value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(!!email.trim())}
          error={submitted || touched ? error : undefined} />
        <Button type="submit" size="lg" block loading={loading}>{t(loading ? 'site.form.sending' : 'site.forgot.submit')}</Button>
      </form>
      <p className="auth-switch"><Link to="/login">{t('site.forgot.back')}</Link></p>
    </AuthShell>
  );
}
