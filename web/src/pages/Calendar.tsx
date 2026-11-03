import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addSession, deleteSession } from '../data/actions';
import { fullName } from '../data/selectors';
import { useAppState } from '../data/store';
import type { Session } from '../data/types';
import { Icon } from '../components/Icon';
import { Modal, useToast } from '../components/ui';
import { useT } from '../i18n';
import { addDays, fmtDay, fmtDow, fmtShort, startOfWeek, todayISO } from '../lib/dates';

const LOCATIONS: Session['location'][] = ['In person', 'Remote', 'Video call'];

export function CalendarPage() {
  const state = useAppState();
  const t = useT();
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const [creating, setCreating] = useState<string | null>(null);
  const [selected, setSelected] = useState<Session | null>(null);
  const byId = useMemo(() => new Map(state.trainees.map((tr) => [tr.id, tr])), [state.trainees]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekSessions = state.sessions.filter((s) => s.start >= weekStart && s.start < addDays(weekStart, 7));
  const now = new Date().toISOString().slice(0, 16);

  return (
    <>
      <header className="page-head">
        <div className="stack">
          <h1 className="page-title">{t('nav.calendar')}</h1>
          <p className="muted">{fmtShort(days[0])} – {fmtShort(days[6])} · {t('cal.count', { n: weekSessions.length })}</p>
        </div>
        <div className="row wrap">
          <div className="row" style={{ gap: 4 }}>
            <button type="button" className="btn icon" aria-label={t('cal.prev')} onClick={() => setWeekStart(addDays(weekStart, -7))}><Icon name="chevronLeft" /></button>
            <button type="button" className="btn" onClick={() => setWeekStart(startOfWeek(today))}>{t('cal.thisWeek')}</button>
            <button type="button" className="btn icon" aria-label={t('cal.next')} onClick={() => setWeekStart(addDays(weekStart, 7))}><Icon name="chevron" /></button>
          </div>
          <button type="button" className="btn primary" onClick={() => setCreating(days.includes(today) ? today : days[0])}><Icon name="plus" size={16} strokeWidth={2} />{t('cal.new')}</button>
        </div>
      </header>

      <section className="card" aria-label={t('cal.week')}>
        <div className="table-scroll">
          <div className="week-grid" style={{ minWidth: 1050 }}>
            {days.map((d) => {
              const list = weekSessions.filter((s) => s.start.startsWith(d)).sort((a, b) => a.start.localeCompare(b.start));
              return (
                <div key={d} className="week-col">
                  <div className={`week-col-head${d === today ? ' today' : ''}`}>
                    <span className="xs faint">{fmtDow(d)}</span>
                    <span style={{ fontWeight: 600 }}>{fmtShort(d)}</span>
                  </div>
                  {list.map((s) => {
                    const tr = s.traineeId ? byId.get(s.traineeId) : undefined;
                    return (
                      <button key={s.id} type="button" className={`event${s.start < now ? ' past' : ''}`} style={{ borderInlineStart: `3px solid ${s.location === 'In person' ? 'var(--accent)' : '#9a9ca3'}` }} onClick={() => setSelected(s)}>
                        <span className="mono xs faint">{s.start.slice(11, 16)} · {t('common.minutes', { n: s.durationMin })}</span>
                        <span style={{ fontWeight: 500 }} className="ellipsis">{tr ? fullName(tr) : s.title}</span>
                        <span className="xs muted ellipsis">{tr ? s.title : t(`location.${s.location}`)}</span>
                      </button>
                    );
                  })}
                  <button type="button" className="btn ghost sm" style={{ margin: '8px', color: 'var(--faint)' }} onClick={() => setCreating(d)}><Icon name="plus" size={14} />{t('cal.add')}</button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {creating && <NewSessionModal date={creating} onClose={() => setCreating(null)} />}
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)} footer={
          <>
            <button type="button" className="btn danger" style={{ marginInlineEnd: 'auto' }} onClick={() => { deleteSession(selected.id); setSelected(null); }}><Icon name="trash" size={15} />{t('cal.cancelSession')}</button>
            <button type="button" className="btn" onClick={() => setSelected(null)}>{t('common.close')}</button>
          </>
        }>
          <dl className="kv" style={{ gridTemplateColumns: '120px 1fr' }}>
            <dt>{t('roster.colTrainee')}</dt><dd style={{ textAlign: 'start' }}>{selected.traineeId && byId.get(selected.traineeId) ? <Link to={`/coach/trainees/${selected.traineeId}`}>{fullName(byId.get(selected.traineeId)!)}</Link> : '—'}</dd>
            <dt>{t('cal.when')}</dt><dd style={{ textAlign: 'start' }}>{fmtDay(selected.start.slice(0, 10))}{t('common.comma')} {selected.start.slice(11, 16)}</dd>
            <dt>{t('cal.duration')}</dt><dd style={{ textAlign: 'start' }}>{t('common.minutes', { n: selected.durationMin })}</dd>
            <dt>{t('cal.location')}</dt><dd style={{ textAlign: 'start' }}>{t(`location.${selected.location}`)}</dd>
          </dl>
        </Modal>
      )}
    </>
  );
}

function NewSessionModal({ date, onClose }: { date: string; onClose: () => void }) {
  const state = useAppState();
  const t = useT();
  const toast = useToast();
  const people = state.trainees.filter((tr) => tr.status === 'active' || tr.status === 'onboarding').sort((a, b) => fullName(a).localeCompare(fullName(b)));
  const [f, setF] = useState({ traineeId: people[0]?.id ?? '', title: t('cal.defaultTitle'), date, time: '17:00', durationMin: 60, location: 'In person' as Session['location'] });
  const save = () => {
    addSession({ traineeId: f.traineeId || null, title: f.title.trim() || t('cal.defaultTitle'), start: `${f.date}T${f.time}:00`, durationMin: f.durationMin, location: f.location });
    toast(t('cal.booked'));
    onClose();
  };
  return (
    <Modal title={t('cal.new')} onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button><button type="button" className="btn primary" onClick={save}>{t('cal.book')}</button></>}>
      <label className="field">{t('roster.colTrainee')}
        <select className="select" value={f.traineeId} onChange={(e) => setF({ ...f, traineeId: e.target.value })}>
          <option value="">{t('cal.noTrainee')}</option>
          {people.map((tr) => <option key={tr.id} value={tr.id}>{fullName(tr)}</option>)}
        </select>
      </label>
      <label className="field">{t('cal.title')}<input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <label className="field">{t('workouts.date')}<input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
        <label className="field">{t('cal.time')}<input className="input" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></label>
        <label className="field">{t('cal.duration')}
          <select className="select" value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: Number(e.target.value) })}>
            {[30, 45, 60, 75, 90].map((n) => <option key={n} value={n}>{t('common.minutes', { n })}</option>)}
          </select>
        </label>
        <label className="field">{t('cal.location')}
          <select className="select" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value as Session['location'] })}>
            {LOCATIONS.map((l) => <option key={l} value={l}>{t(`location.${l}`)}</option>)}
          </select>
        </label>
      </div>
    </Modal>
  );
}
