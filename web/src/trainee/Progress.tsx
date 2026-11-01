import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addMetricEntry, logWeight } from '../data/actions';
import { prEvents, topLifts } from '../data/progress';
import { useAppState } from '../data/store';
import { Icon } from '../components/Icon';
import { LineChart } from '../components/LineChart';
import { useToast } from '../components/ui';
import { useT } from '../i18n';
import { fmtDay, fmtShort, todayISO } from '../lib/dates';
import { fmtKg } from '../lib/util';
import { fmtInBody } from '../pages/trainee/progressCards';
import { TabScreen, useTraineeApp } from './TraineeApp';

export function ProgressScreen() {
  const t = useT();
  const toast = useToast();
  const state = useAppState();
  const { trainee, logs, base } = useTraineeApp();
  const [kg, setKg] = useState('');
  const weights = state.weights.filter((w) => w.traineeId === trainee.id).sort((a, b) => a.date.localeCompare(b.date));
  const prs = useMemo(() => prEvents(logs), [logs]);
  const lifts = useMemo(() => topLifts(logs, prs).slice(0, 5), [logs, prs]);
  const scans = state.inbody.filter((x) => x.traineeId === trainee.id).sort((a, b) => a.date.localeCompare(b.date));
  const last = scans.at(-1);
  const prev = scans.at(-2);
  const pending = state.inbodyRequests.find((r) => r.traineeId === trainee.id && r.status === 'pending');
  // Metric cards the coach created; trainees log their own values.
  const metrics = state.traineeLayout.customCards.filter((c) => c.source.kind === 'metric');
  const lastKg = weights.at(-1)?.kg;
  const weightGoal = trainee.goals.find((g) => g.unit === 'kg' && /weight|reach|lose|make weight|وزن/i.test(g.label));

  const saveWeight = () => {
    const n = Number(kg);
    if (!n) return;
    logWeight(trainee.id, todayISO(), n);
    setKg('');
    toast(t('ta.progress.weightSaved'));
  };

  return (
    <TabScreen title={t('ta.tab.progress')} sub={t('perf.since', { date: fmtDay(logs[0]?.date ?? trainee.joinedAt) })}>
      <section className="ta-card">
        <div className="ta-card-head"><span className="ta-card-title">{t('trainee.bodyWeight')}</span>{lastKg !== undefined && <span className="mono" style={{ fontWeight: 600 }}>{fmtKg(lastKg)}</span>}</div>
        <div className="ta-card-pad">
          <LineChart points={weights.slice(-30).map((w) => ({ x: fmtShort(w.date), y: w.kg }))} target={weightGoal?.target} unit="kg" label={t('progress.weightChart')} height={130} />
          <div className="row" style={{ gap: 8 }}>
            <input className="input mono" inputMode="decimal" placeholder={t('ta.progress.todayKg')} value={kg} onChange={(e) => setKg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveWeight()} />
            <button type="button" className="btn dark" disabled={!Number(kg)} onClick={saveWeight}>{t('ta.progress.log')}</button>
          </div>
        </div>
      </section>

      <section className="ta-card">
        <div className="ta-card-head">
          <span className="ta-card-title">InBody</span>
          <Link to={`${base}/inbody`} className="small row" style={{ gap: 4 }}><Icon name="upload" size={14} />{pending ? t('ta.progress.requested') : t('inbody.upload')}</Link>
        </div>
        {last ? (
          <div className="ta-card-pad">
            <span className="xs faint">{t('inbody.scanOf', { date: fmtDay(last.date) })}</span>
            <div className="ta-targets">
              {(['muscleKg', 'fatPct', 'weightKg', 'score'] as const).map((f) => {
                const d = prev ? last[f] - prev[f] : 0;
                return (
                  <div key={f} className="ta-target">
                    <span className="ta-label">{t(`inbody.f.${f}`)}</span>
                    <span className="ta-target-v">{fmtInBody(f, last[f], t)}</span>
                    {prev && last[f] > 0 && prev[f] > 0 && Math.abs(d) >= 0.05 && <span className="xs muted"><bdi dir="ltr">{d > 0 ? '+' : '−'}{Math.abs(d).toFixed(1)}</bdi> {t('inbody.vsPrev')}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ) : <div className="ta-card-pad"><p className="small muted">{t('ta.progress.noScans')}</p></div>}
      </section>

      <section className="ta-card">
        <div className="ta-card-head"><span className="ta-card-title">{t('ta.progress.records')}</span><span className="chip accent mono">{prs.length}</span></div>
        <div style={{ paddingTop: 6 }}>
          {[...prs].reverse().slice(0, 5).map((x, i) => (
            <div key={i} className="ta-row">
              <span className="ta-task-icon"><Icon name="trophy" size={16} /></span>
              <span className="stack grow" style={{ gap: 2, minWidth: 0 }}><span className="ellipsis" style={{ fontWeight: 500 }}>{x.exercise}</span><span className="xs faint">{fmtShort(x.date)}</span></span>
              <span className="set pr" dir="ltr">{x.set.weight}×{x.set.reps}</span>
            </div>
          ))}
          {prs.length === 0 && <div className="ta-card-pad"><p className="small muted">{t('ta.progress.noPrs')}</p></div>}
        </div>
      </section>

      {lifts.length > 0 && (
        <section className="ta-card">
          <div className="ta-card-head"><span className="ta-card-title">{t('ta.progress.lifts')}</span><span className="xs faint">{t('progress.e1rm')}</span></div>
          <div style={{ paddingTop: 6 }}>
            {lifts.map((l) => (
              <div key={l.exercise} className="ta-row">
                <span className="stack grow" style={{ gap: 2, minWidth: 0 }}><span className="ellipsis" style={{ fontWeight: 500 }}>{l.exercise}</span><span className="xs faint">{t('perf.timesSets', { n: l.sessions, s: l.sets })}</span></span>
                <span className="stack" style={{ gap: 2, alignItems: 'flex-end' }}>
                  <span className="mono small" style={{ fontWeight: 600 }}>{fmtKg(Math.round(l.bestE1rm))}</span>
                  {l.bestE1rm > l.startE1rm && <span className="xs ok"><bdi dir="ltr">+{Math.round(l.bestE1rm - l.startE1rm)}</bdi></span>}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {metrics.map((c) => <MetricCard key={c.id} cardId={c.id} title={c.title} unit={c.source.kind === 'metric' ? c.source.unit : ''} />)}
    </TabScreen>
  );
}

function MetricCard({ cardId, title, unit }: { cardId: string; title: string; unit: string }) {
  const t = useT();
  const toast = useToast();
  const state = useAppState();
  const { trainee } = useTraineeApp();
  const [v, setV] = useState('');
  const pts = state.metricEntries.filter((m) => m.traineeId === trainee.id && m.cardId === cardId).sort((a, b) => a.date.localeCompare(b.date));
  const add = () => {
    if (v.trim() === '' || Number.isNaN(Number(v))) return;
    addMetricEntry(trainee.id, cardId, todayISO(), Number(v));
    setV('');
    toast(t('builder.valueAdded'));
  };
  return (
    <section className="ta-card">
      <div className="ta-card-head"><span className="ta-card-title">{title}</span>{pts.at(-1) && <span className="mono" style={{ fontWeight: 600 }} dir="ltr">{pts.at(-1)!.value} {unit}</span>}</div>
      <div className="ta-card-pad">
        <span className="xs faint">{t('ta.progress.metricHint')}</span>
        {pts.length > 1 && <LineChart points={pts.map((p) => ({ x: fmtShort(p.date), y: p.value }))} unit={unit} label={title} height={110} />}
        <div className="row" style={{ gap: 8 }}>
          <input className="input mono" inputMode="decimal" placeholder={unit || t('builder.value')} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button type="button" className="btn dark" disabled={!v.trim()} onClick={add}>{t('ta.progress.log')}</button>
        </div>
      </div>
    </section>
  );
}

