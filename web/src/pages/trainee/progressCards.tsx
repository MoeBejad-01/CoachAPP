// Progress cards: training performance for the selected period, InBody
// tracking, and the cards a coach builds themselves.

import { useMemo, useState } from 'react';
import { addMetricEntry, deleteInBodyScan, deleteMetricEntry } from '../../data/actions';
import { prEvents, inRange, seriesFor, summarize, topLifts, volumeByWeek, type Scope } from '../../data/progress';
import { reportUrl } from '../../data/remote';
import { useAppState } from '../../data/store';
import { supabase } from '../../lib/supabase';
import type { CardSource, CustomCard, InBodyField, InBodyScan, Trainee, WorkoutLog } from '../../data/types';
import { BarChart, Sparkline } from '../../components/BarChart';
import { Icon } from '../../components/Icon';
import { LineChart } from '../../components/LineChart';
import { Card, Empty, useToast } from '../../components/ui';
import { useT, type T } from '../../i18n';
import type { StringKey } from '../../i18n/strings';
import { fmtAgo, fmtDay, fmtShort, todayISO } from '../../lib/dates';
import { fmtKg } from '../../lib/util';
import { CardBuilderModal } from './cardBuilder';
import { RequestInBodyModal, UploadInBodyModal } from './inbody';

export interface ProgressProps {
  trainee: Trainee;
  logs: WorkoutLog[];
  allLogs: WorkoutLog[];
  scope: Scope;
}

const kg = (n: number) => fmtKg(Math.round(n));
const tonnes = (n: number, t: T) => (n >= 10000 ? t('perf.tonnes', { n: (n / 1000).toFixed(1) }) : kg(n));

function usePrs(allLogs: WorkoutLog[], scope: Scope) {
  return useMemo(() => prEvents(allLogs).filter((p) => inRange(p.date, scope) && (!scope.day || p.dayName === scope.day)), [allLogs, scope]);
}

// ---------- Training performance ----------

export function SummaryCard({ trainee, logs, allLogs, scope }: ProgressProps) {
  const t = useT();
  const prs = usePrs(allLogs, scope);
  const s = summarize(logs, prs, trainee, scope, todayISO());
  const tiles: [string, string, string][] = [
    [t('perf.sessions'), String(s.sessions), s.planned !== null ? t('perf.ofPlanned', { n: s.planned }) : t('perf.logged')],
    [t('perf.prs'), String(s.prs), s.prs ? t('perf.latestPr', { ex: prs.at(-1)!.exercise }) : t('perf.noPrsShort')],
    [t('perf.volume'), tonnes(s.volume, t), t('perf.sets', { n: s.sets })],
    [t('perf.avgRpe'), s.avgRpe === null ? '—' : s.avgRpe.toFixed(1), t('perf.effort')],
    [t('perf.avgDuration'), s.avgDuration === null ? '—' : t('common.minutes', { n: Math.round(s.avgDuration) }), t('perf.perSession')],
  ];
  return (
    <section className="card" aria-label={t('custom.section.summary')}>
      <div className="summary-grid">
        {tiles.map(([k, v, sub]) => (
          <div key={k} className="stack" style={{ padding: '16px 20px', gap: 4 }}>
            <span className="xs faint">{k}</span>
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{v}</span>
            <span className="xs muted ellipsis">{sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PrsCard({ allLogs, scope }: ProgressProps) {
  const t = useT();
  const prs = usePrs(allLogs, scope);
  const list = [...prs].reverse();
  const cols = '90px minmax(140px, 1.4fr) 110px 110px';
  return (
    <Card title={t('perf.prTitle')} action={<span className="chip accent mono">{prs.length}</span>}>
      <div className="dg-head" style={{ gridTemplateColumns: cols, gap: 12 }}>
        <span>{t('workouts.date')}</span><span>{t('progress.lift')}</span><span>{t('perf.bestSet')}</span><span className="num" style={{ fontFamily: 'inherit', fontSize: 12 }}>{t('perf.e1rmGain')}</span>
      </div>
      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
        {list.map((p, i) => (
          <div key={i} className="dg-row" style={{ gridTemplateColumns: cols, gap: 12 }}>
            <span className="small muted">{fmtShort(p.date)}</span>
            <span className="stack" style={{ gap: 1, minWidth: 0 }}><span className="ellipsis" style={{ fontWeight: 500 }}>{p.exercise}</span><span className="xs faint ellipsis">{p.dayName}</span></span>
            <span className="set pr" dir="ltr" style={{ justifySelf: 'start' }}>{p.set.weight}×{p.set.reps}</span>
            <span className="num ok">+{(p.e1rm - p.prev).toFixed(1)}</span>
          </div>
        ))}
        {list.length === 0 && <Empty>{t('perf.noPrs')}</Empty>}
      </div>
    </Card>
  );
}

export function TopLiftsCard({ logs, allLogs, scope }: ProgressProps) {
  const t = useT();
  const prs = usePrs(allLogs, scope);
  const rows = useMemo(() => topLifts(logs, prs), [logs, prs]);
  const cols = 'minmax(150px, 1.6fr) 90px 100px 90px 100px 60px';
  const nh = { fontFamily: 'inherit', fontSize: 12 };
  return (
    <Card title={t('perf.topTitle')} action={<span className="small muted">{t('progress.e1rm')}</span>}>
      <div className="table-scroll">
        <div style={{ minWidth: 640 }}>
          <div className="dg-head" style={{ gridTemplateColumns: cols, gap: 12 }}>
            <span>{t('progress.lift')}</span><span>{t('perf.bestSet')}</span><span className="num" style={nh}>{t('progress.best')}</span><span className="num" style={nh}>{t('progress.change')}</span><span>{t('perf.trend')}</span><span className="num" style={nh}>{t('perf.prsShort')}</span>
          </div>
          {rows.map((r) => {
            const gain = r.bestE1rm - r.startE1rm;
            return (
              <div key={r.exercise} className="dg-row" style={{ gridTemplateColumns: cols, gap: 12 }}>
                <span className="stack" style={{ gap: 1, minWidth: 0 }}><span className="ellipsis" style={{ fontWeight: 500 }}>{r.exercise}</span><span className="xs faint">{t('perf.timesSets', { n: r.sessions, s: r.sets })}</span></span>
                <span className="mono small" dir="ltr" style={{ textAlign: 'start' }}>{r.bestSet.weight > 0 ? `${r.bestSet.weight}×${r.bestSet.reps}` : `BW×${r.bestSet.reps}`}</span>
                <span className="num">{r.bestE1rm > 0 ? kg(r.bestE1rm) : '—'}</span>
                {r.bestE1rm > 0 ? <Signed d={Math.round(gain)} text={kg(gain)} className={`num ${gain > 0 ? 'ok' : 'muted'}`} /> : <span className="num muted">—</span>}
                <Sparkline values={r.series} />
                <span className="num">{r.prs ? <span className="chip accent" style={{ fontSize: 11.5 }}>{r.prs}</span> : <span className="faint">0</span>}</span>
              </div>
            );
          })}
          {rows.length === 0 && <Empty>{t('perf.noLogs')}</Empty>}
        </div>
      </div>
    </Card>
  );
}

export function VolumeCard({ logs }: ProgressProps) {
  const t = useT();
  const weeks = volumeByWeek(logs).slice(-12);
  const top = Math.max(0, ...weeks.map((w) => w.volume));
  return (
    <Card title={t('perf.volumeTitle')} action={<span className="small muted">{t('perf.volumeSub')}</span>}>
      <div className="card-body">
        <BarChart label={t('perf.volumeTitle')} bars={weeks.map((w) => ({ label: fmtShort(w.weekStart), value: w.volume, highlight: w.volume === top }))} format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}t` : String(Math.round(v)))} />
      </div>
    </Card>
  );
}

export function RpeCard({ logs }: ProgressProps) {
  const t = useT();
  return (
    <Card title={t('perf.rpeTitle')} action={<span className="small muted">{t('perf.rpeSub')}</span>}>
      <div className="card-body">
        <LineChart points={logs.map((l) => ({ x: fmtShort(l.date), y: l.rpe }))} unit="" label={t('perf.rpeTitle')} />
      </div>
    </Card>
  );
}

const CHECKIN_FIELDS = ['sleepH', 'energy', 'stress', 'soreness'] as const;

export function CheckinTrendCard({ trainee, scope }: ProgressProps) {
  const t = useT();
  const state = useAppState();
  const [field, setField] = useState<(typeof CHECKIN_FIELDS)[number]>('sleepH');
  const pts = state.checkins.filter((c) => c.traineeId === trainee.id && inRange(c.date, scope)).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Card title={t('perf.checkinTitle')}>
      <div className="card-body">
        <div className="seg" role="tablist">
          {CHECKIN_FIELDS.map((f) => <button key={f} type="button" role="tab" aria-selected={f === field} className={f === field ? 'on' : ''} onClick={() => setField(f)}>{t(`checkin.${f === 'sleepH' ? 'sleep' : f}`)}</button>)}
        </div>
        <LineChart points={pts.map((c) => ({ x: fmtShort(c.date), y: c[field] }))} unit={field === 'sleepH' ? 'h' : '/5'} label={t('perf.checkinTitle')} />
      </div>
    </Card>
  );
}

// ---------- InBody ----------

export const INBODY_FIELDS: InBodyField[] = ['weightKg', 'muscleKg', 'fatKg', 'fatPct', 'bmi', 'visceral', 'bmr', 'waterL', 'score'];
/** Whether a rising value is good news (for colouring changes). */
const UP_IS_GOOD: Record<InBodyField, boolean | null> = { weightKg: null, muscleKg: true, fatKg: false, fatPct: false, bmi: null, visceral: false, bmr: true, waterL: true, score: true };
export const INBODY_UNIT: Record<InBodyField, string> = { weightKg: 'kg', muscleKg: 'kg', fatKg: 'kg', fatPct: '%', bmi: '', visceral: '', bmr: 'kcal', waterL: 'L', score: '' };

/** Optional values the trainee skipped are stored as 0. */
export const hasInBody = (v: number) => v > 0;

export function fmtInBody(f: InBodyField, v: number, t: T): string {
  if (!hasInBody(v)) return '—';
  const u = INBODY_UNIT[f];
  if (u === 'kg') return fmtKg(Math.round(v * 10) / 10);
  if (u === '%') return `${v.toFixed(1)}%`;
  if (u === 'kcal') return t('weeks.unit.kcal', { n: Math.round(v).toLocaleString('en') });
  if (u === 'L') return `${v.toFixed(1)} L`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** "+0.7 kg" with the signed number kept left-to-right and the unit following the page direction. */
function Signed({ d, text, className }: { d: number; text: string; className?: string }) {
  const sp = text.indexOf(' ');
  const num = sp === -1 ? text : text.slice(0, sp);
  return <span className={className}><bdi dir="ltr">{d > 0 ? '+' : d < 0 ? '−' : ''}{num}</bdi>{sp === -1 ? '' : text.slice(sp)}</span>;
}

function Delta({ f, d, t }: { f: InBodyField; d: number; t: T }) {
  if (Math.abs(d) < 0.05) return <span className="faint">±0</span>;
  const good = UP_IS_GOOD[f] === null ? null : (d > 0) === UP_IS_GOOD[f];
  return <Signed d={d} text={fmtInBody(f, Math.abs(d), t)} className={good === null ? 'muted' : good ? 'ok' : 'warn'} />;
}

function useInBody(traineeId: string) {
  const state = useAppState();
  const scans = state.inbody.filter((x) => x.traineeId === traineeId).sort((a, b) => a.date.localeCompare(b.date));
  const pending = state.inbodyRequests.find((r) => r.traineeId === traineeId && r.status === 'pending');
  return { scans, pending };
}

/** Request / upload controls shared by the InBody cards. */
function InBodyActions({ trainee }: { trainee: Trainee }) {
  const t = useT();
  const { pending } = useInBody(trainee.id);
  const [modal, setModal] = useState<'request' | 'upload' | null>(null);
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {pending && <span className="chip warn">{t('inbody.waiting', { ago: fmtAgo(pending.requestedAt) })}</span>}
      {!pending && <button type="button" className="btn sm" onClick={() => setModal('request')}>{t('inbody.request')}</button>}
      <button type="button" className="btn sm dark" onClick={() => setModal('upload')}><Icon name="plus" size={14} strokeWidth={2} />{t('inbody.upload')}</button>
      {modal === 'request' && <RequestInBodyModal trainee={trainee} onClose={() => setModal(null)} />}
      {modal === 'upload' && <UploadInBodyModal trainee={trainee} onClose={() => setModal(null)} />}
    </div>
  );
}

const HEADLINE: InBodyField[] = ['weightKg', 'muscleKg', 'fatPct', 'fatKg', 'visceral', 'score'];

export function InBodyCard({ trainee, scope }: ProgressProps) {
  const t = useT();
  const { scans: all } = useInBody(trainee.id);
  const scans = all.filter((x) => inRange(x.date, scope));
  const last = scans.at(-1);
  const prev = scans.at(-2);
  const first = scans[0];
  return (
    <Card title={t('custom.section.inbody')} action={<InBodyActions trainee={trainee} />}>
      {last ? (
        <div className="card-body">
          <div className="row wrap small muted" style={{ justifyContent: 'space-between' }}>
            <span>{t('inbody.scanOf', { date: fmtDay(last.date) })} · {t(last.source === 'trainee' ? 'inbody.byTrainee' : 'inbody.byCoach')}</span>
            <ReportLink scan={last} t={t} />
          </div>
          <div className="ib-grid">
            {HEADLINE.map((f) => (
              <div key={f} className="target">
                <span className="xs faint">{t(`inbody.f.${f}`)}</span>
                <span className="target-v">{fmtInBody(f, last[f], t)}</span>
                <span className="xs">
                  {!hasInBody(last[f]) ? <span className="faint">{t('inbody.notGiven')}</span>
                    : prev && hasInBody(prev[f]) ? <><Delta f={f} d={last[f] - prev[f]} t={t} /> <span className="faint">{t('inbody.vsPrev')}</span></>
                    : <span className="faint">{t('inbody.firstScan')}</span>}
                </span>
                {first && first !== last && scans.length > 2 && hasInBody(last[f]) && hasInBody(first[f]) && <span className="xs"><Delta f={f} d={last[f] - first[f]} t={t} /> <span className="faint">{t('inbody.sinceFirst')}</span></span>}
              </div>
            ))}
          </div>
        </div>
      ) : <Empty>{t('inbody.none')}</Empty>}
    </Card>
  );
}

const TREND_FIELDS: InBodyField[] = ['muscleKg', 'fatPct', 'weightKg', 'fatKg', 'score'];

export function InBodyTrendCard({ trainee, scope }: ProgressProps) {
  const t = useT();
  const { scans } = useInBody(trainee.id);
  const [field, setField] = useState<InBodyField>('muscleKg');
  const pts = scans.filter((x) => inRange(x.date, scope) && hasInBody(x[field]));
  return (
    <Card title={t('custom.section.inbodyTrend')} action={<span className="small muted">{t('inbody.scans', { n: pts.length })}</span>}>
      <div className="card-body">
        <div className="seg" role="tablist">
          {TREND_FIELDS.map((f) => <button key={f} type="button" role="tab" aria-selected={f === field} className={f === field ? 'on' : ''} onClick={() => setField(f)}>{t(`inbody.f.${f}`)}</button>)}
        </div>
        <LineChart points={pts.map((x) => ({ x: fmtShort(x.date), y: x[field] }))} unit={INBODY_UNIT[field]} label={t(`inbody.f.${field}`)} />
      </div>
    </Card>
  );
}

function ReportLink({ scan, t }: { scan: InBodyScan; t: T }) {
  if (!scan.file) return null;
  // Stored in Supabase: open through a short-lived signed link.
  const path = scan.file.path;
  if (path && supabase) {
    const db = supabase;
    return (
      <button type="button" className="link-btn small row" style={{ gap: 4 }} onClick={async () => { const url = await reportUrl(db, path); if (url) window.open(url, '_blank', 'noopener'); }}>
        <Icon name="clipboard" size={14} />{t('inbody.report')}
      </button>
    );
  }
  return scan.file.dataUrl
    ? <a href={scan.file.dataUrl} download={scan.file.name} className="small row" style={{ gap: 4 }}><Icon name="clipboard" size={14} />{t('inbody.report')}</a>
    : <span className="small faint row" style={{ gap: 4 }} title={scan.file.name}><Icon name="clipboard" size={14} />{t('inbody.reportOnFile')}</span>;
}

export function InBodyHistoryCard({ trainee, scope }: ProgressProps) {
  const t = useT();
  const toast = useToast();
  const { scans } = useInBody(trainee.id);
  const list = scans.filter((x) => inRange(x.date, scope)).reverse();
  const fields: InBodyField[] = ['weightKg', 'muscleKg', 'fatKg', 'fatPct', 'bmi', 'visceral', 'bmr', 'score'];
  const cols = `110px repeat(${fields.length}, minmax(70px, 1fr)) 120px 40px`;
  return (
    <Card title={t('custom.section.inbodyHistory')} action={<InBodyActions trainee={trainee} />}>
      <div className="table-scroll">
        <div style={{ minWidth: 980 }}>
          <div className="dg-head" style={{ gridTemplateColumns: cols, gap: 10 }}>
            <span>{t('workouts.date')}</span>{fields.map((f) => <span key={f}>{t(`inbody.f.${f}`)}</span>)}<span>{t('inbody.report')}</span><span />
          </div>
          {list.map((x, i) => {
            const older = list[i + 1];
            return (
              <div key={x.id} className="dg-row" style={{ gridTemplateColumns: cols, gap: 10 }}>
                <span className="stack" style={{ gap: 1 }}><span style={{ fontWeight: 500 }}>{fmtDay(x.date)}</span><span className="xs faint">{t(x.source === 'trainee' ? 'inbody.byTrainee' : 'inbody.byCoach')}</span></span>
                {fields.map((f) => (
                  <span key={f} className="stack mono small" style={{ gap: 1 }}>
                    <span>{fmtInBody(f, x[f], t)}</span>
                    {older && hasInBody(x[f]) && hasInBody(older[f]) && <span className="xs"><Delta f={f} d={x[f] - older[f]} t={t} /></span>}
                  </span>
                ))}
                <ReportLink scan={x} t={t} />
                <button type="button" className="btn ghost sm icon" aria-label={t('inbody.delete')} onClick={() => { deleteInBodyScan(x.id); toast(t('inbody.deleted')); }}><Icon name="trash" size={14} /></button>
              </div>
            );
          })}
          {list.length === 0 && <Empty>{t('inbody.none')}</Empty>}
        </div>
      </div>
    </Card>
  );
}

// ---------- Coach-built cards ----------

export function unitFor(src: CardSource, t: T): string {
  switch (src.kind) {
    case 'exercise': return src.measure === 'reps' ? t('builder.unit.reps') : 'kg';
    case 'workout': return src.field === 'duration' ? 'min' : src.field === 'volume' ? 'kg' : '';
    case 'checkin': return src.field === 'weightKg' ? 'kg' : src.field === 'sleepH' ? 'h' : '/5';
    case 'inbody': return INBODY_UNIT[src.field];
    case 'target': return src.field === 'bodyWeight' ? 'kg' : 'h';
    case 'metric': return src.unit;
  }
}

export function CustomCardView({ card, trainee, allLogs, scope }: ProgressProps & { card: CustomCard }) {
  const t = useT();
  const state = useAppState();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const [date, setDate] = useState(todayISO());
  const pts = seriesFor(card.source, { state, trainee, logs: allLogs, scope, cardId: card.id });
  const unit = unitFor(card.source, t);
  const last = pts.at(-1);
  const change = pts.length > 1 ? last!.value - pts[0].value : null;
  const fmt = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}${unit ? ` ${unit}` : ''}`;
  const isMetric = card.source.kind === 'metric';
  const entries = isMetric ? state.metricEntries.filter((m) => m.traineeId === trainee.id && m.cardId === card.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const add = () => {
    const n = Number(val);
    if (val.trim() === '' || Number.isNaN(n)) return;
    addMetricEntry(trainee.id, card.id, date, n);
    setVal('');
    toast(t('builder.valueAdded'));
  };
  return (
    <Card title={card.title} action={<button type="button" className="btn ghost sm icon" aria-label={t('builder.editCard')} onClick={() => setEditing(true)}><Icon name="edit" size={14} /></button>}>
      <div className="card-body">
        <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
          <span className="mono" style={{ fontSize: 24, fontWeight: 500 }} dir="ltr">{last ? fmt(last.value) : '—'}</span>
          {change !== null && <span className={`mono small ${change >= 0 === (card.source.kind !== 'metric' || card.source.higherIsBetter) ? 'ok' : 'warn'}`} dir="ltr">{change >= 0 ? '+' : '−'}{fmt(Math.abs(change))}</span>}
          <span className="xs faint" style={{ marginInlineStart: 'auto' }}>{t('builder.points', { n: pts.length })}</span>
        </div>
        {card.chart === 'bar'
          ? <BarChart label={card.title} bars={pts.slice(-14).map((p) => ({ label: fmtShort(p.date), value: p.value }))} format={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))} />
          : <LineChart points={pts.map((p) => ({ x: fmtShort(p.date), y: p.value }))} unit={unit} label={card.title} />}
        {isMetric && (
          <>
            <div className="row wrap" style={{ gap: 8 }}>
              <input className="input compact" type="date" style={{ width: 150 }} aria-label={t('workouts.date')} value={date} onChange={(e) => setDate(e.target.value)} />
              <input className="input compact mono" type="number" step="any" style={{ width: 120 }} aria-label={card.title} placeholder={unit || t('builder.value')} value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
              <button type="button" className="btn sm dark" disabled={!val.trim()} onClick={add}>{t('builder.addValue')}</button>
            </div>
            {entries.length > 0 && (
              <div className="row wrap" style={{ gap: 6 }}>
                {entries.slice(0, 6).map((m) => (
                  <span key={m.id} className="chip row" style={{ gap: 4 }}>{fmtShort(m.date)} · <span className="mono" dir="ltr">{m.value}</span>
                    <button type="button" className="link-btn" style={{ padding: 0, color: 'var(--faint)' }} aria-label={t('builder.removeValue')} onClick={() => deleteMetricEntry(m.id)}><Icon name="x" size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {editing && <CardBuilderModal card={card} onClose={() => setEditing(false)} />}
    </Card>
  );
}

/** Label for a custom card's data source, used in the builder and the customize list. */
export function sourceLabel(src: CardSource, t: T): string {
  switch (src.kind) {
    case 'exercise': return `${src.exercise} · ${t(`builder.measure.${src.measure}`)}`;
    case 'workout': return t(`builder.workout.${src.field}`);
    case 'checkin': return t(`builder.checkin.${src.field}` as StringKey);
    case 'inbody': return `InBody · ${t(`inbody.f.${src.field}`)}`;
    case 'target': return t(`builder.target.${src.field}`);
    case 'metric': return t('builder.kind.metric');
  }
}

