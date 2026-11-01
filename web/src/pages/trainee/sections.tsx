// Every card that can appear on the trainee Overview or Progress tab. The coach
// picks which ones show, in what order and at what width (see Customize.tsx).

import { useMemo, useState } from 'react';
import { markPaid, setTraineeLayout } from '../../data/actions';
import { formatMoney, liftProgress, sessionsPerWeek, weekPlan, type TraineeStats } from '../../data/selectors';
import { inRange, type Scope } from '../../data/progress';
import { useAppState } from '../../data/store';
import type { SectionId, SectionItem, Trainee, WorkoutLog } from '../../data/types';
import { LineChart } from '../../components/LineChart';
import { Icon } from '../../components/Icon';
import { Bar, Card, Empty, Modal, useToast } from '../../components/ui';
import { useT } from '../../i18n';
import type { StringKey } from '../../i18n/strings';
import { fmtDay, fmtDow, fmtRelativeDay, fmtShort, fmtStamp, todayISO, weekdayName } from '../../lib/dates';
import { e1rm, fmtKg } from '../../lib/util';
import type { TabId } from '../Trainee';
import { CardBuilderModal } from './cardBuilder';
import { GoalsModal } from './modals';
import { CheckinTrendCard, CustomCardView, InBodyCard, InBodyHistoryCard, InBodyTrendCard, PrsCard, RpeCard, SummaryCard, TopLiftsCard, VolumeCard } from './progressCards';

export interface SectionProps {
  trainee: Trainee;
  stats: TraineeStats;
  /** Logs inside the selected period/day (all logs on Overview). */
  logs: WorkoutLog[];
  allLogs: WorkoutLog[];
  scope: Scope;
  goTab: (t: TabId) => void;
}

export function goalPct(g: { start: number; current: number; target: number }) {
  const span = g.target - g.start;
  if (span === 0) return g.current === g.target ? 100 : 0;
  return Math.max(0, Math.min(100, ((g.current - g.start) / span) * 100));
}

/** `prevBest`: best e1RM before this session; sets that beat it are marked as records. */
export function SetChips({ sets, prevBest }: { sets: { weight: number; reps: number }[]; prevBest?: number }) {
  const t = useT();
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {sets.map((s, i) => {
        const pr = prevBest !== undefined && prevBest > 0 && s.weight > 0 && e1rm(s.weight, s.reps) > prevBest + 0.01;
        return <span key={i} dir="ltr" className={`set${pr ? ' pr' : ''}`} title={pr ? t('program.pr') : undefined}>{s.weight > 0 ? `${s.weight}×${s.reps}` : `BW×${s.reps}`}{pr ? ' PR' : ''}</span>;
      })}
    </div>
  );
}

interface GridProps extends SectionProps {
  items: SectionItem[];
  /** Which saved list this grid shows; needed for editing in place. */
  listKey: 'overview' | 'progress';
  editing?: boolean;
}

export function SectionGrid({ items, listKey, editing = false, ...props }: GridProps) {
  const t = useT();
  const { traineeLayout } = useAppState();
  const [drag, setDrag] = useState<SectionId | null>(null);
  const [over, setOver] = useState<SectionId | null>(null);
  const [adding, setAdding] = useState(false);
  const visible = items.filter((x) => x.on);
  const nameOf = (id: SectionId) => traineeLayout.customCards.find((c) => `card:${c.id}` === id)?.title ?? t(`custom.section.${id}` as StringKey);

  const save = (next: SectionItem[]) => setTraineeLayout({ [listKey]: next });
  const patch = (id: SectionId, p: Partial<SectionItem>) => save(items.map((x) => (x.id === id ? { ...x, ...p } : x)));
  /** Move `id` to where `target` is in the full list (hidden cards keep their places). */
  const moveTo = (id: SectionId, target: SectionId) => {
    if (id === target) return;
    const next = items.filter((x) => x.id !== id);
    const at = next.findIndex((x) => x.id === target);
    const from = items.findIndex((x) => x.id === id);
    const to = items.findIndex((x) => x.id === target);
    next.splice(from < to ? at + 1 : at, 0, items[from]);
    save(next);
  };
  const step = (id: SectionId, dir: -1 | 1) => {
    const i = visible.findIndex((x) => x.id === id);
    const target = visible[i + dir];
    if (target) moveTo(id, target.id);
  };
  const show = (id: SectionId) => {
    const lastOn = items.map((x) => x.on).lastIndexOf(true);
    const item = items.find((x) => x.id === id)!;
    const rest = items.filter((x) => x.id !== id);
    const at = lastOn === -1 ? 0 : rest.findIndex((x) => x.id === items[lastOn].id) + 1;
    rest.splice(at, 0, { ...item, on: true });
    save(rest);
  };

  if (visible.length === 0 && !editing) return <div className="card"><Empty>{t('custom.emptyTab')}</Empty></div>;
  return (
    <div className="grid-2">
      {visible.map((x, i) => (
        <div
          key={x.id}
          className={`section-slot${editing ? ' editing' : ''}${over === x.id && drag && drag !== x.id ? ' over' : ''}`}
          style={x.wide ? { gridColumn: '1 / -1' } : undefined}
          draggable={editing}
          onDragStart={editing ? (e) => { setDrag(x.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', x.id); } : undefined}
          onDragOver={editing ? (e) => { e.preventDefault(); setOver(x.id); } : undefined}
          onDrop={editing ? (e) => { e.preventDefault(); if (drag) moveTo(drag, x.id); setDrag(null); setOver(null); } : undefined}
          onDragEnd={editing ? () => { setDrag(null); setOver(null); } : undefined}
        >
          {editing && (
            <div className="slot-tools">
              <span className="cz-grip" aria-hidden="true"><Icon name="grip" size={14} /></span>
              <span className="slot-name ellipsis">{nameOf(x.id)}</span>
              <button type="button" className="btn ghost sm icon" aria-label={t('edit.earlier')} title={t('edit.earlier')} disabled={i === 0} onClick={() => step(x.id, -1)}><Icon name="chevronLeft" size={15} /></button>
              <button type="button" className="btn ghost sm icon" aria-label={t('edit.later')} title={t('edit.later')} disabled={i === visible.length - 1} onClick={() => step(x.id, 1)}><Icon name="chevron" size={15} /></button>
              <button type="button" className={`cz-pill${x.wide ? ' on' : ''}`} aria-pressed={x.wide} onClick={() => patch(x.id, { wide: !x.wide })}>{t('custom.fullWidth')}</button>
              <button type="button" className="btn ghost sm icon" aria-label={t('edit.hide', { name: nameOf(x.id) })} title={t('edit.hideShort')} onClick={() => patch(x.id, { on: false })}><Icon name="x" size={15} /></button>
            </div>
          )}
          <div className="slot-body"><Section id={x.id} {...props} /></div>
        </div>
      ))}
      {editing && (
        <button type="button" className="add-tile" onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} strokeWidth={2} />
          <span style={{ fontWeight: 600 }}>{t('edit.addCard')}</span>
          <span className="small muted">{t('edit.addCardSub')}</span>
        </button>
      )}
      {adding && <AddCardModal items={items} nameOf={nameOf} listKey={listKey} onAdd={(id) => { show(id); setAdding(false); }} onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddCardModal({ items, nameOf, listKey, onAdd, onClose }: { items: SectionItem[]; nameOf: (id: SectionId) => string; listKey: 'overview' | 'progress'; onAdd: (id: SectionId) => void; onClose: () => void }) {
  const t = useT();
  const [building, setBuilding] = useState(false);
  const hidden = items.filter((x) => !x.on);
  if (building) return <CardBuilderModal defaultTab={listKey} onClose={onClose} />;
  return (
    <Modal title={t('edit.addTitle', { tab: t(`trainee.tab.${listKey}`) })} onClose={onClose} wide>
      <button type="button" className="choice on" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onClick={() => setBuilding(true)}>
        <Icon name="plus" size={18} strokeWidth={2} />
        <span className="stack" style={{ gap: 2 }}>
          <span className="t">{t('edit.build')}</span>
          <span className="s">{t('edit.buildSub')}</span>
        </span>
      </button>
      <span className="section-label">{t('edit.available')}</span>
      {hidden.length === 0 ? <Empty>{t('edit.allShown')}</Empty> : (
        <div className="choices">
          {hidden.map((x) => (
            <button key={x.id} type="button" className="choice" onClick={() => onAdd(x.id)}>
              <span className="t">{nameOf(x.id)}</span>
              <span className="s">{x.id.startsWith('card:') ? t('edit.yourCard') : t(`edit.desc.${x.id}` as StringKey)}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

function Section({ id, ...p }: SectionProps & { id: SectionId }) {
  const { traineeLayout } = useAppState();
  if (id.startsWith('card:')) {
    const card = traineeLayout.customCards.find((c) => `card:${c.id}` === id);
    return card ? <CustomCardView card={card} {...p} /> : null;
  }
  switch (id) {
    case 'summary': return <SummaryCard {...p} />;
    case 'prs': return <PrsCard {...p} />;
    case 'topLifts': return <TopLiftsCard {...p} />;
    case 'volume': return <VolumeCard {...p} />;
    case 'rpe': return <RpeCard {...p} />;
    case 'checkinTrend': return <CheckinTrendCard {...p} />;
    case 'inbody': return <InBodyCard {...p} />;
    case 'inbodyTrend': return <InBodyTrendCard {...p} />;
    case 'inbodyHistory': return <InBodyHistoryCard {...p} />;
    case 'week': return <WeekCard {...p} />;
    case 'goals': return <GoalsCard {...p} />;
    case 'checkin': return <CheckinCard {...p} />;
    case 'notes': return <NotesCard {...p} />;
    case 'weight': return <WeightCard {...p} />;
    case 'lifts': return <LiftsCard {...p} />;
    case 'perWeek': return <PerWeekCard {...p} />;
    case 'goalBars': return <GoalBarsCard {...p} />;
    case 'profile': return <ProfileCard {...p} />;
    case 'membership': return <MembershipCard {...p} />;
    case 'lastWorkout': return <LastWorkoutCard {...p} />;
    default: return null;
  }
}

function WeekCard({ trainee, stats }: SectionProps) {
  const state = useAppState();
  const t = useT();
  const week = weekPlan(state, trainee, stats.logs);
  const today = todayISO();
  return (
    <Card title={t('week.title')} action={<span className="small muted">{fmtShort(week[0].date)} – {fmtShort(week[6].date)}</span>}>
      {week.map((d) => {
        const past = d.date < today;
        let label = d.planned?.name ?? t('week.rest');
        let chip = <span className="chip">{t('week.restChip')}</span>;
        if (d.log) {
          label = d.log.dayName;
          chip = <span className="chip ok">{t('week.completed')}{d.log.entries.some((e) => e.pain) ? ` · ${t('week.pain')}` : ''}</span>;
        } else if (d.planned) {
          chip = past ? <span className="chip warn">{t('week.missed')}</span> : d.date === today ? <span className="chip accent">{t('week.plannedToday')}</span> : <span className="chip">{t('week.planned')}</span>;
        }
        return (
          <div key={d.date} className="list-row" style={{ display: 'grid', gridTemplateColumns: '92px minmax(0,1fr) auto', background: d.date === today ? 'var(--subtle)' : undefined }}>
            <span className="small faint">{fmtDow(d.date)} {Number(d.date.slice(8))}</span>
            <span className="stack" style={{ gap: 2 }}>
              <span style={{ fontWeight: 500, color: d.planned || d.log ? 'var(--ink)' : 'var(--faint)' }}>{label}</span>
              {d.isCheckin && <span className="xs muted">{t('week.checkinDay')}{d.checkinDone ? ` · ${t('week.submitted')}` : past ? ` · ${t('week.missedLower')}` : ''}</span>}
            </span>
            {chip}
          </div>
        );
      })}
    </Card>
  );
}

function GoalsCard({ trainee }: SectionProps) {
  const t = useT();
  const [edit, setEdit] = useState(false);
  return (
    <Card title={t('goals.title')} action={<button type="button" className="link-btn" onClick={() => setEdit(true)}>{t('goals.edit')}</button>}>
      <div className="card-body" style={{ gap: 22 }}>
        {trainee.goals.map((g) => (
          <div key={g.id} className="stack" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 500 }}>{g.label}</span>
              <span className="mono small" style={{ color: 'var(--ink-2)' }} dir="ltr">{g.current} / {g.target} {g.unit}</span>
            </div>
            <Bar thick pct={goalPct(g)} />
            <span className="xs faint">{t('goals.startedAt', { v: `${g.start} ${g.unit}`, pct: Math.round(goalPct(g)) })}</span>
          </div>
        ))}
        {trainee.goals.length === 0 && <Empty>{t('goals.none')} <button type="button" className="link-btn" onClick={() => setEdit(true)}>{t('goals.add')}</button></Empty>}
      </div>
      {edit && <GoalsModal trainee={trainee} onClose={() => setEdit(false)} />}
    </Card>
  );
}

function CheckinCard({ stats, goTab }: SectionProps) {
  const t = useT();
  const c = stats.lastCheckin;
  return (
    <Card title={t('checkin.latest')} action={<button type="button" className="link-btn" onClick={() => goTab('checkins')}>{t('checkin.all')}</button>}>
      {c ? (
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
            {[[t('checkin.sleep'), `${c.sleepH} h`], [t('checkin.energy'), `${c.energy} / 5`], [t('checkin.stress'), `${c.stress} / 5`], [t('checkin.soreness'), `${c.soreness} / 5`]].map(([k, v]) => (
              <div key={k} className="stack" style={{ border: '1px solid var(--divider)', borderRadius: 8, padding: '10px 12px' }}>
                <span className="xs faint">{k}</span><span className="mono" style={{ fontWeight: 500 }} dir="ltr">{v}</span>
              </div>
            ))}
          </div>
          <p style={{ lineHeight: 1.55, color: 'var(--ink-2)', fontSize: 13.5 }}>“{c.comment}”</p>
          <span className="xs faint">{t('checkin.submitted', { date: fmtDay(c.date), w: fmtKg(c.weightKg) })}</span>
        </div>
      ) : <Empty>{t('checkin.none')}</Empty>}
    </Card>
  );
}

function NotesCard({ trainee, goTab }: SectionProps) {
  const state = useAppState();
  const t = useT();
  const notes = state.notes.filter((n) => n.traineeId === trainee.id).slice(0, 3);
  return (
    <Card title={t('notes.recent')} action={<button type="button" className="link-btn" onClick={() => goTab('notes')}>{t('notes.all')}</button>}>
      {notes.map((n) => (
        <div key={n.id} className="stack" style={{ padding: '14px 20px', borderBottom: '1px solid var(--row)', gap: 6 }}>
          <div className="row small muted"><span>{fmtStamp(n.at)}</span><span className={n.shared ? 'chip accent' : 'chip'} style={{ fontSize: 11.5, padding: '1px 6px' }}>{n.shared ? t('notes.shared') : t('notes.private')}</span></div>
          <p style={{ lineHeight: 1.5 }}>{n.text}</p>
        </div>
      ))}
      {notes.length === 0 && <Empty>{t('notes.none')} <button type="button" className="link-btn" onClick={() => goTab('notes')}>{t('notes.writeOne')}</button></Empty>}
    </Card>
  );
}

function WeightCard({ trainee, scope }: SectionProps) {
  const state = useAppState();
  const t = useT();
  const weights = useMemo(() => state.weights.filter((w) => w.traineeId === trainee.id && inRange(w.date, scope)).sort((a, b) => a.date.localeCompare(b.date)), [state.weights, trainee.id, scope]);
  const weightGoal = trainee.goals.find((g) => g.unit === 'kg' && /weight|reach|lose|make weight|وزن/i.test(g.label));
  const first = weights[0]?.kg;
  const lastKg = weights.at(-1)?.kg;
  return (
    <Card title={t('trainee.bodyWeight')} action={<span className="small muted">{t('progress.loggedInApp')}</span>}>
      <div className="card-body">
        {lastKg !== undefined && first !== undefined && (
          <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
            <span className="mono" style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em' }}>{fmtKg(lastKg)}</span>
            <span className="mono small" style={{ color: 'var(--ink-2)' }}>{t('trainee.weightSince', { d: `${lastKg - first >= 0 ? '+' : '−'}${Math.abs(lastKg - first).toFixed(1)}`, date: fmtShort(weights[0].date) })}</span>
          </div>
        )}
        <LineChart points={weights.map((w) => ({ x: fmtShort(w.date), y: w.kg }))} target={weightGoal?.target} unit="kg" label={t('progress.weightChart')} />
      </div>
    </Card>
  );
}

function LiftsCard({ logs }: SectionProps) {
  const t = useT();
  const lifts = useMemo(() => liftProgress(logs), [logs]);
  const cols = 'minmax(0, 1.8fr) repeat(3, minmax(0, 1fr))';
  const numHead = { fontFamily: 'inherit', fontSize: 12 };
  return (
    <Card title={t('progress.keyLifts')} action={<span className="small muted">{t('progress.e1rm')}</span>}>
      <div className="dg-head" style={{ gridTemplateColumns: cols, gap: 12 }}>
        <span>{t('progress.lift')}</span><span className="num" style={numHead}>{t('progress.first')}</span><span className="num" style={numHead}>{t('progress.best')}</span><span className="num" style={numHead}>{t('progress.change')}</span>
      </div>
      {lifts.map((l) => (
        <div key={l.exercise} className="dg-row" style={{ gridTemplateColumns: cols, gap: 12 }}>
          <span className="ellipsis" style={{ fontWeight: 500 }}>{l.exercise}</span>
          <span className="num muted">{fmtKg(Math.round(l.first))}</span>
          <span className="num">{fmtKg(Math.round(l.best))}</span>
          <span className="num ok">+{fmtKg(Math.round(l.best - l.first))}</span>
        </div>
      ))}
      {lifts.length === 0 && <Empty>{t('progress.noLifts')}</Empty>}
    </Card>
  );
}

function PerWeekCard({ trainee, logs }: SectionProps) {
  const t = useT();
  const perWeek = sessionsPerWeek(logs);
  return (
    <Card title={t('progress.perWeek')} action={<span className="small muted">{t('progress.target', { n: trainee.frequency })}</span>}>
      <div className="card-body">
        <div role="img" aria-label={t('progress.perWeek')} style={{ display: 'grid', gridTemplateColumns: `repeat(${perWeek.length}, minmax(0, 1fr))`, gap: 10, alignItems: 'end', height: 140, borderBottom: '1px solid var(--border)' }}>
          {perWeek.map((w) => (
            <div key={w.weekStart} className="stack" style={{ alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 6 }}>
              <span className="mono xs faint" dir="ltr">{w.count}/{trainee.frequency}</span>
              <span style={{ width: '100%', maxWidth: 40, height: `${Math.max(2, Math.min(100, (w.count / trainee.frequency) * 100))}%`, borderRadius: '4px 4px 0 0', background: w.count >= trainee.frequency ? 'var(--accent)' : 'var(--bar-soft)' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${perWeek.length}, minmax(0, 1fr))`, gap: 10, marginTop: -6 }}>
          {perWeek.map((w) => <span key={w.weekStart} className="xs faint" style={{ textAlign: 'center' }}>{fmtShort(w.weekStart)}</span>)}
        </div>
      </div>
    </Card>
  );
}

function GoalBarsCard({ trainee }: SectionProps) {
  const t = useT();
  return (
    <Card title={t('progress.goals')}>
      <div className="card-body" style={{ gap: 20 }}>
        {trainee.goals.map((g) => (
          <div key={g.id} className="stack" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><span style={{ fontWeight: 500 }}>{g.label}</span><span className="mono small">{Math.round(goalPct(g))}%</span></div>
            <Bar thick pct={goalPct(g)} />
          </div>
        ))}
        {trainee.goals.length === 0 && <Empty>{t('goals.none')}</Empty>}
      </div>
    </Card>
  );
}

function ProfileCard({ trainee }: SectionProps) {
  const t = useT();
  const rows: [string, string][] = [
    [t('form.email'), trainee.email || '—'],
    [t('form.phone'), trainee.phone || '—'],
    [t('form.coachingType'), t(`mode.${trainee.mode}`)],
    [t('custom.goalType'), t(`goal.${trainee.goalType}`)],
    [t('form.sessionsPerWeek'), String(trainee.frequency)],
    [t('form.checkinDay'), weekdayName(trainee.checkinDay)],
  ];
  return (
    <Card title={t('custom.section.profile')}>
      <div className="card-body">
        <dl className="kv">
          {rows.map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd dir="auto">{v}</dd></div>)}
        </dl>
        <div className="stack" style={{ gap: 6 }}>
          <span className="xs faint">{t('form.injuries')}</span>
          <p style={{ lineHeight: 1.5, color: trainee.injuries ? 'var(--ink-2)' : 'var(--faint)' }}>{trainee.injuries || t('custom.noneRecorded')}</p>
        </div>
      </div>
    </Card>
  );
}

function MembershipCard({ trainee }: SectionProps) {
  const state = useAppState();
  const t = useT();
  const toast = useToast();
  const m = trainee.membership;
  return (
    <Card title={t('custom.section.membership')} action={m.paid ? <span className="chip ok">{t('billing.paid')}</span> : <button type="button" className="btn sm" onClick={() => { markPaid(trainee.id); toast(t('billing.recorded', { name: trainee.firstName })); }}>{t('billing.markPaid')}</button>}>
      <div className="card-body">
        <dl className="kv">
          <dt>{t('billing.plan')}</dt><dd>{t(`mode.plan.${trainee.mode}`)}</dd>
          <dt>{t('billing.price')}</dt><dd className="mono">{formatMoney(state, m.price)}</dd>
          <dt>{t('billing.cycle')}</dt><dd>{t(`cycle.${m.cycle}`)}</dd>
          <dt>{t('billing.renews')}</dt><dd>{fmtDay(m.renewsOn)}</dd>
        </dl>
      </div>
    </Card>
  );
}

function LastWorkoutCard({ logs, goTab }: SectionProps) {
  const t = useT();
  const l = logs.at(-1);
  return (
    <Card title={t('custom.section.lastWorkout')} action={<button type="button" className="link-btn" onClick={() => goTab('workouts')}>{t('custom.allWorkouts')}</button>}>
      {l ? (
        <>
          <div className="row wrap" style={{ padding: '12px 20px', background: 'var(--subtle)', borderBottom: '1px solid var(--divider)', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>{l.dayName}</span>
            <span className="small muted">{fmtRelativeDay(l.date)} · {t('common.minutes', { n: l.durationMin })} · RPE {l.rpe}</span>
          </div>
          {l.entries.map((e) => (
            <div key={e.exerciseId} className="dg-row top" style={{ gridTemplateColumns: 'minmax(140px, 1fr) minmax(0, 1.6fr)' }}>
              <span style={{ fontWeight: 500 }}>{e.exerciseName}{e.pain && <span className="warn small"> · {t('workouts.painLower')}</span>}</span>
              <div className="stack" style={{ gap: 6 }}>
                <SetChips sets={e.sets} />
                {e.note && <span className="quote">“{e.note}”</span>}
              </div>
            </div>
          ))}
        </>
      ) : <Empty>{t('workouts.none')}</Empty>}
    </Card>
  );
}
