// Logging a session: the coach's prescription for each exercise, with set rows
// pre-filled from last time. Saving creates a workout log the coach sees.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { logWorkout } from '../data/actions';
import { weekIndex } from '../data/plan';
import type { Exercise, LogEntry, ProgramDay } from '../data/types';
import { Icon } from '../components/Icon';
import { useT } from '../i18n';
import { fmtRelativeDay, todayISO } from '../lib/dates';
import { e1rm } from '../lib/util';
import { TaskScreen, useTraineeApp } from './TraineeApp';

interface SetRow { weight: string; reps: string; done: boolean }
interface ExState { sets: SetRow[]; pain: boolean; note: string; noteOpen: boolean }
interface Draft { startedAt: number; ex: Record<string, ExState> }

const draftKey = (tid: string, dayId: string) => `coachhq:draft:${tid}:${dayId}`;

function loadDraft(key: string): Draft | null {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as Draft) : null; } catch { return null; }
}
function saveDraft(key: string, d: Draft | null) {
  try { if (d) localStorage.setItem(key, JSON.stringify(d)); else localStorage.removeItem(key); } catch { /* storage blocked: draft lives in memory */ }
}

const lowReps = (reps: string) => (reps.match(/\d+/)?.[0] ?? '');

export function WorkoutScreen() {
  const t = useT();
  const navigate = useNavigate();
  const { dayId = '' } = useParams();
  const { trainee, logs, base } = useTraineeApp();
  const today = todayISO();
  const p = trainee.program;

  // This week's version of the day, falling back to any week that has it.
  const day: ProgramDay | undefined = useMemo(() => {
    if (!p) return undefined;
    const wk = p.plan[weekIndex(p, today)];
    return wk?.days.find((d) => d.id === dayId) ?? p.plan.flatMap((w) => w.days).find((d) => d.id === dayId);
  }, [p, dayId, today]);

  const lastEntry = (name: string) => {
    for (let i = logs.length - 1; i >= 0; i--) {
      const e = logs[i].entries.find((x) => x.exerciseName === name);
      if (e) return { entry: e, date: logs[i].date };
    }
    return null;
  };

  const fresh = (): Draft => ({
    startedAt: Date.now(),
    ex: Object.fromEntries((day?.exercises ?? []).map((ex) => {
      const last = lastEntry(ex.name)?.entry;
      const sets = Array.from({ length: ex.sets }, (_, i) => {
        const prev = last?.sets[i] ?? last?.sets.at(-1);
        return { weight: prev && prev.weight > 0 ? String(prev.weight) : '', reps: prev ? String(prev.reps) : lowReps(ex.reps), done: false };
      });
      return [ex.id, { sets, pain: false, note: '', noteOpen: false }];
    })),
  });

  const key = draftKey(trainee.id, dayId);
  const [draft, setDraft] = useState<Draft>(() => loadDraft(key) ?? fresh());
  const [finishing, setFinishing] = useState(false);
  const [rpe, setRpe] = useState(8);
  const [minutes, setMinutes] = useState('');
  const [result, setResult] = useState<{ prs: string[]; sets: number } | null>(null);
  useEffect(() => { if (!result) saveDraft(key, draft); }, [key, draft, result]);

  if (!day) {
    return <TaskScreen title={t('ta.workout.title')} onBack={() => navigate(base)}><p className="small muted">{t('ta.workout.notFound')}</p></TaskScreen>;
  }

  const setEx = (id: string, patch: Partial<ExState>) => setDraft((d) => ({ ...d, ex: { ...d.ex, [id]: { ...d.ex[id], ...patch } } }));
  const setRow = (id: string, i: number, patch: Partial<SetRow>) => setDraft((d) => ({ ...d, ex: { ...d.ex, [id]: { ...d.ex[id], sets: d.ex[id].sets.map((r, j) => (j === i ? { ...r, ...patch } : r)) } } }));
  const all = day.exercises.flatMap((ex) => draft.ex[ex.id]?.sets ?? []);
  const doneSets = all.filter((r) => r.done).length;
  const pct = all.length ? (doneSets / all.length) * 100 : 0;

  const openFinish = () => {
    setMinutes(String(Math.max(5, Math.min(240, Math.round((Date.now() - draft.startedAt) / 60000)))));
    setFinishing(true);
  };

  const save = () => {
    const entries: LogEntry[] = day.exercises.flatMap((ex) => {
      const s = draft.ex[ex.id];
      const sets = (s?.sets ?? []).filter((r) => r.done && Number(r.reps) > 0).map((r) => ({ weight: Number(r.weight) || 0, reps: Number(r.reps) }));
      if (!sets.length) return [];
      const entry: LogEntry = { exerciseId: ex.id, exerciseName: ex.name, sets };
      if (s.pain) entry.pain = true;
      if (s.note.trim()) entry.note = s.note.trim();
      return [entry];
    });
    // Records: best set beats the best estimated 1RM from all earlier sessions.
    const prs = entries.filter((e) => {
      const before = Math.max(0, ...logs.flatMap((l) => l.entries.filter((x) => x.exerciseName === e.exerciseName).flatMap((x) => x.sets.map((s) => e1rm(s.weight, s.reps)))));
      const now = Math.max(0, ...e.sets.map((s) => e1rm(s.weight, s.reps)));
      return before > 0 && now > before + 0.01;
    }).map((e) => e.exerciseName);
    logWorkout({ traineeId: trainee.id, date: today, dayName: day.name, durationMin: Number(minutes) || 45, rpe, entries });
    saveDraft(key, null);
    setResult({ prs, sets: entries.reduce((n, e) => n + e.sets.length, 0) });
  };

  if (result) {
    return (
      <TaskScreen title={day.name} onBack={() => navigate(base)} footer={<button type="button" className="btn primary" onClick={() => navigate(base)}>{t('ta.workout.backHome')}</button>}>
        <div className="ta-celebrate">
          <span className="ta-celebrate-icon"><Icon name={result.prs.length ? 'trophy' : 'check'} size={30} /></span>
          <h2 style={{ fontSize: 22, fontWeight: 650 }}>{t('ta.workout.saved')}</h2>
          <p className="small muted" style={{ textAlign: 'center' }}>{t('ta.workout.savedSub', { n: result.sets, min: minutes, rpe })}</p>
        </div>
        {result.prs.length > 0 && (
          <section className="ta-card">
            <div className="ta-card-head"><span className="ta-card-title">{t('ta.workout.newPrs', { n: result.prs.length })}</span></div>
            <div className="ta-card-pad" style={{ gap: 8 }}>
              {result.prs.map((x) => <div key={x} className="row"><span className="chip ok">PR</span><span style={{ fontWeight: 500 }}>{x}</span></div>)}
            </div>
          </section>
        )}
        <p className="xs faint" style={{ textAlign: 'center' }}>{t('ta.workout.coachSees')}</p>
      </TaskScreen>
    );
  }

  return (
    <TaskScreen
      title={day.name}
      onBack={() => navigate(base)}
      right={<span className="mono small muted">{doneSets}/{all.length}</span>}
      footer={finishing ? undefined : <button type="button" className="btn primary" disabled={doneSets === 0} onClick={openFinish}>{t('ta.workout.finish')}</button>}
    >
      <div className="ta-progress"><span style={{ width: `${pct}%` }} /></div>
      {day.exercises.map((ex, i) => (
        <ExerciseCard key={ex.id} n={i + 1} ex={ex} s={draft.ex[ex.id]} last={lastEntry(ex.name)} onEx={(patch) => setEx(ex.id, patch)} onRow={(j, patch) => setRow(ex.id, j, patch)} />
      ))}

      {finishing && (
        <section className="ta-card">
          <div className="ta-card-head"><span className="ta-card-title">{t('ta.workout.howHard')}</span></div>
          <div className="ta-card-pad">
            <div className="ta-scale">
              {[6, 7, 8, 9, 10].map((n) => <button key={n} type="button" className={rpe === n ? 'on' : ''} onClick={() => setRpe(n)}>{n}</button>)}
            </div>
            <span className="xs faint">{t(`ta.rpe.${rpe}` as 'ta.rpe.8')}</span>
            <label className="field">{t('ta.workout.duration')}
              <input className="input mono" type="number" min={5} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </label>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setFinishing(false)}>{t('ta.workout.keepGoing')}</button>
              <button type="button" className="btn primary" style={{ flex: 1 }} onClick={save}>{t('ta.workout.save')}</button>
            </div>
          </div>
        </section>
      )}
    </TaskScreen>
  );
}

function ExerciseCard({ n, ex, s, last, onEx, onRow }: {
  n: number; ex: Exercise; s: ExState | undefined; last: { entry: LogEntry; date: string } | null;
  onEx: (p: Partial<ExState>) => void; onRow: (i: number, p: Partial<SetRow>) => void;
}) {
  const t = useT();
  if (!s) return null;
  const allDone = s.sets.length > 0 && s.sets.every((r) => r.done);
  return (
    <section className={`ta-ex${allDone ? ' done' : ''}`}>
      <div className="ta-ex-head">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="ta-ex-name">{n}. {ex.name}</span>
          {allDone && <span className="chip ok">{t('ta.workout.exDone')}</span>}
        </div>
        <div className="ta-presc">
          <span className="ta-pill" dir="ltr">{ex.sets} × {ex.reps}</span>
          {ex.intensity && <span className="ta-pill">{ex.intensity}</span>}
          {ex.rest && <span className="ta-pill">{t('ta.workout.rest', { v: ex.rest })}</span>}
        </div>
        {ex.cue && <span className="ta-cue">{t('ta.workout.coachCue', { cue: ex.cue })}</span>}
        {last && <span className="ta-last">{t('ta.workout.lastTime', { when: fmtRelativeDay(last.date) })} <span className="mono" dir="ltr">{last.entry.sets.map((x) => (x.weight > 0 ? `${x.weight}×${x.reps}` : `BW×${x.reps}`)).join('  ')}</span></span>}
      </div>
      <div className="ta-sets-head"><span style={{ textAlign: 'center' }}>{t('ta.workout.set')}</span><span style={{ textAlign: 'center' }}>{t('ta.workout.kg')}</span><span style={{ textAlign: 'center' }}>{t('ta.workout.reps')}</span><span /></div>
      {s.sets.map((r, i) => (
        <div key={i} className={`ta-set${r.done ? ' done' : ''}`}>
          <span className="ta-set-n">{i + 1}</span>
          <input inputMode="decimal" aria-label={t('ta.workout.kgFor', { n: i + 1 })} placeholder="BW" value={r.weight} onChange={(e) => onRow(i, { weight: e.target.value })} />
          <input inputMode="numeric" aria-label={t('ta.workout.repsFor', { n: i + 1 })} value={r.reps} onChange={(e) => onRow(i, { reps: e.target.value })} />
          <button type="button" className={`ta-check${r.done ? ' on' : ''}`} aria-pressed={r.done} aria-label={t('ta.workout.markSet', { n: i + 1 })} onClick={() => onRow(i, { done: !r.done })}><Icon name="check" size={18} strokeWidth={2.5} /></button>
        </div>
      ))}
      <div className="ta-ex-foot">
        <button type="button" className="ta-chip-btn" onClick={() => onEx({ sets: [...s.sets, { ...(s.sets.at(-1) ?? { weight: '', reps: lowReps(ex.reps) }), done: false }] })}><Icon name="plus" size={13} strokeWidth={2} />{t('ta.workout.addSet')}</button>
        <button type="button" className={`ta-chip-btn${s.pain ? ' on' : ''}`} aria-pressed={s.pain} onClick={() => onEx({ pain: !s.pain })}>{t('ta.workout.pain')}</button>
        <button type="button" className="ta-chip-btn" onClick={() => onEx({ noteOpen: !s.noteOpen })}><Icon name="edit" size={12} />{t('ta.workout.note')}</button>
      </div>
      {(s.noteOpen || s.note) && (
        <div style={{ padding: '0 16px 14px' }}>
          <textarea className="textarea" rows={2} placeholder={t('ta.workout.notePlaceholder')} value={s.note} onChange={(e) => onEx({ note: e.target.value })} />
        </div>
      )}
    </section>
  );
}
