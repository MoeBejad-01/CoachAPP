// Building blocks shared by the public site's pages.

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { useReveal } from '../motion';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

// ---------- Buttons ----------

type Variant = 'primary' | 'secondary' | 'ghost' | 'onDark';
type Size = 'sm' | 'md' | 'lg';

interface Look {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

const btnClass = ({ variant = 'primary', size = 'md', block }: Look, extra?: string) =>
  cx('s-btn', `s-btn--${variant}`, size !== 'md' && `s-btn--${size}`, block && 's-btn--block', extra);

export function Button({ variant, size, block, loading = false, className, children, disabled, type = 'button', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & Look & { loading?: boolean }) {
  return (
    <button {...rest} type={type} className={btnClass({ variant, size, block }, className)}
      disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading && <span className="s-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, block, className, ...rest }: LinkProps & Look) {
  return <Link {...rest} className={btnClass({ variant, size, block }, className)} />;
}

export function ButtonAnchor({ variant, size, block, className, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & Look) {
  return <a {...rest} className={btnClass({ variant, size, block }, className)} />;
}

// ---------- Sections ----------

export function Section({ id, tone, className, labelledBy, children }: {
  id?: string;
  /** `alt` is the soft grey band, `tint` the light blue one. */
  tone?: 'alt' | 'tint';
  className?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cx('s-section', tone && `s-section--${tone}`, className)} aria-labelledby={labelledBy}>
      <div className="s-container">{children}</div>
    </section>
  );
}

export function SectionHeader({ id, eyebrow, title, lead, align = 'center' }: {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: 'center' | 'start';
}) {
  const [ref, shown] = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={cx('s-head s-reveal', shown && 'is-in', align === 'start' && 's-head--start')}>
      {eyebrow && <p className="s-eyebrow">{eyebrow}</p>}
      <h2 id={id} className="s-h2">{title}</h2>
      {lead && <p className="s-lead">{lead}</p>}
    </div>
  );
}

/** Fades and slides its content up the first time it scrolls into view. */
export function Reveal({ delay = 0, className, style, children }: {
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [ref, shown] = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={cx('s-reveal', shown && 'is-in', className)} style={{ ...style, '--reveal-delay': `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

/** `Reveal` for list items. */
export function RevealItem({ delay = 0, className, style, children }: {
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [ref, shown] = useReveal<HTMLLIElement>();
  return (
    <li ref={ref} className={cx('s-reveal', shown && 'is-in', className)} style={{ ...style, '--reveal-delay': `${delay}ms` } as CSSProperties}>
      {children}
    </li>
  );
}
