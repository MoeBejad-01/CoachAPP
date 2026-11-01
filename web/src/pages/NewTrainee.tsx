import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createTrainee } from '../data/actions';
import { useAppState } from '../data/store';
import type { CoachingMode, GoalType } from '../data/types';
import { useToast } from '../components/ui';
import { useT } from '../i18n';
import { addDays, fmtDay, startOfWeek, todayISO, weekdayName } from '../lib/dates';

const MODES: CoachingMode[] = ['online', 'inperson', 'hybrid'];
const GOALS: { id: GoalType; tpl: string }[] = [
  { id: 'muscle', tpl: 'tpl-hyp4' },
  { id: 'strength', tpl: 'tpl-str3' },
  { id: 'fatloss', tpl: 'tpl-fat' },
  { id: 'sport', tpl: 'tpl-ath' },
  { id: 'rehab', tpl: 'tpl-rtt' },
  { id: 'health', tpl: 'tpl-str3' },
];
const STEPS = [1, 2, 3] as const;

export function NewTraineePage() {
  const state = useAppState();
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    firstName: '', lastName: '', email: '', phone: '', birthDate: '1996-01-01', heightCm: 170,
    mode: 'online' as CoachingMode, injuries: '',
    goalType: 'muscle' as GoalType, goalLabel: '', frequency: 3, checkinDay: 0,
    templateId: 'tpl-hyp4' as string | null, startDate: addDays(startOfWeek(todayISO()), 7),
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const step1Valid = f.firstName.trim() && f.lastName.trim() && /\S+@\S+\.\S+/.test(f.email);
  const suggested = GOALS.find((g) => g.id === f.goalType)?.tpl;
  const tpl = state.templates.find((x) => x.id === f.templateId);

  const next = () => {
    if (step === 1 && !step1Valid) return;
    if (step < 3) return setStep(step + 1);
    const id = createTrainee({
      firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim(), phone: f.phone, birthDate: f.birthDate,
      heightCm: f.heightCm, mode: f.mode, goalType: f.goalType, injuries: f.injuries, frequency: f.frequency, checkinDay: f.checkinDay,
      goalLabel: f.goalLabel, templateId: f.templateId, startDate: f.startDate,
    });
    toast(t('new.created', { name: f.firstName, email: f.email }));
    navigate(`/trainees/${id}`);
  };

  return (
    <>
      <div className="crumbs"><Link to="/trainees">{t('nav.trainees')}</Link><span aria-hidden="true">/</span><span style={{ color: 'var(--ink)' }}>{t('common.newTrainee')}</span></div>
      <header className="stack">
        <h1 className="page-title">{t('new.title')}</h1>
        <p className="muted">{t('new.subtitle')}</p>
      </header>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }} aria-label={t('new.steps')}>
        {STEPS.map((n) => {
          const cur = n === step;
          const reachable = n < step || !!step1Valid;
          return (
            <li key={n} style={{ flex: '1 1 180px' }}>
              <button type="button" disabled={!reachable && !cur} aria-current={cur ? 'step' : undefined} onClick={() => setStep(n)}
                className="choice" style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: cur ? 'var(--accent)' : undefined }}>
                <span className="avatar mono" style={{ width: 26, height: 26, fontSize: 12, background: cur ? 'var(--accent)' : n < step ? 'var(--ink)' : 'var(--muted-bg)', color: cur ? '#fff' : n < step ? 'var(--on-ink)' : 'var(--chip-ink)' }}>{n}</span>
                <span className="stack" style={{ gap: 1 }}><span className="t">{t(`new.step${n}`)}</span><span className="xs muted">{t(`new.step${n}.sub`)}</span></span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="split">
        <section className="card wide" aria-label={t('new.form')}>
          <div className="card-body" style={{ padding: 24, gap: 20 }}>
            {step === 1 && (
              <>
                <h2 className="card-title" style={{ fontSize: 16 }}>{t('new.step1')}</h2>
                <div className="form-grid">
                  <label className="field">{t('form.firstName')}<input className="input" value={f.firstName} onChange={(e) => set('firstName', e.target.value)} autoFocus /></label>
                  <label className="field">{t('form.lastName')}<input className="input" value={f.lastName} onChange={(e) => set('lastName', e.target.value)} /></label>
                  <label className="field">{t('form.email')}<input className="input" type="email" dir="ltr" placeholder="name@example.com" value={f.email} onChange={(e) => set('email', e.target.value)} /></label>
                  <label className="field">{t('form.phone')} <span className="hint">{t('form.optional')}</span><input className="input" type="tel" dir="ltr" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></label>
                  <label className="field">{t('form.birthDate')}<input className="input" type="date" value={f.birthDate} onChange={(e) => set('birthDate', e.target.value)} /></label>
                  <label className="field">{t('form.height')}<input className="input mono" type="number" value={f.heightCm} onChange={(e) => set('heightCm', Number(e.target.value))} /></label>
                </div>
                <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                  <legend className="field" style={{ marginBottom: 10, padding: 0 }}>{t('form.coachingType')}</legend>
                  <div className="choices">
                    {MODES.map((m) => (
                      <button key={m} type="button" className={`choice${f.mode === m ? ' on' : ''}`} aria-pressed={f.mode === m} onClick={() => set('mode', m)}>
                        <span className="t">{t(`mode.${m}`)}</span><span className="s">{t(`mode.${m}.sub`)}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="field">{t('form.injuriesLong')}<textarea className="textarea" rows={3} placeholder={t('form.injuriesPlaceholder')} value={f.injuries} onChange={(e) => set('injuries', e.target.value)} /></label>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="card-title" style={{ fontSize: 16 }}>{t('new.step2')}</h2>
                <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                  <legend className="field" style={{ marginBottom: 10, padding: 0 }}>{t('new.primaryGoal')}</legend>
                  <div className="choices">
                    {GOALS.map((g) => (
                      <button key={g.id} type="button" className={`choice${f.goalType === g.id ? ' on' : ''}`} aria-pressed={f.goalType === g.id} onClick={() => setF((x) => ({ ...x, goalType: g.id, templateId: g.tpl }))}>
                        <span className="t">{t(`goal.${g.id}`)}</span><span className="s">{t(`goal.${g.id}.sub`)}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="field">{t('new.target')}<input className="input" placeholder={t('new.targetPlaceholder')} value={f.goalLabel} onChange={(e) => set('goalLabel', e.target.value)} /></label>
                <div className="form-grid">
                  <div className="field">{t('new.daysPerWeek')}
                    <div className="pills">
                      {[2, 3, 4, 5, 6].map((n) => <button key={n} type="button" className={`pill${f.frequency === n ? ' on' : ''}`} aria-pressed={f.frequency === n} onClick={() => set('frequency', n)} style={{ height: 38 }}>{t('new.nDays', { n })}</button>)}
                    </div>
                  </div>
                  <label className="field">{t('form.checkinDay')}
                    <select className="select" value={f.checkinDay} onChange={(e) => set('checkinDay', Number(e.target.value))}>
                      {[0, 1, 2, 3, 4, 5, 6].map((i) => <option key={i} value={i}>{weekdayName(i)}</option>)}
                    </select>
                  </label>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h2 className="card-title" style={{ fontSize: 16 }}>{t('new.step3')}</h2>
                  <span className="small muted">{t('new.suggestedHint')}</span>
                </div>
                <div className="choices" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
                  {state.templates.map((x) => (
                    <button key={x.id} type="button" className={`choice${f.templateId === x.id ? ' on' : ''}`} aria-pressed={f.templateId === x.id} onClick={() => set('templateId', x.id)}>
                      <span className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
                        <span className="t">{x.name}</span>
                        {x.id === suggested && <span className="chip accent" style={{ fontSize: 11 }}>{t('new.suggested')}</span>}
                      </span>
                      <span className="s">{t('program.tplMeta', { w: x.weeks, d: x.days.length })}</span>
                    </button>
                  ))}
                  <button type="button" className={`choice${f.templateId === null ? ' on' : ''}`} aria-pressed={f.templateId === null} onClick={() => set('templateId', null)}>
                    <span className="t">{t('new.noProgram')}</span><span className="s">{t('new.assignLater')}</span>
                  </button>
                </div>
                <label className="field" style={{ maxWidth: 240 }}>{t('form.startDate')}<input className="input" type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} /></label>
              </>
            )}
          </div>
          <div className="card-foot">
            <button type="button" className="btn" onClick={() => (step === 1 ? navigate('/trainees') : setStep(step - 1))}>{step === 1 ? t('common.cancel') : t('common.back')}</button>
            <button type="button" className="btn primary" disabled={step === 1 && !step1Valid} onClick={next}>{step === 3 ? t('new.create') : t('common.continue')}</button>
          </div>
        </section>

        <aside className="card narrow" aria-label={t('new.summary')}>
          <div className="card-head"><h2 className="card-title">{t('new.summary')}</h2></div>
          <div className="card-body">
            <div className="row" style={{ gap: 12 }}>
              <span className="avatar" style={{ width: 44, height: 44, background: '#ede6f5' }}>{(f.firstName[0] ?? '').toUpperCase()}{(f.lastName[0] ?? '').toUpperCase() || '—'}</span>
              <div className="stack grow" style={{ gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{`${f.firstName} ${f.lastName}`.trim() || t('common.newTrainee')}</span>
                <span className="small muted ellipsis">{f.email || t('new.noEmail')}</span>
              </div>
            </div>
            <dl className="kv">
              <dt>{t('new.coaching')}</dt><dd>{t(`mode.${f.mode}`)}</dd>
              <dt>{t('new.goal')}</dt><dd>{t(`goal.${f.goalType}`)}</dd>
              <dt>{t('new.frequency')}</dt><dd>{t('trainee.planned', { n: f.frequency })}</dd>
              <dt>{t('roster.colProgram')}</dt><dd>{tpl?.name ?? t('new.noneYet')}</dd>
              <dt>{t('new.startsOn')}</dt><dd>{fmtDay(f.startDate)}</dd>
            </dl>
            <div className="stack small muted" style={{ borderTop: '1px solid var(--divider)', paddingTop: 14, gap: 8, lineHeight: 1.5 }}>
              <span style={{ color: 'var(--ink)', fontWeight: 500, fontSize: 13 }}>{t('new.receives')}</span>
              <span>{t('new.receives1')}</span>
              <span>{t('new.receives2')}</span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
