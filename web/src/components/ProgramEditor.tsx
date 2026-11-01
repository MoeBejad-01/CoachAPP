import { useEffect, useState, type ReactNode } from 'react';
import { blankDay, blankExercise } from '../data/actions';
import type { Exercise, ProgramColId, ProgramDay } from '../data/types';
import { useT } from '../i18n';
import { Icon } from './Icon';
import { Empty } from './ui';

interface Props {
  days: ProgramDay[];
  editing: boolean;
  onChange?: (days: ProgramDay[]) => void;
  /** Read-only mode: extra column showing what the trainee logged. */
  renderLogged?: (ex: Exercise, day: ProgramDay) => ReactNode;
  dayMeta?: (day: ProgramDay) => ReactNode;
  /** Read-only columns to show, in order. */
  viewCols?: ProgramColId[];
}

/** One day at a time, with a day switcher. Used for templates. */
export function ProgramEditor({ days, editing, onChange, renderLogged, dayMeta, viewCols }: Props) {
  const t = useT();
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (idx > days.length - 1) setIdx(Math.max(0, days.length - 1));
  }, [days.length, idx]);
  const day = days[Math.min(idx, days.length - 1)];
  const setDay = (next: ProgramDay) => onChange?.(days.map((d, i) => (i === idx ? next : d)));

  return (
    <>
      <div className="row wrap" style={{ padding: '12px 20px', borderBottom: '1px solid var(--divider)', justifyContent: 'space-between' }}>
        <div className="seg" role="tablist" aria-label={t('editor.days')}>
          {days.map((d, i) => (
            <button key={d.id} type="button" role="tab" aria-selected={i === idx} className={i === idx ? 'on' : ''} onClick={() => setIdx(i)}>{d.name}</button>
          ))}
        </div>
        {editing && (
          <button type="button" className="btn sm" onClick={() => { onChange?.([...days, blankDay(t('editor.dayN', { n: days.length + 1 }), t('editor.newExercise'))]); setIdx(days.length); }}>
            <Icon name="plus" size={14} strokeWidth={2} />{t('editor.addDay')}
          </button>
        )}
      </div>

      {!day && <Empty>{t('editor.noDays')}</Empty>}

      {day && editing && (
        <div className="row wrap" style={{ padding: '12px 20px', borderBottom: '1px solid var(--divider)', background: 'var(--subtle)' }}>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {t('editor.dayName')}
            <input className="input compact" style={{ width: 220 }} value={day.name} onChange={(e) => setDay({ ...day, name: e.target.value })} />
          </label>
          <button type="button" className="btn sm danger" style={{ marginInlineStart: 'auto' }} disabled={days.length <= 1} onClick={() => onChange?.(days.filter((_, i) => i !== idx))}>
            <Icon name="trash" size={14} />{t('editor.deleteDay')}
          </button>
        </div>
      )}

      {day && !editing && dayMeta && (
        <div className="row wrap" style={{ padding: '12px 20px', justifyContent: 'space-between', borderBottom: '1px solid var(--divider)', background: 'var(--subtle)' }}>
          {dayMeta(day)}
        </div>
      )}

      {day && <DayTable day={day} editing={editing} onChange={setDay} renderLogged={renderLogged} viewCols={viewCols} />}
    </>
  );
}

const EDIT_COLS = '28px minmax(220px, 2.4fr) 64px 90px 110px 74px 108px';
const VIEW_COL: Record<Exclude<ProgramColId, 'cue'>, string> = { prescribed: '110px', intensity: '110px', rest: '90px', logged: 'minmax(240px, 2.2fr)' };

interface DayTableProps {
  day: ProgramDay;
  editing: boolean;
  onChange?: (day: ProgramDay) => void;
  renderLogged?: (ex: Exercise, day: ProgramDay) => ReactNode;
  viewCols?: ProgramColId[];
}

/** The exercise table for a single day, read-only or editable. */
export function DayTable({ day, editing, onChange, renderLogged, viewCols }: DayTableProps) {
  const t = useT();
  const view = viewCols ?? ['cue', 'prescribed', 'intensity', renderLogged ? 'logged' : 'rest'];
  const viewExtra = view.filter((c): c is Exclude<ProgramColId, 'cue'> => c !== 'cue' && (c !== 'logged' || !!renderLogged));
  const VIEW_COLS = ['32px', 'minmax(220px, 2fr)', ...viewExtra.map((c) => VIEW_COL[c])].join(' ');
  const viewHead: Record<Exclude<ProgramColId, 'cue'>, string> = { prescribed: t('editor.colPrescribed'), intensity: t('editor.colIntensity'), rest: t('editor.colRest'), logged: t('editor.colLogged') };

  const setDay = (next: ProgramDay) => onChange?.(next);
  const setEx = (i: number, patch: Partial<Exercise>) => setDay({ ...day, exercises: day.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  const move = (i: number, dir: -1 | 1) => {
    const list = [...day.exercises];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setDay({ ...day, exercises: list });
  };

  return (
    <>
      <div className="table-scroll">
        <div style={{ minWidth: editing ? 760 : 300 + viewExtra.reduce((n, c) => n + (c === 'logged' ? 260 : 110), 0) }}>
          <div className="dg-head" style={{ gridTemplateColumns: editing ? EDIT_COLS : VIEW_COLS, gap: editing ? 10 : 16, background: 'transparent' }}>
            {editing
              ? <><span>#</span><span>{t('editor.colExerciseCue')}</span><span>{t('editor.colSets')}</span><span>{t('editor.colReps')}</span><span>{t('editor.colIntensity')}</span><span>{t('editor.colRest')}</span><span /></>
              : <><span>#</span><span>{t('editor.colExercise')}</span>{viewExtra.map((c) => <span key={c}>{viewHead[c]}</span>)}</>}
          </div>
          {day.exercises.map((ex, i) => editing ? (
            <div key={ex.id} className="dg-row top" style={{ gridTemplateColumns: EDIT_COLS, gap: 10, padding: '10px 20px' }}>
              <span className="mono xs faint" style={{ paddingTop: 10 }}>{String(i + 1).padStart(2, '0')}</span>
              <div className="stack" style={{ gap: 6 }}>
                <input className="input compact" aria-label={t('editor.colExercise')} value={ex.name} onChange={(e) => setEx(i, { name: e.target.value })} />
                <input className="input compact" aria-label={t('editor.cue')} placeholder={t('editor.cuePlaceholder')} style={{ fontSize: 13 }} value={ex.cue} onChange={(e) => setEx(i, { cue: e.target.value })} />
              </div>
              <input className="input compact mono" aria-label={t('editor.colSets')} type="number" min={1} value={ex.sets} onChange={(e) => setEx(i, { sets: Math.max(1, Number(e.target.value) || 1) })} />
              <input className="input compact mono" aria-label={t('editor.colReps')} value={ex.reps} onChange={(e) => setEx(i, { reps: e.target.value })} />
              <input className="input compact mono" aria-label={t('editor.colIntensity')} value={ex.intensity} onChange={(e) => setEx(i, { intensity: e.target.value })} />
              <input className="input compact mono" aria-label={t('editor.colRest')} value={ex.rest} onChange={(e) => setEx(i, { rest: e.target.value })} />
              <div className="row" style={{ gap: 2 }}>
                <button type="button" className="btn ghost sm icon" aria-label={t('editor.moveUp')} disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" size={15} /></button>
                <button type="button" className="btn ghost sm icon" aria-label={t('editor.moveDown')} disabled={i === day.exercises.length - 1} onClick={() => move(i, 1)}><Icon name="down" size={15} /></button>
                <button type="button" className="btn ghost sm icon" aria-label={t('editor.remove')} onClick={() => setDay({ ...day, exercises: day.exercises.filter((_, j) => j !== i) })}><Icon name="x" size={15} /></button>
              </div>
            </div>
          ) : (
            <div key={ex.id} className="dg-row top" style={{ gridTemplateColumns: VIEW_COLS, padding: '14px 20px' }}>
              <span className="mono xs faint" style={{ paddingTop: 1 }}>{String(i + 1).padStart(2, '0')}</span>
              <div className="stack" style={{ gap: 3 }}>
                <span style={{ fontWeight: 500 }}>{ex.name}</span>
                {ex.cue && view.includes('cue') && <span className="small muted">{ex.cue}</span>}
              </div>
              {viewExtra.map((c) => c === 'prescribed' ? <span key={c} className="mono" style={{ fontSize: 13 }} dir="ltr">{ex.sets} × {ex.reps}</span>
                : c === 'intensity' ? <span key={c} className="mono" style={{ fontSize: 13 }}>{ex.intensity}</span>
                : c === 'rest' ? <span key={c} className="mono" style={{ fontSize: 13 }}>{ex.rest}</span>
                : <div key={c}>{renderLogged?.(ex, day)}</div>)}
            </div>
          ))}
          {day.exercises.length === 0 && <Empty>{t('editor.noExercises')}</Empty>}
        </div>
      </div>

      {editing && (
        <div className="card-foot" style={{ borderTop: 0 }}>
          <button type="button" className="btn sm" style={{ borderStyle: 'dashed' }} onClick={() => setDay({ ...day, exercises: [...day.exercises, blankExercise(t('editor.newExercise'))] })}>
            <Icon name="plus" size={14} strokeWidth={2} />{t('editor.addExercise')}
          </button>
          <span className="small muted">{t('editor.summary', { n: day.exercises.length, s: day.exercises.reduce((n, e) => n + e.sets, 0) })}</span>
        </div>
      )}
    </>
  );
}
