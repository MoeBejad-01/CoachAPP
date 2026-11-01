// Requesting and recording InBody scans. In the trainee app the upload form is
// the same; here the coach can also record a scan on the trainee's behalf.

import { useState } from 'react';
import { addInBodyScan, requestInBody } from '../../data/actions';
import { useAppState } from '../../data/store';
import type { InBodyField, InBodyScan, Trainee } from '../../data/types';
import { Modal, useToast } from '../../components/ui';
import { useT } from '../../i18n';
import { todayISO } from '../../lib/dates';
import { INBODY_FIELDS, INBODY_UNIT } from './progressCards';

/** Reports up to this size are kept in the browser so they can be reopened. */
const MAX_INLINE_BYTES = 600 * 1024;

export function RequestInBodyModal({ trainee, onClose }: { trainee: Trainee; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [note, setNote] = useState('');
  const message = t('inbody.requestMsg', { name: trainee.firstName }) + (note.trim() ? `\n${note.trim()}` : '');
  const send = () => {
    requestInBody(trainee.id, note.trim(), message);
    toast(t('inbody.requested', { name: trainee.firstName }));
    onClose();
  };
  return (
    <Modal title={t('inbody.requestTitle', { name: trainee.firstName })} onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button><button type="button" className="btn primary" onClick={send}>{t('inbody.sendRequest')}</button></>}>
      <p className="small muted">{t('inbody.requestHint')}</p>
      <label className="field">{t('inbody.noteLabel')}
        <textarea className="textarea" rows={3} value={note} placeholder={t('inbody.notePlaceholder')} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="stack" style={{ gap: 6 }}>
        <span className="xs faint">{t('inbody.preview')}</span>
        <div className="bubble me" style={{ maxWidth: '100%' }}>{message}</div>
      </div>
    </Modal>
  );
}

type Values = Record<InBodyField, string>;

export function UploadInBodyModal({ trainee, onClose }: { trainee: Trainee; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const state = useAppState();
  const last = state.inbody.filter((x) => x.traineeId === trainee.id).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const [date, setDate] = useState(todayISO());
  const [file, setFile] = useState<InBodyScan['file']>();
  const [fileNote, setFileNote] = useState('');
  const [v, setV] = useState<Values>(() => Object.fromEntries(INBODY_FIELDS.map((f) => [f, last ? String(last[f]) : ''])) as Values);
  const required: InBodyField[] = ['weightKg', 'muscleKg', 'fatPct'];
  const valid = !!date && required.every((f) => v[f].trim() !== '' && !Number.isNaN(Number(v[f])));

  const pick = (f: File | undefined) => {
    if (!f) return setFile(undefined);
    if (f.size > MAX_INLINE_BYTES) {
      setFile({ name: f.name, type: f.type });
      setFileNote(t('inbody.fileLarge'));
      return;
    }
    const r = new FileReader();
    r.onload = () => { setFile({ name: f.name, type: f.type, dataUrl: String(r.result) }); setFileNote(''); };
    r.readAsDataURL(f);
  };

  const save = () => {
    const n = (f: InBodyField) => Number(v[f]) || 0;
    const weightKg = n('weightKg');
    const fatPct = n('fatPct');
    const fatKg = v.fatKg.trim() ? n('fatKg') : Math.round(weightKg * fatPct) / 100;
    addInBodyScan({
      traineeId: trainee.id, date, source: 'coach', file,
      weightKg, muscleKg: n('muscleKg'), fatPct, fatKg,
      bmi: v.bmi.trim() ? n('bmi') : Math.round((weightKg / (trainee.heightCm / 100) ** 2) * 10) / 10,
      visceral: n('visceral'), bmr: n('bmr'), waterL: n('waterL'), score: n('score'),
    });
    toast(t('inbody.saved'));
    onClose();
  };

  return (
    <Modal wide title={t('inbody.uploadTitle', { name: trainee.firstName })} onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button><button type="button" className="btn primary" disabled={!valid} onClick={save}>{t('inbody.saveScan')}</button></>}>
      <div className="form-grid">
        <label className="field">{t('inbody.file')}
          <input className="input" type="file" accept="application/pdf,image/*" style={{ paddingTop: 8 }} onChange={(e) => pick(e.target.files?.[0])} />
          <span className="xs muted">{fileNote || t('inbody.fileHint')}</span>
        </label>
        <label className="field">{t('inbody.scanDate')}<input className="input" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <span className="section-label">{t('inbody.values')}</span>
        <span className="xs muted">{last ? t('inbody.prefilled') : t('inbody.enterValues')}</span>
      </div>
      <div className="ib-form">
        {INBODY_FIELDS.map((f) => (
          <label key={f} className="field">
            <span>{t(`inbody.f.${f}`)}{INBODY_UNIT[f] && <span className="faint"> ({INBODY_UNIT[f]})</span>}{required.includes(f) && ' *'}</span>
            <input className="input mono" type="number" step="any" min={0} value={v[f]} onChange={(e) => setV((x) => ({ ...x, [f]: e.target.value }))} />
          </label>
        ))}
      </div>
    </Modal>
  );
}
