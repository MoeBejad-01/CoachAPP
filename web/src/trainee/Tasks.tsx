// Weekly check-in, InBody upload and the trainee's own profile screen.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addInBodyScan, submitCheckin } from '../data/actions';
import { formatMoney } from '../data/selectors';
import { useAppState } from '../data/store';
import type { InBodyField, InBodyScan } from '../data/types';
import { Icon } from '../components/Icon';
import { useToast } from '../components/ui';
import { useI18n, useT } from '../i18n';
import { fmtAgo, fmtDay, todayISO, weekdayName } from '../lib/dates';
import { fmtKg } from '../lib/util';
import { INBODY_FIELDS, INBODY_UNIT } from '../pages/trainee/progressCards';
import { TabScreen, TaskScreen, useTraineeApp } from './TraineeApp';

function Scale({ value, onChange, label, low, high }: { value: number; onChange: (n: number) => void; label: string; low: string; high: string }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
      <div className="ta-scale" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={value === n} className={value === n ? 'on' : ''} onClick={() => onChange(n)}>{n}</button>)}
      </div>
      <div className="row xs faint" style={{ justifyContent: 'space-between' }}><span>{low}</span><span>{high}</span></div>
    </div>
  );
}

export function CheckinScreen() {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const state = useAppState();
  const { trainee, base } = useTraineeApp();
  const lastKg = state.weights.filter((w) => w.traineeId === trainee.id).sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.kg;
  const [kg, setKg] = useState(lastKg ? String(lastKg) : '');
  const [sleep, setSleep] = useState('7.5');
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [comment, setComment] = useState('');
  const valid = Number(kg) > 0 && Number(sleep) > 0;
  const save = () => {
    submitCheckin({ traineeId: trainee.id, date: todayISO(), weightKg: Number(kg), sleepH: Number(sleep), energy, stress, soreness, comment: comment.trim() });
    toast(t('ta.checkin.sent', { name: state.coach.name.split(' ')[0] }));
    navigate(base);
  };
  return (
    <TaskScreen title={t('ta.todo.checkin')} onBack={() => navigate(base)} footer={<button type="button" className="btn primary" disabled={!valid} onClick={save}>{t('ta.checkin.submit')}</button>}>
      <p className="small muted" style={{ paddingInline: 4 }}>{t('ta.checkin.intro', { day: weekdayName(trainee.checkinDay) })}</p>
      <section className="ta-card ta-card-pad" style={{ gap: 16 }}>
        <div className="row" style={{ gap: 10 }}>
          <label className="field grow">{t('ta.checkin.weight')}<input className="input mono" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} /></label>
          <label className="field grow">{t('ta.checkin.sleep')}<input className="input mono" inputMode="decimal" value={sleep} onChange={(e) => setSleep(e.target.value)} /></label>
        </div>
        <Scale label={t('checkin.energy')} value={energy} onChange={setEnergy} low={t('ta.scale.low')} high={t('ta.scale.high')} />
        <Scale label={t('checkin.stress')} value={stress} onChange={setStress} low={t('ta.scale.low')} high={t('ta.scale.high')} />
        <Scale label={t('checkin.soreness')} value={soreness} onChange={setSoreness} low={t('ta.scale.none')} high={t('ta.scale.very')} />
        <label className="field">{t('ta.checkin.comment')}
          <textarea className="textarea" rows={3} value={comment} placeholder={t('ta.checkin.commentPlaceholder')} onChange={(e) => setComment(e.target.value)} />
        </label>
      </section>
    </TaskScreen>
  );
}

const MAX_INLINE_BYTES = 600 * 1024;
const REQUIRED: InBodyField[] = ['weightKg', 'muscleKg', 'fatPct'];

export function InBodyScreen() {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const state = useAppState();
  const { trainee, base } = useTraineeApp();
  const pending = state.inbodyRequests.find((r) => r.traineeId === trainee.id && r.status === 'pending');
  const [file, setFile] = useState<InBodyScan['file']>();
  const [date, setDate] = useState(todayISO());
  const [more, setMore] = useState(false);
  const [v, setV] = useState<Record<InBodyField, string>>(() => Object.fromEntries(INBODY_FIELDS.map((f) => [f, ''])) as Record<InBodyField, string>);
  const valid = !!file && REQUIRED.every((f) => Number(v[f]) > 0);

  const pick = (f: File | undefined) => {
    if (!f) return setFile(undefined);
    if (f.size > MAX_INLINE_BYTES) return setFile({ name: f.name, type: f.type });
    const r = new FileReader();
    r.onload = () => setFile({ name: f.name, type: f.type, dataUrl: String(r.result) });
    r.readAsDataURL(f);
  };
  const save = () => {
    const n = (f: InBodyField) => Number(v[f]) || 0;
    const weightKg = n('weightKg');
    const fatPct = n('fatPct');
    addInBodyScan({
      traineeId: trainee.id, date, source: 'trainee', file,
      weightKg, muscleKg: n('muscleKg'), fatPct, fatKg: v.fatKg ? n('fatKg') : Math.round(weightKg * fatPct) / 100,
      bmi: v.bmi ? n('bmi') : Math.round((weightKg / (trainee.heightCm / 100) ** 2) * 10) / 10,
      visceral: n('visceral'), bmr: n('bmr'), waterL: n('waterL'), score: n('score'),
    });
    toast(t('ta.inbody.sent', { name: state.coach.name.split(' ')[0] }));
    navigate(base);
  };
  const field = (f: InBodyField) => (
    <label key={f} className="field">
      <span>{t(`inbody.f.${f}`)}{INBODY_UNIT[f] && <span className="faint"> ({INBODY_UNIT[f]})</span>}</span>
      <input className="input mono" inputMode="decimal" value={v[f]} onChange={(e) => setV((x) => ({ ...x, [f]: e.target.value }))} />
    </label>
  );
  return (
    <TaskScreen title={t('ta.inbody.title')} onBack={() => navigate(base)} footer={<button type="button" className="btn primary" disabled={!valid} onClick={save}>{t('ta.inbody.send')}</button>}>
      {pending && (
        <section className="ta-note">
          <span className="ta-label">{t('ta.inbody.requestedBy', { name: state.coach.name.split(' ')[0], ago: fmtAgo(pending.requestedAt) })}</span>
          {pending.note && <p style={{ lineHeight: 1.5, fontSize: 14 }}>{pending.note}</p>}
        </section>
      )}
      <section className="ta-card ta-card-pad">
        <span style={{ fontWeight: 600 }}>{t('ta.inbody.step1')}</span>
        <label className={`ta-upload${file ? ' on' : ''}`}>
          <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          <Icon name={file ? 'check' : 'upload'} size={22} />
          <span style={{ fontWeight: 600 }}>{file ? file.name : t('ta.inbody.choose')}</span>
          <span className="xs muted">{file ? t('ta.inbody.change') : t('ta.inbody.chooseSub')}</span>
        </label>
        <label className="field">{t('inbody.scanDate')}<input className="input" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></label>
      </section>
      <section className="ta-card ta-card-pad">
        <span style={{ fontWeight: 600 }}>{t('ta.inbody.step2')}</span>
        <span className="xs muted">{t('ta.inbody.step2Sub')}</span>
        <div className="ta-targets">{REQUIRED.map(field)}</div>
        <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setMore((x) => !x)}>{more ? t('ta.inbody.fewer') : t('ta.inbody.more')}</button>
        {more && <div className="ta-targets">{INBODY_FIELDS.filter((f) => !REQUIRED.includes(f)).map(field)}</div>}
      </section>
    </TaskScreen>
  );
}

export function MeScreen() {
  const t = useT();
  const { lang, setLang } = useI18n();
  const state = useAppState();
  const { trainee, base } = useTraineeApp();
  const m = trainee.membership;
  const scans = state.inbody.filter((x) => x.traineeId === trainee.id);
  const rows: [string, string][] = [
    [t('ta.me.plan'), t(`mode.plan.${trainee.mode}`)],
    [t('billing.price'), `${formatMoney(state, m.price)} · ${t(`cycle.${m.cycle}`)}`],
    [t('billing.renews'), fmtDay(m.renewsOn)],
    [t('form.checkinDay'), weekdayName(trainee.checkinDay)],
    [t('form.sessionsPerWeek'), String(trainee.frequency)],
  ];
  return (
    <TabScreen title={`${trainee.firstName} ${trainee.lastName}`} sub={t('ta.me.coachedBy', { name: state.coach.name })}>
      <section className="ta-card">
        {rows.map(([k, val]) => (
          <div key={k} className="ta-row" style={{ justifyContent: 'space-between' }}><span className="muted small">{k}</span><span style={{ fontWeight: 500, textAlign: 'end' }}>{val}</span></div>
        ))}
      </section>
      <section className="ta-card">
        <Link to={`${base}/checkin`} className="ta-row"><span className="ta-task-icon"><Icon name="clipboard" size={17} /></span><span className="grow">{t('ta.me.checkin')}</span><Icon name="chevron" size={16} /></Link>
        <Link to={`${base}/inbody`} className="ta-row"><span className="ta-task-icon"><Icon name="upload" size={17} /></span><span className="grow">{t('ta.me.inbody', { n: scans.length })}</span><Icon name="chevron" size={16} /></Link>
        <button type="button" className="ta-row" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}><span className="ta-task-icon"><Icon name="globe" size={17} /></span><span className="grow" lang={lang === 'ar' ? 'en' : 'ar'}>{t('nav.switchLang')}</span></button>
      </section>
      {trainee.injuries && (
        <section className="ta-card ta-card-pad">
          <span className="ta-label">{t('form.injuries')}</span>
          <p style={{ lineHeight: 1.5, fontSize: 14 }}>{trainee.injuries}</p>
          <span className="xs faint">{t('ta.me.injuriesHint')}</span>
        </section>
      )}
      <p className="xs faint" style={{ textAlign: 'center' }}>{t('ta.me.weightNow', { v: (() => { const w = state.weights.filter((x) => x.traineeId === trainee.id).sort((a, b) => a.date.localeCompare(b.date)).at(-1); return w ? fmtKg(w.kg) : '—'; })() })}</p>
    </TabScreen>
  );
}
