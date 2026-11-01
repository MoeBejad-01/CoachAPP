// The trainee's program, week by week: weekly targets on top, then every
// training day of that week with what the trainee actually logged.

import { useMemo, useState } from 'react';
import { blankDay, updateTraineeProgram } from '../../data/actions';
import { shown } from '../../data/layout';
import { cloneDays, weekIndex, weekRange } from '../../data/plan';
import { slotsFor } from '../../data/selectors';
import { useAppState } from '../../data/store';
import type { AppState, Exercise, ProgramDay, ProgramWeek, TargetId, Trainee, WeekTargets, WorkoutLog } from '../../data/types';
import { Icon } from '../../components/Icon';
import { DayTable } from '../../components/ProgramEditor';
import { Empty, useToast } from '../../components/ui';
import { useT, type T } from '../../i18n';
import { addDays, dayOfWeek, fmtDay, fmtDow, fmtRelativeDay, fmtShort, todayISO } from '../../lib/dates';
import { e1rm, fmtKg, uid } from '../../lib/util';
import { ChangeProgramModal } from './modals';
import { SetChips } from './sections';

type Entry = WorkoutLog['entries'][number];

export function ProgramTab({ trainee, logs }: { trainee: Trainee; logs: WorkoutLog[] }) {
  const t = useT();
  const state = useAppState();
  const L = state.traineeLayout;
  const toast = useToast();
  const p = trainee.program;
  const today = todayISO();
  const [week, setWeek] = useState(() => (p ? weekIndex(p, today) : 0));
  const [draft, setDraft] = useState<ProgramWeek[] | null>(null);
  const [name, setName] = useState('');
  const [changing, setChanging] = useState(false);

  // Best e1RM per exercise before each log, for PR marks.
  const prevBestAt = useMemo(() => {
    const out = new Map<string, number>(); // `${logId}|${exercise}` -> best before
    const best = new Map<string, number>();
    for (const log of logs) for (const e of log.entries) {
      const prev = best.get(e.exerciseName) ?? 0;
      out.set(`${log.id}|${e.exerciseName}`, prev);
      best.set(e.exerciseName, Math.max(prev, ...e.sets.map((s) => e1rm(s.weight, s.reps))));
    }
    return out;
  }, [logs]);

  if (!p) {
    return (
      <div className="card">
        <Empty>
          <div className="stack" style={{ alignItems: 'center', gap: 12 }}>
            <span>{t('program.none')}</span>
            <button type="button" className="btn primary" onClick={() => setChanging(true)}>{t('program.assignTitle')}</button>
          </div>
        </Empty>
        {changing && <ChangeProgramModal trainee={trainee} onClose={() => setChanging(false)} />}
      </div>
    );
  }

  const editing = draft !== null;
  const plan = draft ?? p.plan;
  const w = Math.min(week, plan.length - 1);
  const wk = plan[w];
  const range = weekRange(p, w);
  const current = weekIndex(p, today);
  const started = p.startDate <= today;
  const phase = !started || range.start > today ? 'upcoming' : range.end < today ? 'done' : 'current';
  const weekLogs = logs.filter((l) => l.date >= range.start && l.date <= range.end);
  const slots = slotsFor(trainee);
  const targetIds = shown(L.targetFields);

  const setWeekDraft = (next: ProgramWeek) => setDraft((d) => d && d.map((x, i) => (i === w ? next : x)));
  const setTargets = (patch: Partial<WeekTargets>) => setWeekDraft({ ...wk, targets: { ...wk.targets, ...patch } });
  const setDayAt = (i: number, day: ProgramDay) => setWeekDraft({ ...wk, days: wk.days.map((d, j) => (j === i ? day : d)) });
  const copyWeek = (src: ProgramWeek, keep: ProgramWeek): ProgramWeek => ({
    id: keep.id, days: cloneDays(src.days),
    targets: { ...src.targets, bodyWeightKg: keep.targets.bodyWeightKg, focus: keep.targets.focus },
  });

  const dateOf = (i: number) => {
    const slot = slots[i];
    if (slot === undefined) return null;
    return addDays(range.start, (slot - dayOfWeek(range.start) + 7) % 7);
  };

  const renderLogged = (dayLog: WorkoutLog | undefined) => (ex: Exercise) => {
    const entry = dayLog?.entries.find((e) => e.exerciseName === ex.name);
    if (dayLog && entry) return <LoggedCell t={t} entry={entry} prevBest={prevBestAt.get(`${dayLog.id}|${ex.name}`)} when={fmtRelativeDay(dayLog.date)} />;
    // Nothing for this week yet: show the most recent time it was done, marked as earlier.
    const before = [...logs].reverse().find((l) => l.date < range.start && l.entries.some((e) => e.exerciseName === ex.name));
    const prev = before?.entries.find((e) => e.exerciseName === ex.name);
    if (before && prev && phase !== 'done') return <LoggedCell t={t} entry={prev} faded when={t('weeks.earlier', { when: fmtRelativeDay(before.date) })} />;
    return <span className="xs faint">{phase === 'done' ? t('weeks.notDone') : t('program.notLogged')}</span>;
  };

  const save = () => {
    if (!draft) return;
    updateTraineeProgram(trainee.id, { ...p, name: name.trim() || p.name, plan: draft, weeks: draft.length });
    setDraft(null);
    toast(t('program.updated'));
  };

  return (
    <section className="card" aria-label={t('trainee.tab.program')}>
      <div className="card-head">
        <div className="stack" style={{ gap: 2 }}>
          {editing
            ? <input className="input compact" aria-label={t('program.name')} style={{ width: 320, fontWeight: 600 }} value={name} onChange={(e) => setName(e.target.value)} />
            : <h2 className="card-title">{p.name}</h2>}
          <span className="small muted">{t('weeks.meta', { date: fmtDay(p.startDate), w: plan.length, d: wk.days.length })}{p.templateId ? ` · ${t('program.customCopy')}` : ''}</span>
        </div>
        <div className="row">
          {editing ? (
            <>
              <button type="button" className="btn sm" onClick={() => setDraft(null)}>{t('common.cancel')}</button>
              <button type="button" className="btn sm primary" onClick={save}>{t('common.saveChanges')}</button>
            </>
          ) : (
            <>
              <button type="button" className="btn sm" onClick={() => setChanging(true)}>{t('program.change')}</button>
              <button type="button" className="btn sm dark" onClick={() => { setDraft(structuredClone(p.plan)); setName(p.name); }}><Icon name="edit" size={14} />{t('program.editFor', { name: trainee.firstName })}</button>
            </>
          )}
        </div>
      </div>

      {/* Week switcher */}
      <div className="row wrap" style={{ padding: '12px 20px', borderBottom: '1px solid var(--divider)', justifyContent: 'space-between' }}>
        <div className="seg" role="tablist" aria-label={t('weeks.weeks')}>
          {plan.map((x, i) => (
            <button key={x.id} type="button" role="tab" aria-selected={i === w} className={i === w ? 'on' : ''} onClick={() => setWeek(i)}>
              {t('weeks.week', { n: i + 1 })}
              {started && i === current && <span className="week-dot" title={t('weeks.current')} />}
            </button>
          ))}
        </div>
        {editing && (
          <div className="row wrap">
            <button type="button" className="btn sm" onClick={() => { setDraft([...plan, { ...copyWeek(plan[plan.length - 1], plan[plan.length - 1]), id: uid('w') }]); setWeek(plan.length); }}>
              <Icon name="plus" size={14} strokeWidth={2} />{t('weeks.addWeek')}
            </button>
            <button type="button" className="btn sm danger" disabled={plan.length <= 1} onClick={() => { setDraft(plan.filter((_, i) => i !== w)); setWeek(Math.max(0, w - 1)); }}>
              <Icon name="trash" size={14} />{t('weeks.removeWeek')}
            </button>
          </div>
        )}
      </div>

      {/* Week header */}
      <div className="row wrap" style={{ padding: '16px 20px 4px', justifyContent: 'space-between' }}>
        <div className="row wrap" style={{ gap: 10 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{t('weeks.week', { n: w + 1 })}</h3>
          <span className="small muted">{fmtShort(range.start)} – {fmtShort(range.end)}</span>
          <span className={phase === 'current' ? 'chip accent' : phase === 'done' ? 'chip ok' : 'chip'}>{t(`weeks.phase.${phase}`)}</span>
          {phase !== 'upcoming' && <span className="small muted">{t('weeks.doneCount', { n: weekLogs.length, of: Math.min(wk.days.length, slots.length) })}</span>}
        </div>
        {editing && (
          <div className="row wrap">
            <button type="button" className="btn sm ghost" disabled={w === 0} onClick={() => setWeekDraft(copyWeek(plan[w - 1], wk))}><Icon name="copy" size={14} />{t('weeks.copyPrev')}</button>
            <button type="button" className="btn sm ghost" disabled={w === plan.length - 1} onClick={() => { setDraft(plan.map((x, i) => (i > w ? copyWeek(wk, x) : x))); toast(t('weeks.copiedForward', { n: plan.length - 1 - w })); }}><Icon name="copy" size={14} />{t('weeks.copyForward')}</button>
          </div>
        )}
      </div>

      {/* Weekly targets */}
      {targetIds.length > 0 && (
        <div style={{ padding: '12px 20px 20px', borderBottom: '1px solid var(--divider)' }}>
          <div className="section-label" style={{ marginBottom: 10 }}>{t('weeks.targets')}</div>
          <div className="targets">
            {targetIds.filter((id) => id !== 'focus').map((id) => (
              <TargetTile key={id} id={id} targets={wk.targets} editing={editing} onChange={setTargets} actual={actualFor(id, state, trainee.id, range, phase, t)} t={t} />
            ))}
          </div>
          {targetIds.includes('focus') && (editing ? (
            <label className="field" style={{ marginTop: 12 }}>{t('weeks.focus')}
              <textarea className="textarea" rows={2} value={wk.targets.focus} placeholder={t('weeks.focusPlaceholder')} onChange={(e) => setTargets({ focus: e.target.value })} />
            </label>
          ) : wk.targets.focus && (
            <div className="stack" style={{ marginTop: 12, gap: 4 }}>
              <span className="xs faint">{t('weeks.focus')}</span>
              <p style={{ lineHeight: 1.5, color: 'var(--ink-2)' }}>{wk.targets.focus}</p>
            </div>
          ))}
        </div>
      )}

      {/* Training days */}
      <div className="row wrap" style={{ padding: '16px 20px 8px', justifyContent: 'space-between' }}>
        <span className="section-label">{t('weeks.days', { n: wk.days.length })}</span>
        {!editing && wk.days.length !== trainee.frequency && <span className="xs muted">{t('weeks.freqNote', { n: trainee.frequency })}</span>}
      </div>
      {wk.days.map((day, i) => {
        const date = dateOf(i);
        const dayLog = weekLogs.find((l) => l.dayName === day.name);
        return (
          <div key={day.id} className="day-block">
            <div className="day-head">
              <div className="row wrap" style={{ gap: 12, minWidth: 0 }}>
                <span className="day-num">{t('weeks.dayN', { n: i + 1 })}</span>
                {editing
                  ? <input className="input compact" aria-label={t('editor.dayName')} style={{ width: 220 }} value={day.name} onChange={(e) => setDayAt(i, { ...day, name: e.target.value })} />
                  : <span style={{ fontWeight: 600 }}>{day.name}</span>}
                <span className="small muted">{date ? `${fmtDow(date)} ${fmtShort(date)}` : t('weeks.unscheduled')}</span>
              </div>
              {editing ? (
                <button type="button" className="btn sm ghost danger" disabled={wk.days.length <= 1} onClick={() => setWeekDraft({ ...wk, days: wk.days.filter((_, j) => j !== i) })}><Icon name="trash" size={14} />{t('editor.deleteDay')}</button>
              ) : <DayStatus t={t} log={dayLog} date={date} today={today} />}
            </div>
            <DayTable day={day} editing={editing} onChange={(d) => setDayAt(i, d)} renderLogged={renderLogged(dayLog)} viewCols={shown(L.programCols)} />
          </div>
        );
      })}
      {editing && (
        <div className="card-foot">
          <button type="button" className="btn sm" style={{ borderStyle: 'dashed' }} onClick={() => setWeekDraft({ ...wk, days: [...wk.days, blankDay(t('editor.dayN', { n: wk.days.length + 1 }), t('editor.newExercise'))] })}>
            <Icon name="plus" size={14} strokeWidth={2} />{t('weeks.addDay')}
          </button>
          <span className="small muted">{t('weeks.editHint')}</span>
        </div>
      )}
      {changing && <ChangeProgramModal trainee={trainee} onClose={() => setChanging(false)} />}
    </section>
  );
}

function DayStatus({ t, log, date, today }: { t: T; log: WorkoutLog | undefined; date: string | null; today: string }) {
  if (log) return <span className="chip ok">{t('weeks.completedOn', { date: fmtShort(log.date), min: log.durationMin, rpe: log.rpe })}</span>;
  if (!date) return null;
  if (date < today) return <span className="chip warn">{t('week.missed')}</span>;
  if (date === today) return <span className="chip accent">{t('week.plannedToday')}</span>;
  return <span className="chip">{t('week.planned')}</span>;
}

function LoggedCell({ t, entry, prevBest, when, faded }: { t: T; entry: Entry; prevBest?: number; when: string; faded?: boolean }) {
  return (
    <div className="stack" style={{ gap: 6, opacity: faded ? 0.6 : 1 }}>
      <SetChips sets={entry.sets} prevBest={faded ? undefined : prevBest} />
      <span className="xs faint">{when}{entry.pain && <span className="warn"> · {t('week.pain')}</span>}</span>
      {entry.note && !faded && <span className="quote">{t('program.traineeSays', { note: entry.note })}</span>}
    </div>
  );
}

// ---------- Targets ----------

const TARGET_FIELD: Record<Exclude<TargetId, 'focus'>, { key: keyof Omit<WeekTargets, 'focus'>; step: number }> = {
  bodyWeight: { key: 'bodyWeightKg', step: 0.1 },
  sleep: { key: 'sleepH', step: 0.5 },
  calories: { key: 'calories', step: 50 },
  protein: { key: 'proteinG', step: 5 },
  steps: { key: 'steps', step: 500 },
};

function fmtTarget(id: TargetId, v: number, t: T): string {
  switch (id) {
    case 'bodyWeight': return fmtKg(v);
    case 'sleep': return t('weeks.unit.sleep', { n: v });
    case 'calories': return t('weeks.unit.kcal', { n: v.toLocaleString('en') });
    case 'protein': return t('weeks.unit.g', { n: v });
    default: return v.toLocaleString('en');
  }
}

function TargetTile({ id, targets, editing, onChange, actual, t }: { id: Exclude<TargetId, 'focus'>; targets: WeekTargets; editing: boolean; onChange: (p: Partial<WeekTargets>) => void; actual: string | null; t: T }) {
  const f = TARGET_FIELD[id];
  const v = targets[f.key];
  return (
    <div className="target">
      <span className="xs faint">{t(`weeks.target.${id}`)}</span>
      {editing ? (
        <input className="input compact mono" type="number" step={f.step} min={0} aria-label={t(`weeks.target.${id}`)} value={v ?? ''} placeholder="—"
          onChange={(e) => onChange({ [f.key]: e.target.value === '' ? null : Number(e.target.value) })} />
      ) : (
        <span className="target-v">{v === null ? '—' : fmtTarget(id, v, t)}</span>
      )}
      <span className="xs muted">{actual ?? (id === 'calories' || id === 'protein' || id === 'steps' ? t(`weeks.per.${id}`) : ' ')}</span>
    </div>
  );
}

/** What the trainee actually did against a target, where the app has the data. */
function actualFor(id: TargetId, state: AppState, traineeId: string, range: { start: string; end: string }, phase: string, t: T): string | null {
  if (phase === 'upcoming') return null;
  const inWeek = <X extends { traineeId: string; date: string }>(xs: X[]) => xs.filter((x) => x.traineeId === traineeId && x.date >= range.start && x.date <= range.end);
  if (id === 'bodyWeight') {
    const w = inWeek(state.weights).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    return w ? t('weeks.actual', { v: fmtKg(w.kg) }) : null;
  }
  if (id === 'sleep') {
    const c = inWeek(state.checkins).at(-1);
    return c ? t('weeks.actual', { v: t('weeks.unit.sleep', { n: c.sleepH }) }) : null;
  }
  return null;
}
