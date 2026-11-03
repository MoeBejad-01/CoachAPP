// Form controls for the contact form and the auth pages: labelled, with inline
// errors wired to aria-invalid / aria-describedby.

import { useState, type InputHTMLAttributes, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';
import { Icon } from '../../components/Icon';
import { useI18n } from '../../i18n';
import { cx } from './ui';

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
export const isStrongPassword = (s: string) => s.length >= 8 && /[A-Za-z؀-ۿ]/.test(s) && /\d/.test(s);
export const isPhone = (s: string) => /^\+?[\d\s()-]{7,20}$/.test(s.trim()) && s.replace(/\D/g, '').length >= 7;

interface FieldBits {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  /** Shown after the label, e.g. "(optional)". */
  optional?: string;
}

const describedBy = (id: string, error?: string, hint?: string) =>
  [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;

function Wrap({ id, label, error, hint, optional, children }: FieldBits & { children: ReactNode }) {
  return (
    <div className={cx('s-field', error && 'has-error')}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="s-opt"> {optional}</span>}
      </label>
      {children}
      {hint && <p id={`${id}-hint`} className="s-hint">{hint}</p>}
      {error && <p id={`${id}-err`} className="s-err"><Icon name="alert" size={14} strokeWidth={2} />{error}</p>}
    </div>
  );
}

export function TextField({ id, label, error, hint, optional, ref, ...input }:
  FieldBits & InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <Wrap id={id} label={label} error={error} hint={hint} optional={optional}>
      <input ref={ref} id={id} {...input} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} />
    </Wrap>
  );
}

export function TextArea({ id, label, error, hint, optional, ...input }: FieldBits & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Wrap id={id} label={label} error={error} hint={hint} optional={optional}>
      <textarea id={id} {...input} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} />
    </Wrap>
  );
}

export function PasswordField({ id, label, error, hint, ...input }: FieldBits & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  return (
    <Wrap id={id} label={label} error={error} hint={hint}>
      <div className="s-pw">
        <input id={id} {...input} type={shown ? 'text' : 'password'} dir="ltr"
          aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} />
        <button type="button" className="s-pw-toggle" onClick={() => setShown(!shown)}
          aria-label={t(shown ? 'site.auth.hidePassword' : 'site.auth.showPassword')} aria-controls={id}>
          <Icon name={shown ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>
    </Wrap>
  );
}

export function Checkbox({ id, checked, onChange, error, children }: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx('s-checkfield', error && 'has-error')}>
      <label className="s-check" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} />
        <span className="s-check-box" aria-hidden="true"><Icon name="check" size={13} strokeWidth={3} /></span>
        <span>{children}</span>
      </label>
      {error && <p id={`${id}-err`} className="s-err"><Icon name="alert" size={14} strokeWidth={2} />{error}</p>}
    </div>
  );
}

export function FormAlert({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success'; children: ReactNode }) {
  return (
    <div className={`s-alert s-alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={tone === 'success' ? 'check' : 'alert'} size={18} strokeWidth={2} />
      <div>{children}</div>
    </div>
  );
}
