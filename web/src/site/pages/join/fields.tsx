// Controls for the join form: picture-card choices, pill groups and number
// inputs with a unit. Errors and hints follow the site's Field components.

import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from '../../../components/Icon';
import { describedBy, Wrap } from '../../components/Field';
import { cx } from '../../components/ui';

function GroupError({ id, error }: { id: string; error?: string }) {
  return error ? <p id={`${id}-err`} className="s-err"><Icon name="alert" size={14} strokeWidth={2} />{error}</p> : null;
}

/** One choice from a few large cards (real radio inputs underneath). */
export function ChoiceCards<V extends string>({ id, legend, value, options, onChange, error, columns = 2 }: {
  id: string;
  legend: string;
  value: V | '';
  options: { value: V; icon: IconName; title: string; hint?: string }[];
  onChange: (v: V) => void;
  error?: string;
  columns?: number;
}) {
  return (
    <fieldset id={id} className={cx('jf-group', error && 'has-error')} aria-describedby={error ? `${id}-err` : undefined} tabIndex={-1}>
      <legend className="jf-legend">{legend}</legend>
      <div className={cx('jf-cards', columns >= 3 && 'jf-cards--stack')} style={{ '--cols': columns } as CSSProperties}>
        {options.map((o) => (
          <label key={o.value} className={cx('jf-card', value === o.value && 'is-on')}>
            <input type="radio" name={id} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="jf-card-ico"><Icon name={o.icon} size={20} /></span>
            <span className="jf-card-text">
              <b>{o.title}</b>
              {o.hint && <span>{o.hint}</span>}
            </span>
            <span className="jf-tick" aria-hidden="true"><Icon name="check" size={12} strokeWidth={3} /></span>
          </label>
        ))}
      </div>
      <GroupError id={id} error={error} />
    </fieldset>
  );
}

interface PillBits<V> {
  id: string;
  label: string;
  hint?: string;
  optional?: string;
  options: { value: V; label: ReactNode; title?: string }[];
  error?: string;
}

function PillGroup<V extends string | number>({ id, label, hint, optional, options, error, isOn, toggle }:
  PillBits<V> & { isOn: (v: V) => boolean; toggle: (v: V) => void }) {
  return (
    <div id={id} className={cx('jf-group', error && 'has-error')} role="group" tabIndex={-1}
      aria-labelledby={`${id}-label`} aria-describedby={describedBy(id, error, hint)}>
      <span id={`${id}-label`} className="jf-legend">
        {label}
        {optional && <span className="s-opt"> {optional}</span>}
      </span>
      <div className="jf-pills">
        {options.map((o) => (
          <button key={String(o.value)} type="button" className="cp-pill" aria-pressed={isOn(o.value)} title={o.title} onClick={() => toggle(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      {hint && <p id={`${id}-hint`} className="s-hint">{hint}</p>}
      <GroupError id={id} error={error} />
    </div>
  );
}

export function PillChoice<V extends string | number>({ value, onChange, ...rest }: PillBits<V> & { value: V | ''; onChange: (v: V) => void }) {
  return <PillGroup {...rest} isOn={(v) => v === value} toggle={onChange} />;
}

export function PillMulti<V extends string | number>({ value, onChange, ...rest }: PillBits<V> & { value: V[]; onChange: (v: V[]) => void }) {
  return <PillGroup {...rest} isOn={(v) => value.includes(v)} toggle={(v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])} />;
}

/** A number input with its unit shown inside the field. */
export function NumberField({ id, label, unit, value, onChange, error, hint, optional, placeholder }: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  optional?: string;
  placeholder?: string;
}) {
  return (
    <Wrap id={id} label={label} error={error} hint={hint} optional={optional}>
      <div className="jf-unit">
        <input id={id} type="text" inputMode="decimal" autoComplete="off" dir="ltr" value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} />
        <span aria-hidden="true">{unit}</span>
      </div>
    </Wrap>
  );
}
