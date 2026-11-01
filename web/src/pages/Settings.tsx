import { useState } from 'react';
import { updateCoach } from '../data/actions';
import { getState, resetState, useAppState } from '../data/store';
import { Card, Modal, useToast } from '../components/ui';
import { useI18n, type Lang } from '../i18n';

export function SettingsPage() {
  const state = useAppState();
  const { t, lang, setLang } = useI18n();
  const toast = useToast();
  const [f, setF] = useState(state.coach);
  const [confirm, setConfirm] = useState(false);
  const dirty = JSON.stringify(f) !== JSON.stringify(state.coach);

  return (
    <>
      <header className="page-head">
        <div className="stack">
          <h1 className="page-title">{t('nav.settings')}</h1>
          <p className="muted">{t('settings.subtitle')}</p>
        </div>
      </header>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Card title={t('settings.profile')}>
          <div className="card-body">
            <div className="form-grid">
              <label className="field">{t('settings.name')}<input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
              <label className="field">{t('settings.titleField')}<input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
              <label className="field">{t('form.email')}<input className="input" type="email" dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
              <label className="field">{t('settings.business')}<input className="input" value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} /></label>
              <label className="field">{t('settings.currency')}
                <select className="select" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
                  {['USD', 'EUR', 'GBP', 'SAR', 'AED', 'KWD', 'QAR', 'CAD', 'AUD'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="field">{t('settings.language')}
                <select className="select" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
              </label>
            </div>
          </div>
          <div className="card-foot">
            <span className="small muted">{dirty ? t('settings.unsaved') : t('settings.saved')}</span>
            <button type="button" className="btn primary" disabled={!dirty || !f.name.trim()} onClick={() => { updateCoach(f); toast(t('settings.savedToast')); }}>{t('common.save')}</button>
          </div>
        </Card>

        <Card title={t('settings.demo')}>
          <div className="card-body">
            <p className="small muted" style={{ lineHeight: 1.6 }}>{t('settings.demoBody')}</p>
            <dl className="kv">
              <dt>{t('nav.trainees')}</dt><dd className="mono">{state.trainees.length}</dd>
              <dt>{t('settings.templates')}</dt><dd className="mono">{state.templates.length}</dd>
              <dt>{t('settings.workouts')}</dt><dd className="mono">{state.logs.length}</dd>
              <dt>{t('nav.messages')}</dt><dd className="mono">{state.messages.length}</dd>
            </dl>
          </div>
          <div className="card-foot">
            <span />
            <button type="button" className="btn danger" onClick={() => setConfirm(true)}>{t('settings.reset')}</button>
          </div>
        </Card>
      </div>

      {confirm && (
        <Modal title={t('settings.resetTitle')} onClose={() => setConfirm(false)} footer={
          <>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>{t('common.cancel')}</button>
            <button type="button" className="btn dark" onClick={() => { resetState(); setF(getState().coach); setConfirm(false); toast(t('settings.restored')); }}>{t('settings.resetConfirm')}</button>
          </>
        }>
          <p>{t('settings.resetBody')}</p>
        </Modal>
      )}
    </>
  );
}
