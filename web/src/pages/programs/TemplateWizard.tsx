// Creating a template step by step: basics, training days, nutrition,
// recovery & activity, instructions, then a review before saving.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createTemplate } from '../../data/actions';
import { cloneDays } from '../../data/plan';
import { defaultGuide, nutritionFor } from '../../data/guide';
import { useAppState } from '../../data/store';
import type { GoalType, ProgramGuide } from '../../data/types';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/ui';
import { useT } from '../../i18n';
import { applyGuide, BasicsStep, GuideSummary, type GuidePatch, InstructionsStep, NutritionStep, RecoveryStep, TrainingStep, resizeDays, type Draft } from './sections';

const STEPS = ['basics', 'training', 'nutrition', 'recovery', 'instructions', 'review'] as const;

export function TemplateWizard() {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const state = useAppState();
  const [step, setStep] = useState(0);
  const [from, setFrom] = useState('');
  const [touched, setTouched] = useState(false); // nutrition/recovery edited by hand
  const [tpl, setTpl] = useState<Draft>(() => ({
    name: '', summary: '', tags: [], weeks: 8, loadMethod: 'RPE + kg target', progression: 'Double progression',
    days: resizeDays([], 3, t), guide: defaultGuide('muscle'),
  }));

  const set = (patch: Partial<Draft>) => setTpl((x) => ({ ...x, ...patch }));
  const setGuide = (patch: GuidePatch) => { if (step >= 2) setTouched(true); setTpl((x) => ({ ...x, guide: applyGuide(x.guide, patch) })); };
  // Until the coach edits nutrition or recovery, picking a goal fills sensible defaults for it.
  const onGoal = (goal: GoalType) => setTpl((x) => ({ ...x, guide: touched ? { ...x.guide, goal } : { ...defaultGuide(goal), ...pick(x.guide), goal, ...nutritionFor(goal) } }));
  const pick = (g: ProgramGuide) => ({ level: g.level, sessionMin: g.sessionMin, equipment: g.equipment, instructions: g.instructions, warmup: g.warmup, deloadWeek: g.deloadWeek });

  const startFrom = (id: string) => {
    setFrom(id);
    const src = state.templates.find((x) => x.id === id);
    if (!src) return;
    setTpl((x) => ({ ...x, summary: src.summary, tags: [...src.tags], weeks: src.weeks, loadMethod: src.loadMethod, progression: src.progression, days: cloneDays(src.days), guide: structuredClone(src.guide) }));
    setTouched(true);
  };

  const canNext = step !== 0 || tpl.name.trim().length > 0;
  const last = step === STEPS.length - 1;
  const create = () => {
    const id = createTemplate({ ...tpl, name: tpl.name.trim() });
    toast(t('tb.created', { name: tpl.name.trim() }));
    navigate(`/coach/programs/${id}`);
  };
  const props = { tpl, set, setGuide };
  const g = tpl.guide;

  return (
    <div className="tb-page">
      <header className="page-head">
        <div className="stack" style={{ gap: 4 }}>
          <Link to="/coach/programs" className="small row" style={{ gap: 4, color: 'var(--muted)' }}><Icon name="chevronLeft" size={14} />{t('tpl.title')}</Link>
          <h1 className="page-title">{t('tb.newTitle')}</h1>
        </div>
        {step === 0 && state.templates.length > 0 && (
          <label className="row small" style={{ gap: 8 }}>
            <span className="muted">{t('tb.startFrom')}</span>
            <select className="select" style={{ width: 240 }} value={from} onChange={(e) => (e.target.value ? startFrom(e.target.value) : setFrom(''))}>
              <option value="">{t('tb.blank')}</option>
              {state.templates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
        )}
      </header>

      <ol className="stepper" aria-label={t('tb.stepsNav')}>
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" className={`step${i === step ? ' on' : ''}${i < step ? ' done' : ''}`} aria-current={i === step ? 'step' : undefined} disabled={i > step && !canNext} onClick={() => setStep(i)}>
              <span className="step-n">{i < step ? <Icon name="check" size={13} strokeWidth={2.5} /> : i + 1}</span>
              <span className="step-l">{t(`tb.step.${s}`)}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="tb-layout">
        <div className="card tb-main">
          <div className="tb-step-head">
            <span className="xs faint">{t('tb.stepOf', { n: step + 1, of: STEPS.length })}</span>
            <h2 className="card-title" style={{ fontSize: 18 }}>{t(`tb.step.${STEPS[step]}`)}</h2>
            <p className="small muted">{t(`tb.step.${STEPS[step]}.sub`)}</p>
          </div>
          <div className="tb-step-body">
            {step === 0 && <BasicsStep {...props} creating onGoal={onGoal} />}
            {step === 1 && <TrainingStep {...props} />}
            {step === 2 && <NutritionStep {...props} />}
            {step === 3 && <RecoveryStep {...props} />}
            {step === 4 && <InstructionsStep {...props} />}
            {step === 5 && <GuideSummary guide={g} weeks={tpl.weeks} days={tpl.days.length} onEdit={setStep} />}
          </div>
          <div className="tb-foot">
            <button type="button" className="btn" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><Icon name="chevronLeft" size={15} />{t('tb.back')}</button>
            <span className="small muted">{step === 0 && !canNext ? t('tb.nameFirst') : ''}</span>
            {last
              ? <button type="button" className="btn primary" onClick={create}><Icon name="check" size={15} />{t('tb.create')}</button>
              : <button type="button" className="btn primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>{t('tb.next', { step: t(`tb.step.${STEPS[step + 1]}`) })}<Icon name="chevron" size={15} /></button>}
          </div>
        </div>

        {/* Live summary */}
        <aside className="card tb-live" aria-label={t('tb.live')}>
          <div className="card-head"><h2 className="card-title">{tpl.name.trim() || t('tb.untitled')}</h2></div>
          <div className="card-body" style={{ gap: 10 }}>
            <div className="row wrap" style={{ gap: 6 }}>
              <span className="chip accent">{t(`goal.${g.goal}`)}</span>
              <span className="chip">{t(`tb.level.${g.level}`)}</span>
            </div>
            <dl className="kv">
              <dt>{t('tpl.length')}</dt><dd>{t('tpl.nWeeks', { n: tpl.weeks })}</dd>
              <dt>{t('tb.daysPerWeek')}</dt><dd>{tpl.days.length}</dd>
              <dt>{t('tb.exercisesTotal')}</dt><dd>{tpl.days.reduce((n, d) => n + d.exercises.length, 0)}</dd>
              <dt>{t('tb.sessionMin')}</dt><dd>{t('common.minutes', { n: g.sessionMin })}</dd>
              <dt>{t('tb.calories')}</dt><dd className="mono">{g.calories ? `${g.calories.toLocaleString('en')} kcal` : '—'}</dd>
              <dt>{t('tb.macrosShort')}</dt><dd className="mono" dir="ltr">{g.proteinG ?? '—'}/{g.carbsG ?? '—'}/{g.fatG ?? '—'} g</dd>
              <dt>{t('tb.sleep')}</dt><dd className="mono">{g.sleepH ?? '—'} {t('tb.hoursUnit')}</dd>
              <dt>{t('tb.steps')}</dt><dd className="mono">{g.steps?.toLocaleString('en') ?? '—'}</dd>
              <dt>{t('tb.cardioTitle')}</dt><dd>{g.cardioPerWeek ? t('tb.cardioSummary', { n: g.cardioPerWeek, m: g.cardioMin ?? '—' }) : t('tb.none')}</dd>
            </dl>
            <span className="xs faint">{t('tb.liveHint')}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
