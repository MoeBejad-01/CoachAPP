import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { RosterGroup } from '../data/selectors';
import type { Trainee } from '../data/types';
import { initials, TONES } from '../lib/util';
import { useT } from '../i18n';
import { Icon } from './Icon';

export function Avatar({ trainee, size = 34 }: { trainee: Pick<Trainee, 'firstName' | 'lastName' | 'tone'>; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: TONES[trainee.tone % TONES.length], fontSize: size > 44 ? 18 : 12 }}>
      {initials(trainee.firstName, trainee.lastName)}
    </span>
  );
}

const GROUP_CLS: Record<RosterGroup, string> = {
  active: 'chip ok',
  attention: 'chip warn',
  onboarding: 'chip accent',
  paused: 'chip',
  inactive: 'chip',
};

export function GroupChip({ group }: { group: RosterGroup }) {
  const t = useT();
  return <span className={GROUP_CLS[group]}>{t(`group.${group}`)}</span>;
}

export function Bar({ pct, tone, thick }: { pct: number; tone?: 'warn' | 'grey'; thick?: boolean }) {
  return (
    <span className={['bar', tone, thick && 'thick'].filter(Boolean).join(' ')}>
      <span style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </span>
  );
}

export function Card({ title, action, children, className = '', label }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; label?: string }) {
  return (
    <section className={`card ${className}`} aria-label={label ?? (typeof title === 'string' ? title : undefined)}>
      {(title || action) && (
        <div className="card-head">
          <h2 className="card-title">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Modal({ title, onClose, children, footer, wide, xl }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; xl?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${xl ? 'xl' : wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <h2 className="card-title">{title}</h2>
          <button type="button" className="btn ghost sm icon" aria-label={t('common.close')} onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
