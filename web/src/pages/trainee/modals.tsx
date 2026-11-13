import { useState } from 'react';
import { assignTemplate, setGoals, updateTrainee, updateTraineeProgram } from '../../data/actions';
import { fullName } from '../../data/selectors';
import { useAppState } from '../../data/store';
import { TIERS } from '../../data/plans';
import type { Goal, PlanTier, Trainee } from '../../data/types';
import { Icon } from '../../components/Icon';
import { Modal, useToast } from '../../components/ui';
import { useT } from '../../i18n';
import { addDays, startOfWeek, todayISO, weekdayName } from '../../lib/dates';
import { uid } from '../../lib/util';

export function EditProfileModal({ trainee, onClose }: { trainee: Trainee; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [f, setF] = useState({ ...trainee });
  const set = <K extends keyof Trainee>(k: K, v: Trainee[K]) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.firstName.trim() && f.lastName.trim() && /\S+@\S+\.\S+/.test(f.email);
  const save = () => {
    updateTrainee(trainee.id, {
      firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim(), phone: f.phone, birthDate: f.birthDate,
      heightCm: f.heightCm, tier: f.tier, frequency: f.frequency, checkinDay: f.checkinDay, injuries: f.injuries, pinnedNote: f.pinnedNote,
    });
    toast(t('profile.saved'));
    onClose();
  };
  return (
    <Modal title={t('profile.editTitle', { name: fullName(trainee) })} onClose={onClose} wide footer={<><button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button><button type="button" className="btn primary" disabled={!valid} onClick={save}>{t('common.saveChanges')}</button></>}>
      <div className="form-grid">
        <label className="field">{t('form.firstName')}<input className="input" value={f.firstName} onChange={(e) => set('firstName', e.target.value)} /></label>
        <label className="field">{t('form.lastName')}<input className="input" value={f.lastName} onChange={(e) => set('lastName', e.target.value)} /></label>
        <label className="field">{t('form.email')}<input className="input" type="email" dir="ltr" value={f.email} onChange={(e) => set('email', e.target.value)} /></label>
        <label className="field">{t('form.phone')}<input className="input" type="tel" dir="ltr" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></label>
        <label className="field">{t('form.birthDate')}<input className="input" type="date" value={f.birthDate} onChange={(e) => set('birthDate', e.target.value)} /></label>
        <label className="field">{t('form.height')}<input className="input mono" type="number" value={f.heightCm} onChange={(e) => set('heightCm', Number(e.target.value))} /></label>
        <label className="field">{t('form.coachingType')}
          <select className="select" value={f.tier} onChange={(e) => set('tier', e.target.value as PlanTier)}>
            {TIERS.map((m) => <option key={m} value={m}>{t(`tier.${m}`)}</option>)}
          </select>
        </label>
        <label className="field">{t('form.sessionsPerWeek')}
          <select className="select" value={f.frequency} onChange={(e) => set('frequency', Number(e.target.value))}>
            {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="field">{t('form.checkinDay')}
          <select className="select" value={f.checkinDay} onChange={(e) => set('checkinDay', Number(e.target.value))}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <option key={i} value={i}>{weekdayName(i)}</option>)}
          </select>
        </label>
      </div>
      <label className="field">{t('form.injuries')}<textarea className="textarea" rows={2} value={f.injuries} onChange={(e) => set('injuries', e.target.value)} /></label>
      <label className="field">{t('form.pinned')} <span className="hint">{t('form.pinnedHint')}</span><textarea className="textarea" rows={2} value={f.pinnedNote} onChange={(e) => set('pinnedNote', e.target.value)} /></label>
    </Modal>
  );
}

export function GoalsModal({ trainee, onClose }: { trainee: Trainee; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [goals, setLocal] = useState<Goal[]>(trainee.goals.map((g) => ({ ...g })));
  const patch = (i: number, p: Partial<Goal>) => setLocal((gs) => gs.map((g, j) => (j === i ? { ...g, ...p } : g)));
  const save = () => {
    setGoals(trainee.id, goals.filter((g) => g.label.trim()));
    toast(t('goals.saved'));
    onClose();
  };
  return (
    <Modal title={t('goals.edit')} onClose={onClose} wide footer={<><button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button><button type="button" className="btn primary" onClick={save}>{t('goals.save')}</button></>}>
      {goals.map((g, i) => (
        <div key={g.id} className="stack" style={{ gap: 10, paddingBottom: 14, borderBottom: '1px solid var(--divider)' }}>
          <div className="row">
            <input className="input" aria-label={t('goals.goal')} placeholder={t('goals.placeholder')} value={g.label} onChange={(e) => patch(i, { label: e.target.value })} />
            <button type="button" className="btn ghost icon" aria-label={t('goals.remove')} onClick={() => setLocal((gs) => gs.filter((_, j) => j !== i))}><Icon name="trash" size={16} /></button>
          </div>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
            <label className="field">{t('goals.start')}<input className="input mono" type="number" step="any" value={g.start} onChange={(e) => patch(i, { start: Number(e.target.value) })} /></label>
            <label className="field">{t('goals.current')}<input className="input mono" type="number" step="any" value={g.current} onChange={(e) => patch(i, { current: Number(e.target.value) })} /></label>
            <label className="field">{t('goals.target')}<input className="input mono" type="number" step="any" value={g.target} onChange={(e) => patch(i, { target: Number(e.target.value) })} /></label>
            <label className="field">{t('goals.unit')}<input className="input" value={g.unit} onChange={(e) => patch(i, { unit: e.target.value })} /></label>
          </div>
        </div>
      ))}
      <button type="button" className="btn sm" style={{ alignSelf: 'flex-start', borderStyle: 'dashed' }} onClick={() => setLocal((gs) => [...gs, { id: uid('g'), label: '', unit: 'kg', start: 0, current: 0, target: 0 }])}>
        <Icon name="plus" size={14} strokeWidth={2} />{t('goals.add')}
      </button>
    </Modal>
  );
}

export function ChangeProgramModal({ trainee, onClose }: { trainee: Trainee; onClose: () => void }) {
  const state = useAppState();
  const t = useT();
  const toast = useToast();
  const [tpl, setTpl] = useState(trainee.program?.templateId ?? state.templates[0]?.id ?? '');
  const [start, setStart] = useState(addDays(startOfWeek(todayISO()), 7));
  const assign = () => {
    assignTemplate(tpl, [trainee.id], start);
    toast(t('program.assigned'));
    onClose();
  };
  return (
    <Modal title={trainee.program ? t('program.change') : t('program.assignTitle')} onClose={onClose} wide footer={
      <>
        {trainee.program && <button type="button" className="btn danger" style={{ marginInlineEnd: 'auto' }} onClick={() => { updateTraineeProgram(trainee.id, null); toast(t('program.removed')); onClose(); }}>{t('program.remove')}</button>}
        <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" className="btn primary" disabled={!tpl} onClick={assign}>{t('program.assign')}</button>
      </>
    }>
      <p className="small muted">{t('program.copyNote')}{trainee.program && ` ${t('program.replaceNote')}`}</p>
      <div className="choices">
        {state.templates.map((x) => (
          <button key={x.id} type="button" className={`choice${tpl === x.id ? ' on' : ''}`} onClick={() => setTpl(x.id)}>
            <span className="t">{x.name}</span>
            <span className="s">{t('program.tplMeta', { w: x.weeks, d: x.days.length })}</span>
          </button>
        ))}
      </div>
      <label className="field" style={{ maxWidth: 240 }}>{t('form.startDate')}<input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
    </Modal>
  );
}
