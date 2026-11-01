// The parts of a program template. The new-template wizard shows them as steps,
// the template editor as tabs, and a trainee's Program tab reuses the guide parts.

import type { ReactNode } from 'react';
import { blankDay } from '../../data/actions';
import { macroKcal, nutritionFor } from '../../data/guide';
import type { Equipment, GoalType, Level, ProgramDay, ProgramGuide, Template } from '../../data/types';
import { Icon } from '../../components/Icon';
import { ProgramEditor } from '../../components/ProgramEditor';
import { useT, type T } from '../../i18n';
import type { StringKey } from '../../i18n/strings';

export type Draft = Omit<Template, 'id' | 'updatedAt'>;
export interface StepProps {
  tpl: Draft;
  set: (patch: Partial<Draft>) => void;
  /** A patch, or a function of the latest guide (for edits that build on the current text). */
  setGuide: (patch: GuidePatch) => void;
}
export type GuidePatch = Partial<ProgramGuide> | ((g: ProgramGuide) => Partial<ProgramGuide>);
export const applyGuide = (g: ProgramGuide, patch: GuidePatch): ProgramGuide => ({ ...g, ...(typeof patch === 'function' ? patch(g) : patch) });

const GOALS: GoalType[] = ['muscle', 'strength', 'fatloss', 'sport', 'rehab', 'health'];
const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced', 'all'];
const EQUIPMENT: Equipment[] = ['gym', 'barbell', 'dumbbells', 'machines', 'bands', 'bodyweight', 'home'];
// Stored values stay in English; labels are translated.
export const LOAD_METHODS: [string, StringKey][] = [['RPE + kg target', 'tpl.load.rpe'], ['% of 1RM', 'tpl.load.pct'], ['Fixed kg', 'tpl.load.fixed']];
export const PROGRESSIONS: [string, StringKey][] = [['Double progression', 'tpl.prog.double'], ['Linear +2.5 kg / week', 'tpl.prog.linear'], ['Wave loading', 'tpl.prog.wave'], ['Manual', 'tpl.prog.manual']];

// ---------- Small controls ----------

export function NumField({ label, value, onChange, step = 1, min = 0, max, unit, hint, presets }: {
  label: string; value: number | null; onChange: (v: number | null) => void; step?: number; min?: number; max?: number; unit?: string; hint?: string; presets?: number[];
}) {
  const t = useT();
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min, Math.round(n / step) * step));
  return (
    <div className="field">
      <span>{label}</span>
      <div className="num-field">
        <button type="button" aria-label={t('tb.less', { label })} onClick={() => onChange(clamp((value ?? 0) - step))}><Icon name="down" size={15} /></button>
        <input inputMode="decimal" aria-label={label} value={value ?? ''} placeholder="—" onChange={(e) => { const v = e.target.value.trim(); onChange(v === '' ? null : Number.isNaN(Number(v)) ? value : Number(v)); }} />
        {unit && <span className="num-unit">{unit}</span>}
        <button type="button" aria-label={t('tb.more', { label })} onClick={() => onChange(clamp((value ?? 0) + step))}><Icon name="up" size={15} /></button>
      </div>
      {presets && (
        <div className="row wrap" style={{ gap: 6 }}>
          {presets.map((p) => <button key={p} type="button" className={`mini-chip${value === p ? ' on' : ''}`} onClick={() => onChange(p)}>{p.toLocaleString('en')}</button>)}
        </div>
      )}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Chips<V extends string | number>({ options, value, onChange, label }: { options: { v: V; label: string }[]; value: V | V[]; onChange: (v: V) => void; label: string }) {
  const on = (v: V) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <div className="row wrap" role="group" aria-label={label} style={{ gap: 6 }}>
      {options.map((o) => <button key={String(o.v)} type="button" aria-pressed={on(o.v)} className={`pick-chip${on(o.v) ? ' on' : ''}`} onClick={() => onChange(o.v)}>{on(o.v) && Array.isArray(value) && <Icon name="check" size={13} strokeWidth={2.5} />}{o.label}</button>)}
    </div>
  );
}

function Block({ title, sub, children, action }: { title: string; sub?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="tb-block">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div className="stack" style={{ gap: 2 }}>
          <h3 className="tb-block-title">{title}</h3>
          {sub && <p className="small muted">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Adds blank days or drops trailing ones to match a days-per-week choice. */
export function resizeDays(days: ProgramDay[], n: number, t: T): ProgramDay[] {
  if (days.length >= n) return days.slice(0, n);
  return [...days, ...Array.from({ length: n - days.length }, (_, i) => blankDay(t('editor.dayN', { n: days.length + i + 1 }), t('editor.newExercise')))];
}

// ---------- Steps ----------

export function BasicsStep({ tpl, set, setGuide, creating, onGoal }: StepProps & { creating?: boolean; onGoal?: (g: GoalType) => void }) {
  const t = useT();
  const g = tpl.guide;
  return (
    <>
      <Block title={t('tb.basics.nameTitle')}>
        <label className="field">{t('tpl.name')}
          <input className="input" style={{ fontSize: 17, fontWeight: 600, height: 46 }} placeholder={t('tb.namePlaceholder')} value={tpl.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="field">{t('tpl.summary')}<input className="input" placeholder={t('tpl.summaryPlaceholder')} value={tpl.summary} onChange={(e) => set({ summary: e.target.value })} /></label>
      </Block>

      <Block title={t('tb.goal')} sub={creating ? t('tb.goalSub') : undefined}>
        <div className="choices">
          {GOALS.map((x) => (
            <button key={x} type="button" className={`choice${g.goal === x ? ' on' : ''}`} onClick={() => (onGoal ? onGoal(x) : setGuide({ goal: x }))}>
              <span className="t">{t(`goal.${x}`)}</span>
              <span className="s">{t(`goal.${x}.sub`)}</span>
            </button>
          ))}
        </div>
      </Block>

      <Block title={t('tb.structure')}>
        <div className="tb-grid">
          <div className="field"><span>{t('tb.level')}</span><Chips label={t('tb.level')} value={g.level} onChange={(level) => setGuide({ level })} options={LEVELS.map((v) => ({ v, label: t(`tb.level.${v}`) }))} /></div>
          <div className="field"><span>{t('tpl.length')}</span><Chips label={t('tpl.length')} value={tpl.weeks} onChange={(weeks) => { set({ weeks }); setGuide((cur) => (cur.deloadWeek && cur.deloadWeek > weeks ? { deloadWeek: null } : {})); }} options={[4, 6, 8, 10, 12, 16].map((v) => ({ v, label: t('tpl.nWeeks', { n: v }) }))} /></div>
          {creating && <div className="field"><span>{t('tb.daysPerWeek')}</span><Chips label={t('tb.daysPerWeek')} value={tpl.days.length} onChange={(n) => set({ days: resizeDays(tpl.days, n, t) })} options={[2, 3, 4, 5, 6].map((v) => ({ v, label: t('tb.nDays', { n: v }) }))} /></div>}
          <div className="field"><span>{t('tb.sessionMin')}</span><Chips label={t('tb.sessionMin')} value={g.sessionMin} onChange={(sessionMin) => setGuide({ sessionMin })} options={[30, 45, 60, 75, 90].map((v) => ({ v, label: t('common.minutes', { n: v }) }))} /></div>
          <div className="field" style={{ gridColumn: '1 / -1' }}><span>{t('tb.equipment')}</span>
            <Chips label={t('tb.equipment')} value={g.equipment} onChange={(x) => setGuide({ equipment: g.equipment.includes(x) ? g.equipment.filter((e) => e !== x) : [...g.equipment, x] })} options={EQUIPMENT.map((v) => ({ v, label: t(`tb.eq.${v}`) }))} />
          </div>
        </div>
      </Block>

      <Block title={t('tb.loading')}>
        <div className="tb-grid">
          <label className="field">{t('tpl.loadMethod')}
            <select className="select" value={tpl.loadMethod} onChange={(e) => set({ loadMethod: e.target.value })}>{LOAD_METHODS.map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}</select>
          </label>
          <label className="field">{t('tpl.progression')}
            <select className="select" value={tpl.progression} onChange={(e) => set({ progression: e.target.value })}>{PROGRESSIONS.map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}</select>
          </label>
          <label className="field">{t('tpl.tags')} <span className="hint">{t('tpl.tagsHint')}</span>
            <input className="input" value={tpl.tags.join(', ')} onChange={(e) => set({ tags: e.target.value.split(/[,،]/).map((s) => s.trim()).filter(Boolean) })} />
          </label>
        </div>
      </Block>
    </>
  );
}

export function TrainingStep({ tpl, set }: StepProps) {
  const t = useT();
  const sets = tpl.days.reduce((n, d) => n + d.exercises.reduce((m, e) => m + e.sets, 0), 0);
  return (
    <Block title={t('tb.trainingTitle')} sub={t('tb.trainingSub', { d: tpl.days.length, s: sets })}>
      <div className="tb-editor"><ProgramEditor days={tpl.days} editing onChange={(days) => set({ days })} /></div>
    </Block>
  );
}

export function NutritionStep({ tpl, setGuide }: StepProps) {
  const t = useT();
  const g = tpl.guide;
  const kcal = macroKcal(g.proteinG, g.carbsG, g.fatG);
  const diff = g.calories ? kcal - g.calories : 0;
  const off = !!g.calories && kcal > 0 && Math.abs(diff) > g.calories * 0.05;
  const pct = (n: number) => (kcal ? Math.round((n / kcal) * 100) : 0);
  const parts: [string, number, string][] = [
    [t('tb.protein'), (g.proteinG ?? 0) * 4, 'var(--accent)'],
    [t('tb.carbs'), (g.carbsG ?? 0) * 4, 'var(--set-bar)'],
    [t('tb.fat'), (g.fatG ?? 0) * 9, 'var(--warn-strong)'],
  ];
  return (
    <>
      <Block title={t('tb.calTitle')} sub={t('tb.calSub')} action={<button type="button" className="btn sm" onClick={() => setGuide(nutritionFor(g.goal))}><Icon name="bolt" size={14} />{t('tb.suggest', { goal: t(`goal.${g.goal}`) })}</button>}>
        <div className="tb-grid">
          <NumField label={t('tb.calories')} unit="kcal" step={50} value={g.calories} onChange={(calories) => setGuide({ calories })} presets={[1800, 2200, 2600, 3000]} />
          <NumField label={t('tb.restCalories')} unit="kcal" step={50} value={g.restCalories} onChange={(restCalories) => setGuide({ restCalories })} hint={t('tb.restCaloriesHint')} />
        </div>
      </Block>

      <Block title={t('tb.macrosTitle')} sub={t('tb.macrosSub')}>
        <div className="tb-grid three">
          <NumField label={t('tb.protein')} unit="g" step={5} value={g.proteinG} onChange={(proteinG) => setGuide({ proteinG })} />
          <NumField label={t('tb.carbs')} unit="g" step={5} value={g.carbsG} onChange={(carbsG) => setGuide({ carbsG })} />
          <NumField label={t('tb.fat')} unit="g" step={5} value={g.fatG} onChange={(fatG) => setGuide({ fatG })} />
        </div>
        <div className="macro-bar" dir="ltr" aria-hidden="true">
          {parts.map(([k, v, c]) => <span key={k} style={{ width: `${kcal ? (v / kcal) * 100 : 0}%`, background: c }} />)}
        </div>
        <div className="row wrap small" style={{ gap: 16, justifyContent: 'space-between' }}>
          <span className="row wrap" style={{ gap: 14 }}>
            {parts.map(([k, v, c]) => <span key={k} className="row" style={{ gap: 6 }}><span className="dot" style={{ background: c }} />{k} {pct(v)}%</span>)}
          </span>
          <span className={off ? 'warn' : 'muted'}>{t('tb.macroTotal', { n: Math.round(kcal).toLocaleString('en') })}</span>
        </div>
        {off && (
          <div className="tb-warn">
            <span>{t('tb.macroOff', { d: `${diff > 0 ? '+' : '−'}${Math.abs(Math.round(diff)).toLocaleString('en')}` })}</span>
            <button type="button" className="btn sm" onClick={() => g.calories && setGuide({ carbsG: Math.max(0, Math.round((g.calories - (g.proteinG ?? 0) * 4 - (g.fatG ?? 0) * 9) / 4)) })}>{t('tb.balanceCarbs')}</button>
          </div>
        )}
      </Block>

      <Block title={t('tb.habitsTitle')}>
        <div className="tb-grid">
          <NumField label={t('tb.water')} unit="L" step={0.25} value={g.waterL} onChange={(waterL) => setGuide({ waterL })} presets={[2, 2.5, 3, 3.5]} />
          <div className="field"><span>{t('tb.meals')}</span><Chips label={t('tb.meals')} value={g.meals ?? 0} onChange={(meals) => setGuide({ meals })} options={[2, 3, 4, 5, 6].map((v) => ({ v, label: String(v) }))} /></div>
        </div>
        <label className="field">{t('tb.nutritionNotes')}
          <textarea className="textarea" rows={3} placeholder={t('tb.nutritionNotesPlaceholder')} value={g.nutritionNotes} onChange={(e) => setGuide({ nutritionNotes: e.target.value })} />
        </label>
      </Block>
    </>
  );
}

export function RecoveryStep({ tpl, setGuide }: StepProps) {
  const t = useT();
  const g = tpl.guide;
  return (
    <>
      <Block title={t('tb.sleepStepsTitle')} sub={t('tb.sleepStepsSub')}>
        <div className="tb-grid">
          <NumField label={t('tb.sleep')} unit={t('tb.hoursUnit')} step={0.5} min={4} max={12} value={g.sleepH} onChange={(sleepH) => setGuide({ sleepH })} presets={[7, 7.5, 8, 9]} />
          <NumField label={t('tb.steps')} unit={t('tb.stepsUnit')} step={500} value={g.steps} onChange={(steps) => setGuide({ steps })} presets={[6000, 8000, 10000, 12000]} />
        </div>
      </Block>
      <Block title={t('tb.cardioTitle')} sub={t('tb.cardioSub')}>
        <div className="tb-grid">
          <div className="field"><span>{t('tb.cardioPerWeek')}</span><Chips label={t('tb.cardioPerWeek')} value={g.cardioPerWeek ?? 0} onChange={(cardioPerWeek) => setGuide({ cardioPerWeek })} options={[0, 1, 2, 3, 4, 5].map((v) => ({ v, label: v === 0 ? t('tb.none') : `${v}×` }))} /></div>
          {(g.cardioPerWeek ?? 0) > 0 && <NumField label={t('tb.cardioMin')} unit="min" step={5} value={g.cardioMin} onChange={(cardioMin) => setGuide({ cardioMin })} presets={[15, 20, 30, 45]} />}
        </div>
        {(g.cardioPerWeek ?? 0) > 0 && (
          <label className="field">{t('tb.cardioType')}<input className="input" placeholder={t('tb.cardioTypePlaceholder')} value={g.cardioType} onChange={(e) => setGuide({ cardioType: e.target.value })} /></label>
        )}
      </Block>
      <Block title={t('tb.restDayTitle')}>
        <label className="field">{t('tb.restDayNotes')}
          <textarea className="textarea" rows={3} placeholder={t('tb.restDayPlaceholder')} value={g.restDayNotes} onChange={(e) => setGuide({ restDayNotes: e.target.value })} />
        </label>
      </Block>
    </>
  );
}

const QUICK: StringKey[] = ['tb.quick.rir', 'tb.quick.log', 'tb.quick.video', 'tb.quick.pain', 'tb.quick.weigh'];

export function InstructionsStep({ tpl, setGuide }: StepProps) {
  const t = useT();
  const g = tpl.guide;
  const addLine = (line: string) => setGuide((cur) => ({ instructions: cur.instructions.includes(line) ? cur.instructions : `${cur.instructions.trim()}${cur.instructions.trim() ? '\n' : ''}${line}` }));
  return (
    <>
      <Block title={t('tb.instructionsTitle')} sub={t('tb.instructionsSub')}>
        <div className="row wrap" style={{ gap: 6 }}>
          {QUICK.map((k) => <button key={k} type="button" className="mini-chip" onClick={() => addLine(t(k))}><Icon name="plus" size={12} strokeWidth={2} />{t(k)}</button>)}
        </div>
        <textarea className="textarea" rows={6} aria-label={t('tb.instructionsTitle')} placeholder={t('tb.instructionsPlaceholder')} value={g.instructions} onChange={(e) => setGuide({ instructions: e.target.value })} />
      </Block>
      <Block title={t('tb.warmupTitle')}>
        <textarea className="textarea" rows={3} aria-label={t('tb.warmupTitle')} placeholder={t('tb.warmupPlaceholder')} value={g.warmup} onChange={(e) => setGuide({ warmup: e.target.value })} />
      </Block>
      <Block title={t('tb.deloadTitle')} sub={t('tb.deloadSub')}>
        <Chips label={t('tb.deloadTitle')} value={g.deloadWeek ?? 0} onChange={(w) => setGuide({ deloadWeek: w || null })}
          options={[{ v: 0, label: t('tb.none') }, ...Array.from({ length: tpl.weeks }, (_, i) => ({ v: i + 1, label: t('weeks.week', { n: i + 1 }) }))]} />
      </Block>
    </>
  );
}

/** Read-only summary of a guide, for the review step and a trainee's Program tab. */
export function GuideSummary({ guide: g, weeks, days, onEdit }: { guide: ProgramGuide; weeks?: number; days?: number; onEdit?: (step: number) => void }) {
  const t = useT();
  const num = (v: number | null, unit: string) => (v === null ? '—' : `${v.toLocaleString('en')} ${unit}`);
  const card = (step: number, title: string, rows: [string, string][], text?: string) => (
    <div className="tb-sum">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="tb-block-title" style={{ fontSize: 14 }}>{title}</span>
        {onEdit && <button type="button" className="link-btn" onClick={() => onEdit(step)}>{t('builder.edit')}</button>}
      </div>
      <dl className="kv">{rows.map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd dir="auto">{v}</dd></div>)}</dl>
      {text && <p className="small muted" style={{ lineHeight: 1.5, whiteSpace: 'pre-line' }}>{text}</p>}
    </div>
  );
  return (
    <div className="tb-sums">
      {weeks !== undefined && card(0, t('tb.step.basics'), [
        [t('tb.goal'), t(`goal.${g.goal}`)], [t('tb.level'), t(`tb.level.${g.level}`)],
        [t('tpl.length'), t('tpl.nWeeks', { n: weeks })], [t('tb.daysPerWeek'), String(days ?? 0)],
        [t('tb.sessionMin'), t('common.minutes', { n: g.sessionMin })], [t('tb.equipment'), g.equipment.map((e) => t(`tb.eq.${e}`)).join(', ') || '—'],
      ])}
      {card(2, t('tb.step.nutrition'), [
        [t('tb.calories'), num(g.calories, 'kcal')], ...(g.restCalories ? [[t('tb.restCalories'), num(g.restCalories, 'kcal')] as [string, string]] : []),
        [t('tb.macrosShort'), `${g.proteinG ?? '—'} / ${g.carbsG ?? '—'} / ${g.fatG ?? '—'} g`],
        [t('tb.water'), num(g.waterL, 'L')], [t('tb.meals'), g.meals ? String(g.meals) : '—'],
      ], g.nutritionNotes)}
      {card(3, t('tb.step.recovery'), [
        [t('tb.sleep'), num(g.sleepH, t('tb.hoursUnit'))], [t('tb.steps'), num(g.steps, '')],
        [t('tb.cardioTitle'), g.cardioPerWeek ? t('tb.cardioSummary', { n: g.cardioPerWeek, m: g.cardioMin ?? '—' }) : t('tb.none')],
      ], [g.cardioType, g.restDayNotes].filter(Boolean).join('\n'))}
      {card(4, t('tb.step.instructions'), [
        [t('tb.deloadTitle'), g.deloadWeek ? t('weeks.week', { n: g.deloadWeek }) : t('tb.none')],
      ], [g.instructions, g.warmup && `${t('tb.warmupTitle')}: ${g.warmup}`].filter(Boolean).join('\n\n'))}
    </div>
  );
}
