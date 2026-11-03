import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import type { StringKey } from '../../../i18n/strings';
import { CONTACT_EMAIL, SOCIALS } from '../../config/site';
import { FormAlert, TextArea, TextField, isEmail } from '../../components/Field';
import { Button, Reveal, Section, SectionHeader } from '../../components/ui';
import { sendContactMessage } from '../../services/contact';

type Field = 'name' | 'email' | 'message';
type Errors = Partial<Record<Field, StringKey>>;

function validate(v: Record<Field, string>): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = 'site.form.errName';
  if (!isEmail(v.email)) e.email = 'site.form.errEmail';
  if (v.message.trim().length < 10) e.message = 'site.form.errMessage';
  return e;
}

/** `prefill` changes (with a new `nonce`) when another section, e.g. Pricing, wants to start a message. */
export function Contact({ prefill }: { prefill?: { message: string; nonce: number } }) {
  const { t } = useI18n();
  return (
    <Section id="contact" tone="alt" labelledBy="contact-title" className="contact">
      <div className="contact-grid">
        <div className="contact-info">
          <SectionHeader id="contact-title" align="start" eyebrow={t('site.contact.eyebrow')} title={t('site.contact.title')} lead={t('site.contact.lead')} />
          <Reveal className="contact-reach" delay={120}>
            <a className="contact-mail" href={`mailto:${CONTACT_EMAIL}`}>
              <span className="s-ico s-ico--brand"><Icon name="mail" size={20} /></span>
              <span>
                <span className="contact-k">{t('site.contact.emailLabel')}</span>
                <span className="contact-v" dir="ltr">{CONTACT_EMAIL}</span>
              </span>
            </a>
            <p className="contact-k">{t('site.contact.follow')}</p>
            <ul className="s-socials">
              {SOCIALS.map((s) => (
                <li key={s.id}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="s-icon-btn s-icon-btn--lg"
                    aria-label={t('site.social.on', { network: s.name })}>
                    <Icon name={s.icon} size={20} />
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <Reveal delay={160}>
          <ContactForm prefill={prefill} />
        </Reveal>
      </div>
    </Section>
  );
}

function ContactForm({ prefill }: { prefill?: { message: string; nonce: number } }) {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', message: '' });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState<{ name: string; email: string } | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!prefill) return;
    setSent(null);
    setValues((v) => ({ ...v, message: prefill.message }));
    // Wait for the scroll to the section to start before moving focus.
    const id = window.setTimeout(() => nameInput.current?.focus({ preventScroll: true }), 450);
    return () => window.clearTimeout(id);
  }, [prefill?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const errors = validate(values);
  const shown = (f: Field) => ((submitted || touched[f]) && errors[f] ? t(errors[f]!) : undefined);
  const set = (f: Field) => (e: { target: { value: string } }) => setValues({ ...values, [f]: e.target.value });
  // Empty fields only complain on submit, so a blur can't shift the button out from under a click.
  const blur = (f: Field) => () => { if (values[f].trim()) setTouched({ ...touched, [f]: true }); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFailed(false);
    const first = (['name', 'email', 'message'] as Field[]).find((f) => errors[f]);
    if (first) {
      document.getElementById(`cf-${first}`)?.focus();
      return;
    }
    setSending(true);
    try {
      await sendContactMessage({ name: values.name.trim(), email: values.email.trim(), message: values.message.trim() });
      setSent({ name: values.name.trim().split(/\s+/)[0], email: values.email.trim() });
      setValues({ name: '', email: '', message: '' });
      setTouched({});
      setSubmitted(false);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="s-card contact-form contact-sent" role="status">
        <span className="contact-sent-ico"><Icon name="check" size={30} strokeWidth={2.5} /></span>
        <h3>{t('site.form.sentTitle', { name: sent.name })}</h3>
        <p>{t('site.form.sentBody', { email: sent.email })}</p>
        <Button variant="secondary" onClick={() => setSent(null)}>{t('site.form.another')}</Button>
      </div>
    );
  }

  return (
    <form className="s-card contact-form" onSubmit={submit} noValidate aria-labelledby="contact-title">
      {failed && <FormAlert>{t('site.form.errSend')}</FormAlert>}
      <TextField ref={nameInput} id="cf-name" label={t('site.form.name')} autoComplete="name" value={values.name}
        onChange={set('name')} onBlur={blur('name')} error={shown('name')} />
      <TextField id="cf-email" label={t('site.form.email')} type="email" inputMode="email" autoComplete="email" dir="ltr"
        value={values.email} onChange={set('email')} onBlur={blur('email')} error={shown('email')} />
      <TextArea id="cf-message" label={t('site.form.message')} rows={5} placeholder={t('site.form.messageHint')}
        value={values.message} onChange={set('message')} onBlur={blur('message')} error={shown('message')} />
      <Button type="submit" size="lg" loading={sending}>
        {t(sending ? 'site.form.sending' : 'site.form.send')}
        {!sending && <Icon name="send" size={17} strokeWidth={2} />}
      </Button>
    </form>
  );
}
