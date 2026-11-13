import { Fragment, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addNote, deleteNote, toggleNoteShared } from '../../data/actions';
import { shown } from '../../data/layout';
import { scopeLogs, weekOptions, type Scope } from '../../data/progress';
import { useAppState } from '../../data/store';
import type { CardioDetail, CheckIn, CheckinColId, Trainee, WorkoutColId, WorkoutLog } from '../../data/types';
import { Icon } from '../../components/Icon';
import { Card, Empty, useToast } from '../../components/ui';
import { useT } from '../../i18n';
import { addDays, fmtDay, fmtShort, fmtStamp, todayISO, weekdayName } from '../../lib/dates';
import { fmtHours, fmtKg } from '../../lib/util';
import { SectionGrid, SetChips, type SectionProps } from './sections';

// ---------- Overview & Progress ----------

/** Toggle for arranging cards directly on the page. */
function EditPageButton({ editing, onToggle }: { editing: boolean; onToggle: () => void }) {
  const t = useT();
  return (
    <button type="button" className={`btn sm${editing ? ' dark' : ''}`} aria-pressed={editing} onClick={onToggle}>
      <Icon name={editing ? 'check' : 'sliders'} size={15} />{editing ? t('edit.done') : t('edit.editPage')}
    </button>
  );
}

function EditHint() {
  const t = useT();
  return <div className="edit-hint small"><Icon name="sliders" size={15} />{t('edit.hint')}</div>;
}

export function OverviewTab(props: SectionProps) {
  const { traineeLayout } = useAppState();
  const [editing, setEditing] = useState(false);
  return (
    <>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: -8 }}>
        <EditPageButton editing={editing} onToggle={() => setEditing((v) => !v)} />
      </div>
      {editing && <EditHint />}
      <SectionGrid items={traineeLayout.overview} listKey="overview" editing={editing} {...props} />
    </>
  );
}

export function ProgressTab(props: Omit<SectionProps, 'allLogs' | 'scope'>) {
  const { traineeLayout } = useAppState();
  const t = useT();
  const [params, setParams] = useSearchParams();
  const today = todayISO();
  const weeks = useMemo(() => weekOptions(props.trainee, props.logs, today), [props.trainee, props.logs, today]);
  const dayNames = useMemo(() => [...new Set(props.logs.map((l) => l.dayName))], [props.logs]);
  const wParam = params.get('week');
  const week = wParam === null ? null : weeks.find((w) => String(w.index + 1) === wParam) ?? null;
  const day = dayNames.find((d) => d === params.get('day')) ?? null;
  const scope = useMemo<Scope>(() => ({ start: week?.start ?? null, end: week?.end ?? null, day }), [week, day]);
  const logs = useMemo(() => scopeLogs(props.logs, scope), [props.logs, scope]);
  const setFilter = (k: 'week' | 'day', v: string | null) => {
    const next = new URLSearchParams(params);
    if (v === null) next.delete(k); else next.set(k, v);
    setParams(next, { replace: true });
  };
  const first = props.logs[0]?.date ?? props.trainee.joinedAt;
  const [editing, setEditing] = useState(false);
  return (
    <>
      <section className="card filter-bar" aria-label={t('perf.filters')}>
        <div className="row wrap" style={{ gap: 14 }}>
          <div className="seg" role="tablist" aria-label={t('perf.period')}>
            <button type="button" role="tab" aria-selected={!week} className={!week ? 'on' : ''} onClick={() => setFilter('week', null)}>{t('perf.allTime')}</button>
            <button type="button" role="tab" aria-selected={!!week} className={week ? 'on' : ''} disabled={!weeks.length} onClick={() => setFilter('week', String((weeks.at(-1)?.index ?? 0) + 1))}>{t('perf.byWeek')}</button>
          </div>
          {week && (
            <label className="row small" style={{ gap: 8 }}>
              <span className="muted">{t('perf.week')}</span>
              <select className="select compact-select" value={week.index + 1} onChange={(e) => setFilter('week', e.target.value)}>
                {weeks.map((w) => <option key={w.index} value={w.index + 1}>{t('weeks.week', { n: w.index + 1 })} · {fmtShort(w.start)} – {fmtShort(w.end)}</option>)}
              </select>
            </label>
          )}
          <label className="row small" style={{ gap: 8 }}>
            <span className="muted">{t('perf.day')}</span>
            <select className="select compact-select" value={day ?? ''} onChange={(e) => setFilter('day', e.target.value || null)}>
              <option value="">{t('perf.allDays')}</option>
              {dayNames.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>
        <div className="row wrap" style={{ gap: 12 }}>
          <span className="small muted">
            {week ? `${fmtShort(week.start)} – ${fmtShort(week.end)}` : t('perf.since', { date: fmtDay(first) })}
            {' · '}{t('workouts.count', { n: logs.length })}
            {day && <> · <span className="chip" style={{ fontSize: 11.5 }}>{day}</span></>}
          </span>
          <EditPageButton editing={editing} onToggle={() => setEditing((v) => !v)} />
        </div>
      </section>
      {editing && <EditHint />}
      <SectionGrid items={traineeLayout.progress} listKey="progress" editing={editing} {...props} logs={logs} allLogs={props.logs} scope={scope} />
    </>
  );
}

export { ProgramTab } from './ProgramWeeks';

// ---------- Workouts ----------

const WORKOUT_COL: Record<WorkoutColId, string> = { date: '140px', session: 'minmax(160px, 1fr)', duration: '90px', rpe: '60px', volume: '110px', exercises: '90px', sets: '70px' };

export function WorkoutsTab({ logs }: { logs: WorkoutLog[] }) {
  const t = useT();
  const { traineeLayout: L } = useAppState();
  const [open, setOpen] = useState<Set<string>>(() => new Set(L.workoutExpand === 'all' ? logs.map((l) => l.id) : L.workoutExpand === 'latest' && logs.length ? [logs.at(-1)!.id] : []));
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const list = [...logs].reverse();
  const ids = shown(L.workoutCols);
  const cols = [...ids.map((c) => WORKOUT_COL[c]), '24px'].join(' ');
  const head: Record<WorkoutColId, string> = { date: t('workouts.date'), session: t('workouts.session'), duration: t('workouts.duration'), rpe: 'RPE', volume: t('workouts.volume'), exercises: t('workouts.exercises'), sets: t('custom.col.sets') };
  const cell = (c: WorkoutColId, l: WorkoutLog) => {
    switch (c) {
      case 'date': return <span style={{ fontWeight: 500 }}>{fmtDay(l.date)}</span>;
      case 'session': return <span className="row">{l.dayName}{l.entries.some((e) => e.pain) && <span className="chip warn">{t('workouts.pain')}</span>}{l.entries.some((e) => e.note) && <span className="chip">{t('workouts.notes')}</span>}</span>;
      case 'duration': return <span className="mono small">{t('common.minutes', { n: l.durationMin })}</span>;
      case 'rpe': return <span className="mono small">{l.rpe}</span>;
      case 'volume': return <span className="mono small">{fmtKg(Math.round(l.entries.reduce((n, e) => n + e.sets.reduce((m, s) => m + s.weight * s.reps, 0), 0)))}</span>;
      case 'exercises': return <span className="mono small">{l.entries.length}</span>;
      case 'sets': return <span className="mono small">{l.entries.reduce((n, e) => n + e.sets.length, 0)}</span>;
    }
  };
  return (
    <Card title={t('workouts.title')} action={<span className="small muted">{t('workouts.count', { n: logs.length })}</span>}>
      <div className="table-scroll">
        <div style={{ minWidth: Math.max(520, ids.length * 110 + 120) }}>
          <div className="dg-head" style={{ gridTemplateColumns: cols }}>
            {ids.map((c) => <span key={c}>{head[c]}</span>)}<span />
          </div>
          {list.map((l) => {
            const isOpen = open.has(l.id);
            return (
              <Fragment key={l.id}>
                <div className="dg-row click" style={{ gridTemplateColumns: cols }} onClick={() => toggle(l.id)} aria-expanded={isOpen}>
                  {ids.map((c) => <Fragment key={c}>{cell(c, l)}</Fragment>)}
                  <span className="faint"><Icon name={isOpen ? 'up' : 'down'} size={16} /></span>
                </div>
                {isOpen && (
                  <div style={{ background: 'var(--subtle)', borderBottom: '1px solid var(--row)', paddingBlock: '6px 14px', paddingInline: '40px 20px' }}>
                    {l.entries.map((e) => (
                      <div key={e.exerciseId} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(260px, 2fr)', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
                        <span style={{ fontWeight: 500 }}>{e.exerciseName}{e.pain && <span className="warn small"> · {t('workouts.painLower')}</span>}</span>
                        <div className="stack" style={{ gap: 6 }}>
                          <SetChips sets={e.sets} />
                          {e.cardio && <span className="chip" style={{ alignSelf: 'flex-start' }}>{cardioLine(t, e.cardio)}</span>}
                          {e.note && <span className="quote">“{e.note}”</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Fragment>
            );
          })}
          {list.length === 0 && <Empty>{t('workouts.none')}</Empty>}
        </div>
      </div>
    </Card>
  );
}

// ---------- Notes ----------

export function NotesTab({ trainee }: { trainee: Trainee }) {
  const state = useAppState();
  const t = useT();
  const toast = useToast();
  const [text, setText] = useState('');
  const [shared, setShared] = useState(state.traineeLayout.notesDefaultShared);
  const notes = state.notes.filter((n) => n.traineeId === trainee.id);
  const save = () => {
    if (!text.trim()) return;
    addNote(trainee.id, text.trim(), shared);
    setText('');
    toast(shared ? t('notes.sharedToast', { name: trainee.firstName }) : t('notes.privateToast'));
  };
  return (
    <Card title={t('notes.title')} action={<span className="small muted">{t('notes.sharedHint', { name: trainee.firstName })}</span>}>
      <div className="card-body" style={{ background: 'var(--subtle)', borderBottom: '1px solid var(--divider)' }}>
        <label className="field">{t('notes.add')}
          <textarea className="textarea" rows={3} value={text} placeholder={t('notes.placeholder')} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }} />
        </label>
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <label className="check"><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />{t('notes.visibleTo', { name: trainee.firstName })}</label>
          <button type="button" className="btn sm dark" disabled={!text.trim()} onClick={save}>{t('notes.save')}</button>
        </div>
      </div>
      {notes.map((n) => (
        <div key={n.id} style={{ display: 'grid', gridTemplateColumns: '130px minmax(0, 1fr) auto', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--row)' }}>
          <div className="stack" style={{ gap: 6, alignItems: 'flex-start' }}>
            <span className="small muted">{fmtStamp(n.at)}</span>
            <span className={n.shared ? 'chip accent' : 'chip'}>{n.shared ? t('notes.shared') : t('notes.private')}</span>
          </div>
          <p style={{ lineHeight: 1.55 }}>{n.text}</p>
          <div className="row" style={{ gap: 4, alignItems: 'flex-start' }}>
            <button type="button" className="btn ghost sm" onClick={() => toggleNoteShared(n.id)}>{n.shared ? t('notes.makePrivate') : t('notes.share')}</button>
            <button type="button" className="btn ghost sm icon" aria-label={t('notes.delete')} onClick={() => { deleteNote(n.id); toast(t('notes.deleted')); }}><Icon name="trash" size={15} /></button>
          </div>
        </div>
      ))}
      {notes.length === 0 && <Empty>{t('notes.none')}</Empty>}
    </Card>
  );
}

// ---------- Check-ins ----------

const CHECKIN_COL: Record<CheckinColId, string> = { date: '130px', weight: '90px', sleep: '70px', energy: '70px', stress: '70px', soreness: '80px', comment: 'minmax(260px, 1fr)' };

/** "32 min · 5.2 km · 145 bpm" */
function cardioLine(t: ReturnType<typeof useT>, c: CardioDetail): string {
  return [t('common.minutes', { n: c.minutes }), c.distanceKm ? `${c.distanceKm} km` : '', c.avgHr ? `${c.avgHr} bpm` : '', c.kcal ? `${c.kcal} kcal` : '']
    .filter(Boolean)
    .join(' · ');
}

/** What the trainee logs day to day in the mobile app. */
function DailyLogCard({ trainee }: { trainee: Trainee }) {
  const state = useAppState();
  const t = useT();
  const from = addDays(todayISO(), -13);
  const list = (state.dailyLogs ?? []).filter((d) => d.traineeId === trainee.id && d.date >= from).sort((a, b) => b.date.localeCompare(a.date));
  const cols = '92px 70px 80px 80px 70px 80px minmax(200px, 1fr)';
  const dash = <span className="faint">–</span>;
  return (
    <Card title={t('daily.title')} action={<span className="small muted">{t('daily.sub')}</span>}>
      <div className="table-scroll">
        <div style={{ minWidth: 760 }}>
          <div className="dg-head" style={{ gridTemplateColumns: cols }}>
            <span>{t('workouts.date')}</span><span>{t('daily.sleep')}</span><span>{t('daily.water')}</span><span>{t('daily.steps')}</span>
            <span>{t('daily.stress')}</span><span>{t('daily.soreness')}</span><span>{t('daily.food')}</span>
          </div>
          {list.map((d) => (
            <div key={d.date} className="dg-row top" style={{ gridTemplateColumns: cols }}>
              <span style={{ fontWeight: 500 }}>{fmtDay(d.date)}</span>
              <span className="mono small">{d.sleepH != null ? fmtHours(d.sleepH) : dash}</span>
              <span className="mono small">{d.waterMl != null ? `${(d.waterMl / 1000).toFixed(1)} L` : dash}</span>
              <span className="mono small">{d.steps != null ? d.steps.toLocaleString() : dash}</span>
              <span className="mono small" dir="ltr">{d.stress != null ? `${d.stress}/5` : dash}</span>
              <span className="mono small" dir="ltr">{d.soreness != null ? `${d.soreness}/5` : dash}{d.sorenessAreas?.length ? <span className="xs muted"> · {d.sorenessAreas.join(', ')}</span> : null}</span>
              <span style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>
                {d.meals.length ? d.meals.map((m) => [m.text, m.kcal ? `${m.kcal} kcal` : '', m.proteinG ? `${m.proteinG} g` : ''].filter(Boolean).join(' · ')).join(' / ') : dash}
              </span>
            </div>
          ))}
          {list.length === 0 && <Empty>{t('daily.none')}</Empty>}
        </div>
      </div>
    </Card>
  );
}

function CardioCard({ trainee }: { trainee: Trainee }) {
  const state = useAppState();
  const t = useT();
  const list = (state.cardio ?? []).filter((c) => c.traineeId === trainee.id).sort((a, b) => b.date.localeCompare(a.date));
  const weekFrom = addDays(todayISO(), -6);
  const minutes = list.filter((c) => c.date >= weekFrom).reduce((n, c) => n + c.minutes, 0);
  const cols = '92px 120px minmax(160px, 1fr) 90px minmax(160px, 1fr)';
  return (
    <Card title={t('cardio.title')} action={<span className="small muted">{t('cardio.sub', { n: minutes })}</span>}>
      <div className="table-scroll">
        <div style={{ minWidth: 640 }}>
          {list.slice(0, 12).map((c) => (
            <div key={c.id} className="dg-row top" style={{ gridTemplateColumns: cols }}>
              <span style={{ fontWeight: 500 }}>{fmtDay(c.date)}</span>
              <span>{t(`cardio.act.${c.activity}` as 'cardio.act.run')}</span>
              <span className="mono small">{cardioLine(t, c)}</span>
              <span className="chip">{t(`cardio.effort.${c.effort}` as 'cardio.effort.1')}</span>
              <span className="quote">{c.note ? `“${c.note}”` : ''}</span>
            </div>
          ))}
          {list.length === 0 && <Empty>{t('cardio.none')}</Empty>}
        </div>
      </div>
    </Card>
  );
}

export function CheckinsTab({ trainee }: { trainee: Trainee }) {
  return (
    <div className="stack" style={{ gap: 16 }}>
      <DailyLogCard trainee={trainee} />
      <CardioCard trainee={trainee} />
      <WeeklyCheckins trainee={trainee} />
    </div>
  );
}

function WeeklyCheckins({ trainee }: { trainee: Trainee }) {
  const state = useAppState();
  const t = useT();
  const list = state.checkins.filter((c) => c.traineeId === trainee.id).sort((a, b) => b.date.localeCompare(a.date));
  const ids = shown(state.traineeLayout.checkinCols);
  const cols = ids.map((c) => CHECKIN_COL[c]).join(' ');
  const head: Record<CheckinColId, string> = { date: t('workouts.date'), weight: t('checkin.weight'), sleep: t('checkin.sleep'), energy: t('checkin.energy'), stress: t('checkin.stress'), soreness: t('checkin.soreness'), comment: t('checkin.comment') };
  const cell = (k: CheckinColId, c: CheckIn) => {
    switch (k) {
      case 'date': return <span style={{ fontWeight: 500 }}>{fmtDay(c.date)}</span>;
      case 'weight': return <span className="mono small">{fmtKg(c.weightKg)}</span>;
      case 'sleep': return <span className="mono small">{fmtHours(c.sleepH)}</span>;
      case 'energy': return <span className="mono small" dir="ltr">{c.energy}/5</span>;
      case 'stress': return <span className="mono small" dir="ltr">{c.stress}/5</span>;
      case 'soreness': return <span className="mono small" dir="ltr">{c.soreness}/5</span>;
      case 'comment': return <span style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{c.comment}</span>;
    }
  };
  return (
    <Card title={t('checkin.weekly')} action={<span className="small muted">{t('checkin.every', { day: weekdayName(trainee.checkinDay) })}</span>}>
      <div className="table-scroll">
        <div style={{ minWidth: ids.includes('comment') ? 400 + ids.length * 70 : ids.length * 100 }}>
          <div className="dg-head" style={{ gridTemplateColumns: cols }}>
            {ids.map((k) => <span key={k}>{head[k]}</span>)}
          </div>
          {list.map((c) => (
            <div key={c.id} className="dg-row top" style={{ gridTemplateColumns: cols }}>
              {ids.map((k) => <Fragment key={k}>{cell(k, c)}</Fragment>)}
            </div>
          ))}
          {list.length === 0 && <Empty>{t('checkin.none')}</Empty>}
        </div>
      </div>
    </Card>
  );
}
