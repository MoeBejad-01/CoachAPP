// The join form: five short steps covering what a coach needs before taking
// someone on. The barbell on top loads a plate for each finished step, and on
// wide screens a card beside the form shows the profile the coach will get.
// Answers are saved as a draft while typing; the coach receives metric values.

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import type { StringKey } from '../../../i18n/strings';
import { useCoach } from '../../coach/kit';
import type { FitGoal } from '../../coach/types';
import { GROUP_TEXT, type MuscleGroup } from '../../components/anatomy/shapes';
import { Barbell, barbellTotal } from '../../components/Barbell';
import { Checkbox, FormAlert, TextArea, TextField, isPhone, latinDigits } from '../../components/Field';
import { Button, cx } from '../../components/ui';
import { coachPageUrl } from '../../services/coachProfiles';
import {
  saveDraft, sendJoinRequest,
  type Activity, type Condition, type Experience, type Gender, type IntakeAnswers, type JoinRequest, type StartWhen, type TrainingPlace,
} from '../../services/joinRequests';
import { BodyPicker } from './BodyPicker';
import { ChoiceCards, NumberField, PillChoice, PillMulti } from './fields';

type Units = 'metric' | 'imperial';

/** The form as typed: numbers stay strings, in the units the trainee chose. */
export interface IntakeDraft {
  name: string;
  birthDate: string;
  gender: Gender | '';
  phone: string;
  city: string;
  units: Units;
  /** Centimetres, or feet when imperial (inches in `heightIn`). */
  height: string;
  heightIn: string;
  weight: string;
  bodyFat: string;
  target: string;
  activity: Activity | '';
  sleep: string;
  goal: FitGoal | 'health' | '';
  experience: Experience | '';
  days: number[];
  session: number | '';
  place: TrainingPlace | '';
  squat: string;
  bench: string;
  deadlift: string;
  pain: MuscleGroup[];
  painNotes: string;
  conditions: Condition[];
  medications: string;
  planId: string;
  start: StartWhen | '';
  message: string;
  consent: boolean;
}

export const blankDraft = (name: string, phone: string, planId: string): IntakeDraft => ({
  name, birthDate: '', gender: '', phone, city: '',
  units: 'metric', height: '', heightIn: '', weight: '', bodyFat: '', target: '', activity: '', sleep: '',
  goal: '', experience: '', days: [], session: '', place: '', squat: '', bench: '', deadlift: '',
  pain: [], painNotes: '', conditions: [], medications: '',
  planId, start: '', message: '', consent: false,
});

const LB = 2.20462;
const round1 = (n: number) => Math.round(n * 10) / 10;
const num = (s: string) => {
  const v = parseFloat(latinDigits(s).trim());
  return Number.isFinite(v) ? v : null;
};
const LIFTS = ['squat', 'bench', 'deadlift'] as const;

/** Converts the measurements already typed when the trainee flips units. */
function switchUnits(f: IntakeDraft, to: Units): IntakeDraft {
  if (f.units === to) return f;
  const w = (s: string) => {
    const v = num(s);
    return v === null ? s : String(round1(to === 'imperial' ? v * LB : v / LB));
  };
  let { height, heightIn } = f;
  if (to === 'imperial') {
    const cm = num(f.height);
    if (cm !== null) {
      const total = Math.round(cm / 2.54);
      height = String(Math.floor(total / 12));
      heightIn = String(total % 12);
    }
  } else {
    const ft = num(f.height);
    if (ft !== null) height = String(Math.round((ft * 12 + (num(f.heightIn) ?? 0)) * 2.54));
    heightIn = '';
  }
  return { ...f, units: to, height, heightIn, weight: w(f.weight), target: w(f.target), squat: w(f.squat), bench: w(f.bench), deadlift: w(f.deadlift) };
}

const heightCm = (f: IntakeDraft) => {
  const h = num(f.height);
  if (h === null) return null;
  return f.units === 'metric' ? h : Math.round((h * 12 + (num(f.heightIn) ?? 0)) * 2.54);
};
const kg = (f: IntakeDraft, s: string) => {
  const v = num(s);
  return v === null ? null : f.units === 'metric' ? v : round1(v / LB);
};

function ageOf(iso: string): number | null {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const now = new Date();
  return now.getFullYear() - y - (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d) ? 1 : 0);
}

/** The form back from a sent request, for "Update my answers". */
export function draftFromAnswers(a: IntakeAnswers): IntakeDraft {
  const s = (n: number | null) => (n === null ? '' : String(n));
  const metric: IntakeDraft = {
    name: a.name, birthDate: a.birthDate, gender: a.gender, phone: a.phone, city: a.city,
    units: 'metric', height: String(a.heightCm), heightIn: '', weight: String(a.weightKg), bodyFat: s(a.bodyFatPct), target: s(a.targetWeightKg),
    activity: a.activity, sleep: s(a.sleepHours),
    goal: a.goal, experience: a.experience, days: a.days, session: a.sessionMinutes, place: a.place,
    squat: s(a.lifts.squat), bench: s(a.lifts.bench), deadlift: s(a.lifts.deadlift),
    pain: a.painAreas, painNotes: a.painNotes, conditions: a.conditions, medications: a.medications,
    planId: a.planId, start: a.start, message: a.message, consent: false,
  };
  return switchUnits(metric, a.units);
}

type Errors = Partial<Record<keyof IntakeDraft, StringKey>>;

function validate(step: number, f: IntakeDraft): Errors {
  const e: Errors = {};
  const optional = (key: keyof IntakeDraft, raw: string, value: number | null, lo: number, hi: number, msg: StringKey) => {
    if (raw.trim() && (value === null || value < lo || value > hi)) e[key] = msg;
  };
  if (step === 0) {
    if (!f.name.trim()) e.name = 'site.auth.errName';
    const age = ageOf(f.birthDate);
    if (age === null || age < 13 || age > 90) e.birthDate = 'site.join.err.birth';
    if (!f.gender) e.gender = 'site.join.err.choose';
    if (!isPhone(f.phone)) e.phone = 'site.cp.intro.errPhone';
  } else if (step === 1) {
    const cm = heightCm(f);
    if (cm === null || cm < 120 || cm > 230) e.height = 'site.join.err.height';
    const w = kg(f, f.weight);
    if (w === null || w < 30 || w > 300) e.weight = 'site.join.err.weight';
    optional('bodyFat', f.bodyFat, num(f.bodyFat), 3, 60, 'site.join.err.bodyFat');
    optional('target', f.target, kg(f, f.target), 30, 300, 'site.join.err.weight');
    if (!f.activity) e.activity = 'site.join.err.choose';
    optional('sleep', f.sleep, num(f.sleep), 3, 14, 'site.join.err.sleep');
  } else if (step === 2) {
    if (!f.goal) e.goal = 'site.join.err.choose';
    if (!f.experience) e.experience = 'site.join.err.choose';
    if (!f.days.length) e.days = 'site.join.err.days';
    if (!f.session) e.session = 'site.join.err.choose';
    if (!f.place) e.place = 'site.join.err.choose';
    for (const l of LIFTS) optional(l, f[l], kg(f, f[l]), 0, 500, 'site.join.err.lift');
  } else if (step === 3) {
    if (!f.conditions.length) e.conditions = 'site.join.err.conditions';
  } else {
    if (!f.planId) e.planId = 'site.join.err.choose';
    if (!f.start) e.start = 'site.join.err.choose';
    if (!f.consent) e.consent = 'site.join.err.consent';
  }
  return e;
}

/** Field order on the page, for moving focus to the first problem. */
const ORDER: (keyof IntakeDraft)[] = [
  'name', 'birthDate', 'gender', 'phone', 'city', 'height', 'weight', 'bodyFat', 'target', 'activity', 'sleep',
  'goal', 'experience', 'days', 'session', 'place', 'squat', 'bench', 'deadlift', 'pain', 'conditions', 'medications',
  'planId', 'start', 'message', 'consent',
];

const STEPS: { title: StringKey; lead: StringKey; short: StringKey }[] = [
  { title: 'site.join.s1.title', lead: 'site.join.s1.lead', short: 'site.join.s1.short' },
  { title: 'site.join.s2.title', lead: 'site.join.s2.lead', short: 'site.join.s2.short' },
  { title: 'site.join.s3.title', lead: 'site.join.s3.lead', short: 'site.join.s3.short' },
  { title: 'site.join.s4.title', lead: 'site.join.s4.lead', short: 'site.join.s4.short' },
  { title: 'site.join.s5.title', lead: 'site.join.s5.lead', short: 'site.join.s5.short' },
];
/** One plate pair per step on the progress barbell. */
export const STEP_PLATES = [25, 20, 15, 10, 5];

const GOALS: { value: FitGoal | 'health'; icon: IconName; title: StringKey }[] = [
  { value: 'strength', icon: 'trophy', title: 'site.cp.fit.strength' },
  { value: 'muscle', icon: 'dumbbell', title: 'site.cp.fit.muscle' },
  { value: 'fatloss', icon: 'activity', title: 'site.cp.fit.fatloss' },
  { value: 'compete', icon: 'award', title: 'site.cp.fit.compete' },
  { value: 'health', icon: 'sparkles', title: 'site.join.goal.health' },
];
const GENDERS: [Gender, StringKey][] = [['male', 'site.join.gender.male'], ['female', 'site.join.gender.female'], ['unsaid', 'site.join.gender.unsaid']];
const EXPERIENCE: [Experience, StringKey][] = [
  ['new', 'site.join.exp.new'], ['under1', 'site.join.exp.under1'], ['one3', 'site.join.exp.one3'], ['over3', 'site.join.exp.over3'],
];
const ACTIVITY: { value: Activity; icon: IconName; title: StringKey; hint: StringKey }[] = [
  { value: 'desk', icon: 'devices', title: 'site.join.act.desk', hint: 'site.join.act.deskHint' },
  { value: 'mixed', icon: 'users', title: 'site.join.act.mixed', hint: 'site.join.act.mixedHint' },
  { value: 'active', icon: 'bolt', title: 'site.join.act.active', hint: 'site.join.act.activeHint' },
];
const PLACES: { value: TrainingPlace; icon: IconName; title: StringKey }[] = [
  { value: 'gym', icon: 'users', title: 'site.join.place.gym' },
  { value: 'home', icon: 'dumbbell', title: 'site.join.place.home' },
  { value: 'both', icon: 'arrow', title: 'site.join.place.both' },
];
const CONDITIONS: [Condition, StringKey][] = [
  ['none', 'site.join.cond.none'], ['heart', 'site.join.cond.heart'], ['bp', 'site.join.cond.bp'], ['diabetes', 'site.join.cond.diabetes'],
  ['asthma', 'site.join.cond.asthma'], ['joints', 'site.join.cond.joints'], ['pregnancy', 'site.join.cond.pregnancy'], ['other', 'site.join.cond.other'],
];
const STARTS: [StartWhen, StringKey][] = [['asap', 'site.join.start.asap'], ['twoWeeks', 'site.join.start.twoWeeks'], ['month', 'site.join.start.month']];

export function IntakeForm({ accountId, email, initial, onSent }: {
  accountId: string;
  email: string;
  initial: IntakeDraft;
  onSent: (r: JoinRequest) => void;
}) {
  const { t } = useI18n();
  const { p, L, first, money, numLocale } = useCoach();
  const [f, setF] = useState<IntakeDraft>(initial);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  useEffect(() => saveDraft(p.id, accountId, f), [f, p.id, accountId]);

  // After moving between steps, bring the new step's title into view and focus.
  useEffect(() => {
    if (!moved.current) return;
    top.current?.scrollIntoView({ block: 'start' });
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  const errors = validate(step, f);
  const err = (k: keyof IntakeDraft) => (tried && errors[k] ? t(errors[k]!) : undefined);
  const set = <K extends keyof IntakeDraft>(k: K, v: IntakeDraft[K]) => setF((x) => ({ ...x, [k]: v }));
  const text = (k: 'name' | 'phone' | 'city' | 'painNotes' | 'medications' | 'message') => ({
    value: f[k], onChange: (e: { target: { value: string } }) => set(k, e.target.value), error: err(k),
  });
  const measure = (k: 'height' | 'heightIn' | 'weight' | 'bodyFat' | 'target' | 'sleep' | 'squat' | 'bench' | 'deadlift') => ({
    id: `jf-${k}`, value: f[k], onChange: (v: string) => set(k, v), error: err(k),
  });
  const optional = t('site.auth.optional');
  const unitKg = t(f.units === 'metric' ? 'site.cp.kg' : 'site.join.unit.lb');

  const go = (to: number) => {
    moved.current = true;
    setTried(false);
    setStep(to);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    const firstError = ORDER.find((k) => errors[k]);
    if (firstError) {
      document.getElementById(`jf-${firstError}`)?.focus();
      return;
    }
    if (step < STEPS.length - 1) {
      go(step + 1);
      return;
    }
    setSending(true);
    setFailed(false);
    const n = (s: string) => num(s);
    try {
      const sent = await sendJoinRequest({
        coachId: p.id,
        traineeAccountId: accountId,
        email,
        answers: {
          name: f.name.trim(), birthDate: f.birthDate, gender: f.gender as Gender, phone: latinDigits(f.phone).trim(), city: f.city.trim(),
          heightCm: heightCm(f)!, weightKg: kg(f, f.weight)!, bodyFatPct: n(f.bodyFat), targetWeightKg: kg(f, f.target),
          activity: f.activity as Activity, sleepHours: n(f.sleep),
          goal: f.goal as FitGoal | 'health', experience: f.experience as Experience, days: [...f.days].sort(), sessionMinutes: Number(f.session),
          place: f.place as TrainingPlace, lifts: { squat: kg(f, f.squat), bench: kg(f, f.bench), deadlift: kg(f, f.deadlift) },
          painAreas: f.pain, painNotes: f.painNotes.trim(), conditions: f.conditions, medications: f.medications.trim(),
          planId: f.planId, start: f.start as StartWhen, message: f.message.trim(), units: f.units,
        },
      });
      onSent(sent);
    } catch {
      setFailed(true);
      setSending(false);
    }
  };

  const weekday = (d: number) => new Intl.DateTimeFormat(numLocale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + d)));
  const choices = [
    ...p.plans.map((pl) => ({ value: pl.id, icon: 'calendar' as IconName, title: L(pl.name), hint: `${money(pl.pricePerMonth)} ${t('site.cp.plans.perMonth')}` })),
    ...p.programs.map((pr) => ({
      value: pr.id, icon: 'clipboard' as IconName, title: L(pr.name),
      hint: pr.price ? t('site.cp.prog.oneOff', { price: money(pr.price) }) : t('site.cp.prog.included'),
    })),
    { value: 'unsure', icon: 'message' as IconName, title: t('site.join.plan.unsure', { name: first }), hint: t('site.join.plan.unsureHint') },
  ];

  const loaded = barbellTotal(STEP_PLATES, step);
  return (
    <div className="jn-grid">
      <form className="s-card jn-form" onSubmit={submit} noValidate>
        <div ref={top} className="jn-progress">
          <div className="jn-bar">
            <Barbell plates={STEP_PLATES} loaded={step} label={t('site.join.progressLabel', { n: step, total: STEPS.length })} />
          </div>
          <ol className="jn-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className={cx(i < step && 'is-done', i === step && 'is-current')}>
                {i < step ? (
                  <button type="button" onClick={() => go(i)}>{t(s.short)}</button>
                ) : (
                  <span aria-current={i === step ? 'step' : undefined}>{t(s.short)}</span>
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className="jn-head">
          <p className="s-eyebrow">{t('site.join.stepOf', { n: step + 1, total: STEPS.length })} · <span dir="ltr">{t('site.how.kg', { n: loaded })}</span></p>
          <h1 ref={heading} tabIndex={-1}>{t(STEPS[step].title)}</h1>
          <p>{t(STEPS[step].lead, { name: first })}</p>
        </div>

        <div className="jn-fields" key={step}>
          {step === 0 && (
            <>
              <TextField id="jf-name" label={t('site.auth.name')} autoComplete="name" {...text('name')} />
              <div className="jf-row">
                <TextField id="jf-birthDate" label={t('site.join.birth')} type="date" max={new Date().toISOString().slice(0, 10)}
                  value={f.birthDate} onChange={(e) => set('birthDate', e.target.value)} error={err('birthDate')} />
                <TextField id="jf-phone" label={t('site.cp.intro.phone')} type="tel" inputMode="tel" autoComplete="tel" dir="ltr"
                  placeholder="+966 5X XXX XXXX" {...text('phone')} />
              </div>
              <PillChoice id="jf-gender" label={t('site.join.gender')} value={f.gender} onChange={(v) => set('gender', v)} error={err('gender')}
                options={GENDERS.map(([v, k]) => ({ value: v, label: t(k) }))} />
              <TextField id="jf-city" label={t('site.join.city')} optional={optional} autoComplete="address-level2" {...text('city')} />
            </>
          )}

          {step === 1 && (
            <>
              <div className="jf-units">
                <span className="jf-legend">{t('site.join.units')}</span>
                <div className="s-seg" role="group" aria-label={t('site.join.units')}>
                  {(['metric', 'imperial'] as Units[]).map((u) => (
                    <button key={u} type="button" aria-pressed={f.units === u} onClick={() => setF((x) => switchUnits(x, u))}>
                      {t(u === 'metric' ? 'site.join.metric' : 'site.join.imperial')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="jf-row">
                {f.units === 'metric' ? (
                  <NumberField label={t('site.join.height')} unit={t('site.join.unit.cm')} placeholder="178" {...measure('height')} />
                ) : (
                  <div className="jf-row jf-row--tight">
                    <NumberField label={t('site.join.height')} unit={t('site.join.unit.ft')} placeholder="5" {...measure('height')} />
                    <NumberField label={t('site.join.inches')} unit={t('site.join.unit.in')} placeholder="10" {...measure('heightIn')} />
                  </div>
                )}
                <NumberField label={t('site.join.weight')} unit={unitKg} placeholder={f.units === 'metric' ? '82' : '181'} {...measure('weight')} />
              </div>
              <div className="jf-row">
                <NumberField label={t('site.join.bodyFat')} unit="%" optional={optional} hint={t('site.join.bodyFatHint')} {...measure('bodyFat')} />
                <NumberField label={t('site.join.target')} unit={unitKg} optional={optional} {...measure('target')} />
              </div>
              <ChoiceCards id="jf-activity" legend={t('site.join.activity')} value={f.activity} onChange={(v) => set('activity', v)} error={err('activity')}
                columns={3} options={ACTIVITY.map((a) => ({ value: a.value, icon: a.icon, title: t(a.title), hint: t(a.hint) }))} />
              <NumberField label={t('site.join.sleep')} unit={t('site.join.unit.hours')} optional={optional} placeholder="7" {...measure('sleep')} />
            </>
          )}

          {step === 2 && (
            <>
              <ChoiceCards id="jf-goal" legend={t('site.cp.fit.q1')} value={f.goal} onChange={(v) => set('goal', v)} error={err('goal')} columns={3}
                options={GOALS.map((g) => ({ value: g.value, icon: g.icon, title: t(g.title) }))} />
              <PillChoice id="jf-experience" label={t('site.join.experience')} value={f.experience} onChange={(v) => set('experience', v)} error={err('experience')}
                options={EXPERIENCE.map(([v, k]) => ({ value: v, label: t(k) }))} />
              <PillMulti id="jf-days" label={t('site.join.days')} hint={t('site.join.daysHint')} value={f.days} onChange={(v) => set('days', v)} error={err('days')}
                options={[0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: d, label: weekday(d) }))} />
              <PillChoice id="jf-session" label={t('site.join.session')} value={f.session} onChange={(v) => set('session', v)} error={err('session')}
                options={[45, 60, 75, 90].map((m) => ({ value: m, label: t('common.minutes', { n: m }) }))} />
              <ChoiceCards id="jf-place" legend={t('site.join.place')} value={f.place} onChange={(v) => set('place', v)} error={err('place')} columns={3}
                options={PLACES.map((pl) => ({ value: pl.value, icon: pl.icon, title: t(pl.title) }))} />
              <div className="jf-group">
                <span className="jf-legend">{t('site.join.lifts')} <span className="s-opt">{optional}</span></span>
                <div className="jf-row jf-row--3">
                  <NumberField label={t('site.join.lift.squat')} unit={unitKg} {...measure('squat')} />
                  <NumberField label={t('site.join.lift.bench')} unit={unitKg} {...measure('bench')} />
                  <NumberField label={t('site.join.lift.deadlift')} unit={unitKg} {...measure('deadlift')} />
                </div>
                <p className="s-hint">{t('site.join.liftsHint')}</p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <BodyPicker id="jf-pain" label={t('site.join.pain')} hint={t('site.join.painHint')} value={f.pain} onChange={(v) => set('pain', v)} />
              {f.pain.length > 0 && (
                <TextArea id="jf-painNotes" label={t('site.join.painNotes')} optional={optional} rows={3}
                  placeholder={t('site.join.painNotesHint')} {...text('painNotes')} />
              )}
              <PillMulti id="jf-conditions" label={t('site.join.conditions')} value={f.conditions} error={err('conditions')}
                onChange={(v) => {
                  // "None" can't be picked alongside a condition.
                  const added = v.find((c) => !f.conditions.includes(c));
                  set('conditions', added === 'none' ? ['none'] : v.filter((c) => c !== 'none'));
                }}
                options={CONDITIONS.map(([v, k]) => ({ value: v, label: t(k) }))} />
              <TextField id="jf-medications" label={t('site.join.medications')} optional={optional} {...text('medications')} />
              <p className="jn-private"><Icon name="eyeOff" size={16} />{t('site.join.private', { name: first })}</p>
            </>
          )}

          {step === 4 && (
            <>
              <ChoiceCards id="jf-planId" legend={t('site.join.plan')} value={f.planId} onChange={(v) => set('planId', v)} error={err('planId')}
                options={choices} />
              <FormAlert tone="info">{t('site.join.payNote', { name: first })}</FormAlert>
              <PillChoice id="jf-start" label={t('site.join.start')} value={f.start} onChange={(v) => set('start', v)} error={err('start')}
                options={STARTS.map(([v, k]) => ({ value: v, label: t(k) }))} />
              <TextArea id="jf-message" label={t('site.join.message', { name: first })} optional={optional} rows={4}
                placeholder={t('site.join.messageHint')} {...text('message')} />
              <div className="jn-review">
                <Preview f={f} />
              </div>
              <Checkbox id="jf-consent" checked={f.consent} onChange={(v) => set('consent', v)} error={err('consent')}>
                {t('site.join.consent', { name: first })}
              </Checkbox>
            </>
          )}
        </div>

        {failed && <FormAlert>{t('site.form.errSend')}</FormAlert>}
        <div className="jn-nav">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => go(step - 1)}>
              <Icon name="chevronLeft" size={18} strokeWidth={2} />{t('common.back')}
            </Button>
          ) : (
            <Link to={coachPageUrl(p)} className="s-btn s-btn--ghost">
              <Icon name="chevronLeft" size={18} strokeWidth={2} />{t('site.join.backToCoach', { name: first })}
            </Link>
          )}
          <Button type="submit" size="lg" loading={sending}>
            {step < STEPS.length - 1 ? <>{t('common.continue')}<Icon name="arrow" size={18} strokeWidth={2} /></>
              : t(sending ? 'site.form.sending' : 'site.join.send', { name: first })}
          </Button>
        </div>
      </form>

      <aside className="jn-aside" aria-label={t('site.join.previewTitle', { name: first })}>
        <Preview f={f} />
      </aside>
    </div>
  );
}

/** The profile as the coach will receive it, updating while the trainee types. */
function Preview({ f }: { f: IntakeDraft }) {
  const { t } = useI18n();
  const { p, L, first, numLocale } = useCoach();
  const dash = '—';
  const age = ageOf(f.birthDate);
  const kgUnit = t(f.units === 'metric' ? 'site.cp.kg' : 'site.join.unit.lb');
  const height = num(f.height) === null ? dash
    : f.units === 'metric' ? `${f.height} ${t('site.join.unit.cm')}` : `${f.height}′${num(f.heightIn) ?? 0}″`;
  const withUnit = (s: string, unit: string) => (num(s) === null ? dash : `${latinDigits(s)} ${unit}`);
  const weekday = (d: number) => new Intl.DateTimeFormat(numLocale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + d)));
  const pick = <V extends string>(list: [V, StringKey][], v: V | '') => (v ? t(list.find(([x]) => x === v)![1]) : dash);
  const plan = [...p.plans, ...p.programs].find((x) => x.id === f.planId);
  const initials = f.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  const goal = GOALS.find((g) => g.value === f.goal);
  const sub = [age !== null && age > 0 ? t('site.join.age', { n: age }) : null, f.gender ? pick(GENDERS, f.gender) : null, f.city.trim() || null]
    .filter(Boolean).join(' · ');

  const row = (label: string, value: ReactNode) => <div className="jn-pv-row"><dt>{label}</dt><dd>{value}</dd></div>;
  return (
    <div className="jn-preview">
      <p className="jn-pv-title"><Icon name="eye" size={15} />{t('site.join.previewTitle', { name: first })}</p>
      <div className="jn-pv-who">
        <span className="jn-pv-av" aria-hidden="true">{initials}</span>
        <div>
          <b>{f.name.trim() || t('site.join.previewName')}</b>
          <span>{sub || dash}</span>
        </div>
      </div>
      <dl className="jn-pv-stats">
        <div><dt>{t('site.join.height')}</dt><dd dir="ltr">{height}</dd></div>
        <div><dt>{t('site.join.weight')}</dt><dd>{withUnit(f.weight, kgUnit)}</dd></div>
        <div><dt>{t('site.join.bodyFat')}</dt><dd>{withUnit(f.bodyFat, '%')}</dd></div>
        <div><dt>{t('site.join.target')}</dt><dd>{withUnit(f.target, kgUnit)}</dd></div>
      </dl>
      <dl className="jn-pv-rows">
        {row(t('site.cp.fit.q1'), goal ? t(goal.title) : dash)}
        {row(t('site.join.experience'), pick(EXPERIENCE, f.experience))}
        {row(t('site.join.days'), f.days.length ? [...f.days].sort().map(weekday).join(' · ') : dash)}
        {row(t('site.join.session'), f.session ? t('common.minutes', { n: f.session }) : dash)}
        {row(t('site.join.pain'), f.pain.length ? (
          <span className="jn-pv-tags">{f.pain.map((g) => <i key={g}>{t(GROUP_TEXT[g].name)}</i>)}</span>
        ) : dash)}
        {row(t('site.join.plan'), plan ? L(plan.name) : f.planId === 'unsure' ? t('site.join.plan.unsure', { name: first }) : dash)}
      </dl>
    </div>
  );
}
