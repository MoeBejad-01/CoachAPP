// Adding a trainee, step by step. Uses the same stepper, number fields and
// chips as the template builder so the two flows look and behave alike.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createTrainee } from '../data/actions';
import { formatMoney } from '../data/selectors';
import { useAppState } from '../data/store';
import { CALLS_PER_MONTH, defaultPrice, MONTHLY_PRICE, TIERS } from '../data/plans';
import type { Goal, GoalType, Membership, PlanTier } from '../data/types';
import { Icon } from '../components/Icon';
import { useToast } from '../components/ui';
import { useT, type T } from '../i18n';
import { addDays, fmtDay, startOfWeek, todayISO, weekdayName } from '../lib/dates';
import { TONES } from '../lib/util';
import { Chips, NumField } from './programs/sections';

const GOALS: GoalType[] = ['muscle', 'strength', 'fatloss', 'sport', 'rehab', 'health'];
const STEPS = ['profile', 'goals', 'program', 'membership', 'review'] as const;

type GoalDraft = Omit<Goal, 'id'>;

/** Starting targets for a goal type; body-weight goals use the current weight. */
function defaultGoals(goal: GoalType, kg: number | null, t: T): GoalDraft[] {
  const round = (n: number) => Math.round(n * 2) / 2;
  switch (goal) {
    case 'fatloss': return kg ? [{ label: t('new.g.reach', { kg: round(kg - 5) }), unit: 'kg', start: kg, current: kg, target: round(kg - 5) }] : [{ label: t('new.g.lose'), unit: 'kg', start: 0, current: 0, target: 5 }];
    case 'muscle': return kg ? [{ label: t('new.g.reach', { kg: round(kg + 3) }), unit: 'kg', start: kg, current: kg, target: round(kg + 3) }] : [{ label: t('new.g.gain'), unit: 'kg', start: 0, current: 0, target: 3 }];
    case 'strength': return [{ label: t('new.g.squat'), unit: 'kg', start: 0, current: 0, target: 0 }];
    case 'sport': return [{ label: t('new.g.jump'), unit: 'cm', start: 0, current: 0, target: 0 }];
    case 'rehab': return [{ label: t('new.g.painFree'), unit: t('new.g.weeksUnit'), start: 0, current: 0, target: 6 }];
    case 'health': return [{ label: t('new.g.consistent'), unit: t('new.g.weeksUnit'), start: 0, current: 0, target: 12 }];
  }
}

export function NewTraineePage() {
  const state = useAppState();
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const today = todayISO();
  const nextMonday = addDays(startOfWeek(today), 7);
  const [step, setStep] = useState(0);
  const [goalsTouched, setGoalsTouched] = useState(false);
  const [priceTouched, setPriceTouched] = useState(false);
  const [welcomeTouched, setWelcomeTouched] = useState(false);
  const [f, setF] = useState({
    firstName: '', lastName: '', email: '', phone: '', birthDate: '1996-01-01', heightCm: 170 as number | null, weightKg: null as number | null,
    tier: 'essential' as PlanTier, goalType: 'muscle' as GoalType, frequency: 3, checkinDay: 0, injuries: '', pinnedNote: '',
    templateId: ((state.templates.find((x) => x.guide.goal === 'muscle') ?? state.templates[0])?.id ?? null) as string | null,
    startDate: nextMonday,
    price: MONTHLY_PRICE.essential, cycle: 'monthly' as Membership['cycle'], paid: false,
    welcome: '', inbody: false, inbodyNote: '',
  });
  const [goals, setGoals] = useState<GoalDraft[]>(() => defaultGoals('muscle', null, t));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const tpl = state.templates.find((x) => x.id === f.templateId) ?? null;
  const suggested = state.templates.find((x) => x.guide.goal === f.goalType)?.id;
  const coachFirst = state.coach.name.split(' ')[0];
  const name = `${f.firstName} ${f.lastName}`.trim();
  const welcomeDefault = t(tpl ? 'new.welcomeDefault' : 'new.welcomeNoProgram', { name: f.firstName.trim() || '…', coach: coachFirst, program: tpl?.name ?? '', date: fmtDay(f.startDate) });
  const welcome = welcomeTouched ? f.welcome : welcomeDefault;
  const profileValid = !!(f.firstName.trim() && f.lastName.trim() && /\S+@\S+\.\S+/.test(f.email));
  const canReach = (i: number) => i === 0 || profileValid;

  // Goal type and weight drive the suggested targets and template until the coach edits them.
  const pickGoal = (g: GoalType) => {
    set('goalType', g);
    if (!goalsTouched) setGoals(defaultGoals(g, f.weightKg, t));
    const sug = state.templates.find((x) => x.guide.goal === g);
    if (sug) set('templateId', sug.id);
  };
  const setWeight = (kg: number | null) => {
    set('weightKg', kg);
    if (!goalsTouched) setGoals(defaultGoals(f.goalType, kg, t));
  };
  const pickTier = (m: PlanTier) => {
    set('tier', m);
    if (!priceTouched) set('price', defaultPrice(m, f.cycle));
  };
  const patchGoal = (i: number, p: Partial<GoalDraft>) => { setGoalsTouched(true); setGoals((gs) => gs.map((g, j) => (j === i ? { ...g, ...p } : g))); };

  const create = () => {
    const id = createTrainee({
      firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim(), phone: f.phone.trim(), birthDate: f.birthDate,
      heightCm: f.heightCm ?? 0, tier: f.tier, goalType: f.goalType, injuries: f.injuries.trim(), pinnedNote: f.pinnedNote.trim(),
      frequency: f.frequency, checkinDay: f.checkinDay, goals: goals.map((g) => ({ ...g, current: g.start })), weightKg: f.weightKg,
      templateId: f.templateId, startDate: f.startDate, membership: { price: f.price, cycle: f.cycle, paid: f.paid },
      welcome,
      inbodyRequest: f.inbody ? { note: f.inbodyNote.trim(), message: t('inbody.requestMsg', { name: f.firstName.trim() }) + (f.inbodyNote.trim() ? `\n${f.inbodyNote.trim()}` : '') } : null,
    });
    toast(t('new.createdToast', { name: f.firstName.trim() }));
    navigate(`/coach/trainees/${id}`);
  };

  const last = step === STEPS.length - 1;
  const renews = f.paid ? addDays(f.startDate, f.cycle === 'quarterly' ? 91 : 30) : f.startDate;
  const g = tpl?.guide;

  return (
    <div className="tb-page">
      <header className="page-head">
        <div className="stack" style={{ gap: 4 }}>
          <Link to="/coach/trainees" className="small row" style={{ gap: 4, color: 'var(--muted)' }}><Icon name="chevronLeft" size={14} />{t('nav.trainees')}</Link>
          <h1 className="page-title">{t('new.title')}</h1>
          <p className="muted">{t('new.subtitle')}</p>
        </div>
      </header>

      <ol className="stepper new-stepper" aria-label={t('new.steps')}>
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" className={`step${i === step ? ' on' : ''}${i < step ? ' done' : ''}`} aria-current={i === step ? 'step' : undefined} disabled={!canReach(i)} onClick={() => setStep(i)}>
              <span className="step-n">{i < step ? <Icon name="check" size={13} strokeWidth={2.5} /> : i + 1}</span>
              <span className="step-l">{t(`new.s.${s}`)}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="tb-layout">
        <div className="card tb-main">
          <div className="tb-step-head">
            <span className="xs faint">{t('tb.stepOf', { n: step + 1, of: STEPS.length })}</span>
            <h2 className="card-title" style={{ fontSize: 18 }}>{t(`new.s.${STEPS[step]}`)}</h2>
            <p className="small muted">{t(`new.s.${STEPS[step]}.sub`)}</p>
          </div>

          <div className="tb-step-body">
            {step === 0 && (
              <>
                <section className="tb-block">
                  <h3 className="tb-block-title">{t('new.contact')}</h3>
                  <div className="tb-grid">
                    <label className="field">{t('form.firstName')}<input className="input" autoFocus value={f.firstName} onChange={(e) => set('firstName', e.target.value)} /></label>
                    <label className="field">{t('form.lastName')}<input className="input" value={f.lastName} onChange={(e) => set('lastName', e.target.value)} /></label>
                    <label className="field">{t('form.email')} <span className="hint">{t('new.emailHint')}</span><input className="input" type="email" dir="ltr" placeholder="name@example.com" value={f.email} onChange={(e) => set('email', e.target.value)} /></label>
                    <label className="field">{t('form.phone')} <span className="hint">{t('form.optional')}</span><input className="input" type="tel" dir="ltr" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></label>
                  </div>
                </section>
                <section className="tb-block">
                  <h3 className="tb-block-title">{t('new.body')}</h3>
                  <div className="tb-grid three">
                    <label className="field">{t('form.birthDate')}<input className="input" type="date" max={today} value={f.birthDate} onChange={(e) => set('birthDate', e.target.value)} /></label>
                    <NumField label={t('new.height')} unit="cm" step={1} min={100} max={230} value={f.heightCm} onChange={(v) => set('heightCm', v)} />
                    <NumField label={t('new.weight')} unit="kg" step={0.5} min={30} max={250} value={f.weightKg} onChange={setWeight} hint={t('new.weightHint')} />
                  </div>
                </section>
                <section className="tb-block">
                  <h3 className="tb-block-title">{t('form.coachingType')}</h3>
                  <div className="choices">
                    {TIERS.map((m) => (
                      <button key={m} type="button" className={`choice${f.tier === m ? ' on' : ''}`} aria-pressed={f.tier === m} onClick={() => pickTier(m)}>
                        <span className="row" style={{ justifyContent: 'space-between', width: '100%' }}><span className="t">{t(`tier.${m}`)}</span><span className="xs muted">{t('new.perMonth', { v: formatMoney(MONTHLY_PRICE[m]) })}</span></span>
                        <span className="s">{t(`tier.${m}.sub`)}</span>
                        <span className="xs faint">{CALLS_PER_MONTH[m] ? t('tier.calls', { n: CALLS_PER_MONTH[m] }) : t('tier.noCalls')}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {step === 1 && (
              <>
                <section className="tb-block">
                  <h3 className="tb-block-title">{t('tb.goal')}</h3>
                  <div className="choices">
                    {GOALS.map((x) => (
                      <button key={x} type="button" className={`choice${f.goalType === x ? ' on' : ''}`} aria-pressed={f.goalType === x} onClick={() => pickGoal(x)}>
                        <span className="t">{t(`goal.${x}`)}</span><span className="s">{t(`goal.${x}.sub`)}</span>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="tb-block">
                  <div className="stack" style={{ gap: 2 }}>
                    <h3 className="tb-block-title">{t('new.targets')}</h3>
                    <p className="small muted">{t('new.targetsSub')}</p>
                  </div>
                  {goals.map((gl, i) => (
                    <div key={i} className="goal-row">
                      <input className="input" aria-label={t('goals.goal')} placeholder={t('goals.placeholder')} value={gl.label} onChange={(e) => patchGoal(i, { label: e.target.value })} />
                      <label className="field">{t('goals.start')}<input className="input mono" inputMode="decimal" value={gl.start} onChange={(e) => patchGoal(i, { start: Number(e.target.value) || 0 })} /></label>
                      <label className="field">{t('goals.target')}<input className="input mono" inputMode="decimal" value={gl.target} onChange={(e) => patchGoal(i, { target: Number(e.target.value) || 0 })} /></label>
                      <label className="field">{t('goals.unit')}<input className="input" value={gl.unit} onChange={(e) => patchGoal(i, { unit: e.target.value })} /></label>
                      <button type="button" className="btn ghost icon" aria-label={t('goals.remove')} onClick={() => { setGoalsTouched(true); setGoals((gs) => gs.filter((_, j) => j !== i)); }}><Icon name="trash" size={16} /></button>
                    </div>
                  ))}
                  <button type="button" className="btn sm" style={{ alignSelf: 'flex-start', borderStyle: 'dashed' }} onClick={() => { setGoalsTouched(true); setGoals((gs) => [...gs, { label: '', unit: 'kg', start: 0, current: 0, target: 0 }]); }}>
                    <Icon name="plus" size={14} strokeWidth={2} />{t('goals.add')}
                  </button>
                </section>
                <section className="tb-block">
                  <h3 className="tb-block-title">{t('new.schedule')}</h3>
                  <div className="tb-grid">
                    <div className="field"><span>{t('form.sessionsPerWeek')}</span><Chips label={t('form.sessionsPerWeek')} value={f.frequency} onChange={(n) => set('frequency', n)} options={[2, 3, 4, 5, 6].map((v) => ({ v, label: t('tb.nDays', { n: v }) }))} /></div>
                    <div className="field"><span>{t('form.checkinDay')}</span><Chips label={t('form.checkinDay')} value={f.checkinDay} onChange={(n) => set('checkinDay', n)} options={[0, 1, 2, 3, 4, 5, 6].map((v) => ({ v, label: weekdayName(v) }))} /></div>
                  </div>
                </section>
                <section className="tb-block">
                  <h3 className="tb-block-title">{t('new.health')}</h3>
                  <label className="field">{t('form.injuriesLong')}<textarea className="textarea" rows={2} placeholder={t('form.injuriesPlaceholder')} value={f.injuries} onChange={(e) => set('injuries', e.target.value)} /></label>
                  <label className="field">{t('form.pinned')} <span className="hint">{t('form.pinnedHint')}</span><textarea className="textarea" rows={2} value={f.pinnedNote} onChange={(e) => set('pinnedNote', e.target.value)} /></label>
                </section>
              </>
            )}

            {step === 2 && (
              <>
                <section className="tb-block">
                  <div className="stack" style={{ gap: 2 }}>
                    <h3 className="tb-block-title">{t('new.chooseTemplate')}</h3>
                    <p className="small muted">{t('new.chooseTemplateSub')}</p>
                  </div>
                  <div className="choices" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
                    {state.templates.map((x) => (
                      <button key={x.id} type="button" className={`choice${f.templateId === x.id ? ' on' : ''}`} aria-pressed={f.templateId === x.id} onClick={() => set('templateId', x.id)}>
                        <span className="row" style={{ justifyContent: 'space-between', width: '100%', gap: 8 }}>
                          <span className="t">{x.name}</span>
                          {x.id === suggested && <span className="chip accent" style={{ fontSize: 11 }}>{t('new.suggested')}</span>}
                        </span>
                        <span className="s">{t('tpl.nWeeks', { n: x.weeks })} · {t('tb.nDays', { n: x.days.length })}{x.guide.calories ? ` · ${x.guide.calories.toLocaleString('en')} kcal` : ''}</span>
                      </button>
                    ))}
                    <button type="button" className={`choice${f.templateId === null ? ' on' : ''}`} aria-pressed={f.templateId === null} onClick={() => set('templateId', null)}>
                      <span className="t">{t('new.noProgram')}</span><span className="s">{t('new.assignLater')}</span>
                    </button>
                  </div>
                  {tpl && g && (
                    <div className="tpl-preview">
                      <div className="row wrap" style={{ gap: 18 }}>
                        {([
                          [t('tb.daysPerWeek'), String(tpl.days.length)], [t('tb.sessionMin'), t('common.minutes', { n: g.sessionMin })],
                          [t('tb.calories'), g.calories ? `${g.calories.toLocaleString('en')} kcal` : '—'], [t('tb.protein'), g.proteinG ? `${g.proteinG} g` : '—'],
                          [t('tb.sleep'), g.sleepH ? `${g.sleepH} ${t('tb.hoursUnit')}` : '—'], [t('tb.steps'), g.steps?.toLocaleString('en') ?? '—'],
                        ] as [string, string][]).map(([k, v]) => <span key={k} className="stack" style={{ gap: 1 }}><span className="xs faint">{k}</span><span className="small mono" style={{ fontWeight: 600 }}>{v}</span></span>)}
                      </div>
                      <span className="xs muted">{tpl.days.map((d) => d.name).join(' · ')}</span>
                      {f.weightKg && <span className="xs muted">{t('new.targetsFromTemplate')}</span>}
                      {tpl.days.length !== f.frequency && (
                        <div className="tb-warn">
                          <span>{t('new.daysMismatch', { d: tpl.days.length, f: f.frequency })}</span>
                          <button type="button" className="btn sm" onClick={() => set('frequency', tpl.days.length)}>{t('new.matchDays', { n: tpl.days.length })}</button>
                        </div>
                      )}
                    </div>
                  )}
                </section>
                {tpl && (
                  <section className="tb-block">
                    <h3 className="tb-block-title">{t('form.startDate')}</h3>
                    <div className="row wrap" style={{ gap: 8 }}>
                      <Chips label={t('form.startDate')} value={f.startDate === today ? 'today' : f.startDate === nextMonday ? 'monday' : 'other'}
                        onChange={(v) => v !== 'other' && set('startDate', v === 'today' ? today : nextMonday)}
                        options={[{ v: 'today', label: t('new.startToday') }, { v: 'monday', label: t('new.startMonday', { date: fmtDay(nextMonday) }) }]} />
                      <input className="input" type="date" style={{ width: 170 }} aria-label={t('form.startDate')} value={f.startDate} onChange={(e) => set('startDate', e.target.value)} />
                    </div>
                  </section>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <section className="tb-block">
                  <div className="stack" style={{ gap: 2 }}>
                    <h3 className="tb-block-title">{t('new.pricing')}</h3>
                    <p className="small muted">{t('new.pricingSub', { mode: t(`tier.${f.tier}`) })}</p>
                  </div>
                  <div className="tb-grid">
                    <div className="field"><span>{t('billing.cycle')}</span><Chips label={t('billing.cycle')} value={f.cycle} onChange={(c) => { set('cycle', c); if (!priceTouched) set('price', defaultPrice(f.tier, c)); }} options={(['monthly', 'quarterly'] as const).map((v) => ({ v, label: t(`cycle.${v}`) }))} /></div>
                    <NumField label={t(f.cycle === 'quarterly' ? 'new.pricePerQuarter' : 'new.pricePerMonth')} unit={t('currency.sar')} step={50} value={f.price} onChange={(v) => { setPriceTouched(true); set('price', v ?? 0); }}
                      hint={f.cycle === 'quarterly' && !priceTouched ? t('new.quarterHint') : undefined} />
                  </div>
                </section>
                <section className="tb-block">
                  <label className="check"><input type="checkbox" checked={f.paid} onChange={(e) => set('paid', e.target.checked)} />{t('new.paidNow')}</label>
                  <span className="small muted">{f.paid ? t('new.renewsOn', { date: fmtDay(renews) }) : t('new.dueOn', { date: fmtDay(f.startDate) })}</span>
                </section>
              </>
            )}

            {step === 4 && (
              <>
                <div className="tb-sums">
                  <ReviewCard title={t('new.s.profile')} onEdit={() => setStep(0)} rows={[
                    [t('new.name'), name], [t('form.email'), f.email], [t('form.coachingType'), t(`tier.${f.tier}`)],
                    [t('new.body'), [f.heightCm ? `${f.heightCm} cm` : '', f.weightKg ? `${f.weightKg} kg` : ''].filter(Boolean).join(' · ') || '—'],
                  ]} />
                  <ReviewCard title={t('new.s.goals')} onEdit={() => setStep(1)} rows={[
                    [t('tb.goal'), t(`goal.${f.goalType}`)], ...goals.filter((x) => x.label.trim()).map((x) => [x.label, `${x.start} → ${x.target} ${x.unit}`] as [string, string]),
                    [t('form.sessionsPerWeek'), String(f.frequency)], [t('form.checkinDay'), weekdayName(f.checkinDay)],
                  ]} />
                  <ReviewCard title={t('new.s.program')} onEdit={() => setStep(2)} rows={tpl ? [
                    [t('roster.colProgram'), tpl.name], [t('form.startDate'), fmtDay(f.startDate)], [t('tpl.length'), t('tpl.nWeeks', { n: tpl.weeks })],
                  ] : [[t('roster.colProgram'), t('new.noneYet')]]} />
                  <ReviewCard title={t('new.s.membership')} onEdit={() => setStep(3)} rows={[
                    [t('billing.price'), t(f.cycle === 'quarterly' ? 'new.perQuarter' : 'new.perMonth', { v: formatMoney(f.price) })], [t('billing.paid'), f.paid ? t('new.yes') : t('new.notYet')],
                    [f.paid ? t('billing.renews') : t('new.due'), fmtDay(renews)],
                  ]} />
                </div>
                <section className="tb-block">
                  <div className="stack" style={{ gap: 2 }}>
                    <h3 className="tb-block-title">{t('new.welcomeTitle')}</h3>
                    <p className="small muted">{t('new.welcomeSub')}</p>
                  </div>
                  <textarea className="textarea" rows={4} aria-label={t('new.welcomeTitle')} value={welcome} onChange={(e) => { setWelcomeTouched(true); set('welcome', e.target.value); }} />
                </section>
                <section className="tb-block">
                  <label className="check"><input type="checkbox" checked={f.inbody} onChange={(e) => set('inbody', e.target.checked)} />{t('new.requestInbody')}</label>
                  {f.inbody && <input className="input" placeholder={t('inbody.notePlaceholder')} value={f.inbodyNote} onChange={(e) => set('inbodyNote', e.target.value)} />}
                </section>
              </>
            )}
          </div>

          <div className="tb-foot">
            <button type="button" className="btn" onClick={() => (step === 0 ? navigate('/coach/trainees') : setStep((s) => s - 1))}>{step === 0 ? t('common.cancel') : <><Icon name="chevronLeft" size={15} />{t('tb.back')}</>}</button>
            <span className="small muted">{step === 0 && !profileValid ? t('new.profileFirst') : ''}</span>
            {last
              ? <button type="button" className="btn primary" onClick={create}><Icon name="check" size={15} />{t('new.create')}</button>
              : <button type="button" className="btn primary" disabled={!profileValid} onClick={() => setStep((s) => s + 1)}>{t('tb.next', { step: t(`new.s.${STEPS[step + 1]}`) })}<Icon name="chevron" size={15} /></button>}
          </div>
        </div>

        <aside className="card tb-live" aria-label={t('new.summary')}>
          <div className="card-body" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 12 }}>
              <span className="avatar" style={{ width: 44, height: 44, background: TONES[state.trainees.length % TONES.length], color: '#17181c', fontSize: 15 }}>{(f.firstName[0] ?? '').toUpperCase()}{(f.lastName[0] ?? '').toUpperCase() || '—'}</span>
              <div className="stack grow" style={{ gap: 2, minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{name || t('common.newTrainee')}</span>
                <span className="small muted ellipsis">{f.email || t('new.noEmail')}</span>
              </div>
            </div>
            <div className="row wrap" style={{ gap: 6 }}>
              <span className="chip accent">{t('group.onboarding')}</span>
              <span className="chip">{t(`tier.${f.tier}`)}</span>
            </div>
            <dl className="kv">
              <dt>{t('tb.goal')}</dt><dd>{t(`goal.${f.goalType}`)}</dd>
              {f.weightKg && <><dt>{t('new.weight')}</dt><dd className="mono">{f.weightKg} kg</dd></>}
              <dt>{t('form.sessionsPerWeek')}</dt><dd>{f.frequency}</dd>
              <dt>{t('form.checkinDay')}</dt><dd>{weekdayName(f.checkinDay)}</dd>
              <dt>{t('roster.colProgram')}</dt><dd className="ellipsis">{tpl?.name ?? t('new.noneYet')}</dd>
              {tpl && <><dt>{t('new.startsOn')}</dt><dd>{fmtDay(f.startDate)}</dd></>}
              <dt>{t('billing.price')}</dt><dd>{t(f.cycle === 'quarterly' ? 'new.perQuarter' : 'new.perMonth', { v: formatMoney(f.price) })}</dd>
            </dl>
            <span className="xs faint" style={{ lineHeight: 1.5 }}>{t('new.liveHint')}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ReviewCard({ title, rows, onEdit }: { title: string; rows: [string, string][]; onEdit: () => void }) {
  const t = useT();
  return (
    <div className="tb-sum">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="tb-block-title" style={{ fontSize: 14 }}>{title}</span>
        <button type="button" className="link-btn" onClick={onEdit}>{t('builder.edit')}</button>
      </div>
      <dl className="kv">{rows.map(([k, v], i) => <div key={i} style={{ display: 'contents' }}><dt>{k}</dt><dd dir="auto">{v}</dd></div>)}</dl>
    </div>
  );
}
