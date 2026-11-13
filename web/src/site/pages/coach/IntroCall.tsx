// Free intro call: pick one of the coach's open times over the next week,
// leave a name and WhatsApp number. Booking is mocked (services/coachProfiles).

import { useMemo, useState, type FormEvent } from 'react';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import type { StringKey } from '../../../i18n/strings';
import { useCoach } from '../../coach/kit';
import { TextField, isPhone } from '../../components/Field';
import { Button, Reveal, SectionHeader } from '../../components/ui';
import { requestIntroCall } from '../../services/coachProfiles';

/** A calendar day (as a UTC-midnight Date, so it formats the same everywhere) and its open times. */
interface Day { date: Date; times: Date[] }

/** Year, month and day (and hour, minute) of `at` on the wall clock in `zone`. */
function wallClock(at: Date, zone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get('year'), m: get('month') - 1, d: get('day'), h: get('hour'), min: get('minute') };
}

/** The instant when the clock in `zone` reads the given date and time. */
function inZone(y: number, m: number, d: number, h: number, min: number, zone: string): Date {
  const guess = Date.UTC(y, m, d, h, min);
  const seen = wallClock(new Date(guess), zone);
  return new Date(guess - (Date.UTC(seen.y, seen.m, seen.d, seen.h, seen.min) - guess));
}

/** The coach's open times over the next 7 days (their calendar), from tomorrow. */
function upcoming(slots: Partial<Record<number, string[]>>, zone: string): Day[] {
  const today = wallClock(new Date(), zone);
  const out: Day[] = [];
  for (let i = 1; i <= 7; i++) {
    const date = new Date(Date.UTC(today.y, today.m, today.d + i));
    const times = (slots[date.getUTCDay()] ?? []).map((hm) => {
      const [h, min] = hm.split(':').map(Number);
      return inZone(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), h, min, zone);
    });
    if (times.length) out.push({ date, times });
  }
  return out;
}

type Field = 'slot' | 'name' | 'phone';

export function IntroCall() {
  const { t } = useI18n();
  const { p, L, first, numLocale } = useCoach();
  const call = p.introCall!;
  const days = useMemo(() => upcoming(call.slots, call.zone), [call.slots, call.zone]);
  const [day, setDay] = useState(0);
  const [time, setTime] = useState<Date | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [booked, setBooked] = useState<Date | null>(null);

  // Days are UTC-midnight dates; times show on the coach's clock, matching the zone label.
  const fmtDay = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(numLocale, { ...o, timeZone: 'UTC' }).format(d);
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(numLocale, { ...o, timeZone: call.zone }).format(d);
  const errors: Partial<Record<Field, StringKey>> = {};
  if (!time) errors.slot = 'site.cp.intro.errSlot';
  if (!name.trim()) errors.name = 'site.form.errName';
  if (!isPhone(phone)) errors.phone = 'site.cp.intro.errPhone';
  const show = (f: Field) => (submitted && errors[f] ? t(errors[f]!) : undefined);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const firstError = (['slot', 'name', 'phone'] as Field[]).find((f) => errors[f]);
    if (firstError) {
      document.getElementById(firstError === 'slot' ? 'ic-days' : `ic-${firstError}`)?.focus();
      return;
    }
    setSending(true);
    await requestIntroCall({ coachId: p.id, at: time!.toISOString(), name: name.trim(), phone: phone.trim() });
    setSending(false);
    setBooked(time);
  };

  return (
    <section id="intro" className="s-section s-section--alt cp-intro" aria-labelledby="cp-intro-title">
      <div className="s-container cp-intro-grid">
        <div>
          <SectionHeader id="cp-intro-title" align="start" eyebrow={t('site.cp.intro.eyebrow')} title={t('site.cp.intro.title')}
            lead={t('site.cp.intro.lead', { minutes: call.minutes, name: first })} />
          <Reveal delay={120}>
            <ul className="cp-intro-points">
              {(['site.cp.intro.b1', 'site.cp.intro.b2', 'site.cp.intro.b3'] as StringKey[]).map((k) => (
                <li key={k}><span className="cp-check"><Icon name="check" size={14} strokeWidth={2.75} /></span>{t(k)}</li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={160}>
          {booked ? (
            <div className="s-card cp-intro-card cp-intro-done" role="status">
              <span className="cp-done-ico"><Icon name="check" size={30} strokeWidth={2.5} /></span>
              <h3>{t('site.cp.intro.doneTitle')}</h3>
              <p>{t('site.cp.intro.doneBody', { day: fmt(booked, { weekday: 'long', day: 'numeric', month: 'long' }), time: fmt(booked, { hour: 'numeric', minute: '2-digit' }) })}</p>
              <Button variant="secondary" onClick={() => { setBooked(null); setTime(null); setSubmitted(false); }}>{t('site.cp.intro.another')}</Button>
            </div>
          ) : (
            <form className="s-card cp-intro-card" onSubmit={submit} noValidate>
              <div>
                <span className="cp-fit-label">{t('site.cp.intro.pickDay')}</span>
                <div id="ic-days" className="cp-days" role="group" tabIndex={-1} aria-label={t('site.cp.intro.pickDay')}>
                  {days.map((d, i) => (
                    <button key={i} type="button" className="cp-day" aria-pressed={day === i} onClick={() => { setDay(i); setTime(null); }}>
                      <span>{fmtDay(d.date, { weekday: 'short' })}</span>
                      <b>{fmtDay(d.date, { day: 'numeric' })}</b>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="cp-fit-label">{t('site.cp.intro.pickTime', { tz: L(call.timezone) })}</span>
                <div className="cp-fit-opts" role="group" aria-label={t('site.cp.intro.pickTime', { tz: L(call.timezone) })}>
                  {days[day]?.times.map((tm) => (
                    <button key={tm.toISOString()} type="button" className="cp-pill" aria-pressed={time?.getTime() === tm.getTime()} onClick={() => setTime(tm)}>
                      {fmt(tm, { hour: 'numeric', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
                {show('slot') && <p className="s-err" role="alert"><Icon name="alert" size={14} strokeWidth={2} />{show('slot')}</p>}
              </div>
              <div className="cp-intro-fields">
                <TextField id="ic-name" label={t('site.form.name')} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={show('name')} />
                <TextField id="ic-phone" label={t('site.cp.intro.phone')} type="tel" inputMode="tel" autoComplete="tel" dir="ltr"
                  placeholder="+966 5X XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} error={show('phone')} />
              </div>
              <Button type="submit" size="lg" block loading={sending}>
                {t(sending ? 'site.form.sending' : 'site.cp.intro.submit')}
              </Button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
