import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { assignTemplate, deleteTemplate, duplicateTemplate, updateTemplate } from '../data/actions';
import { fullName, isActiveStatus } from '../data/selectors';
import { getState, useAppState } from '../data/store';
import type { Template } from '../data/types';
import { Icon } from '../components/Icon';
import { Avatar, Empty, Modal, useToast } from '../components/ui';
import { useT } from '../i18n';
import { addDays, fmtAgo, startOfWeek, todayISO } from '../lib/dates';
import { applyGuide, BasicsStep, InstructionsStep, NutritionStep, RecoveryStep, TrainingStep, type GuidePatch } from './programs/sections';

const EDIT_TABS = ['basics', 'training', 'nutrition', 'recovery', 'instructions'] as const;

export function ProgramsPage() {
  const { id } = useParams();
  const state = useAppState();
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<(typeof EDIT_TABS)[number]>('basics');

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const tr of state.trainees) if (tr.program?.templateId && isActiveStatus(tr)) m.set(tr.program.templateId, (m.get(tr.program.templateId) ?? 0) + 1);
    return m;
  }, [state.trainees]);

  if (!id && state.templates[0]) return <Navigate to={`/programs/${state.templates[0].id}`} replace />;
  const tpl = state.templates.find((x) => x.id === id);
  const set = (patch: Partial<Template>) => tpl && updateTemplate(tpl.id, patch);
  // Read the saved template at call time so quick successive edits all land.
  const setGuide = (patch: GuidePatch) => { const cur = tpl && getState().templates.find((x) => x.id === tpl.id); if (cur) updateTemplate(cur.id, { guide: applyGuide(cur.guide, patch) }); };

  return (
    <>
      <header className="page-head">
        <div className="stack">
          <h1 className="page-title">{t('tpl.title')}</h1>
          <p className="muted">{t('tpl.subtitle')}</p>
        </div>
        <button type="button" className="btn primary" onClick={() => navigate('/programs/new')}>
          <Icon name="plus" size={16} strokeWidth={2} />{t('tpl.new')}
        </button>
      </header>

      <div className="split">
        <section aria-label={t('tpl.list')} className="narrow stack" style={{ gap: 8, flexBasis: 280 }}>
          {state.templates.map((x) => (
            <button key={x.id} type="button" className={`choice${x.id === id ? ' on' : ''}`} style={{ gap: 8 }} onClick={() => navigate(`/programs/${x.id}`)}>
              <span className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
                <span className="t">{x.name}</span>
                <span className="xs muted" style={{ whiteSpace: 'nowrap' }}>{t('tpl.activeCount', { n: usage.get(x.id) ?? 0 })}</span>
              </span>
              {x.summary && <span className="s">{x.summary}</span>}
              <span className="row wrap" style={{ gap: 6 }}>
                <span className="chip" style={{ fontSize: 11.5 }}>{t('tpl.weeksShort', { n: x.weeks })}</span>
                <span className="chip" style={{ fontSize: 11.5 }}>{t('tpl.daysShort', { n: x.days.length })}</span>
                {x.tags.map((g) => <span key={g} className="chip" style={{ fontSize: 11.5 }}>{g}</span>)}
              </span>
            </button>
          ))}
          {state.templates.length === 0 && <div className="card"><Empty>{t('tpl.none')}</Empty></div>}
        </section>

        {tpl ? (
          <>
            <section className="card wide" aria-label={t('tpl.editor')}>
              <div className="card-body" style={{ borderBottom: '1px solid var(--divider)' }}>
                <div className="row wrap" style={{ justifyContent: 'space-between' }}>
                  <div className="stack grow" style={{ gap: 4 }}>
                    <span className="xs faint">{t('tpl.autosaved', { ago: fmtAgo(tpl.updatedAt) })}</span>
                    <span style={{ fontSize: 20, fontWeight: 650, letterSpacing: '-0.02em' }}>{tpl.name || t('tb.untitled')}</span>
                    <span className="row wrap small muted" style={{ gap: 6 }}>
                      <span className="chip accent">{t(`goal.${tpl.guide.goal}`)}</span>
                      <span>{t('tpl.nWeeks', { n: tpl.weeks })} · {t('tb.nDays', { n: tpl.days.length })} · {tpl.guide.calories ? `${tpl.guide.calories.toLocaleString('en')} kcal` : '—'} · {t('tb.sleepShort', { n: tpl.guide.sleepH ?? '—' })} · {t('tb.stepsShort', { n: tpl.guide.steps?.toLocaleString('en') ?? '—' })}</span>
                    </span>
                  </div>
                  <div className="row">
                    <button type="button" className="btn sm" onClick={() => { const nid = duplicateTemplate(tpl.id); if (nid) { navigate(`/programs/${nid}`); toast(t('tpl.duplicated')); } }}><Icon name="copy" size={14} />{t('tpl.duplicate')}</button>
                    <button type="button" className="btn sm danger" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={14} />{t('common.delete')}</button>
                  </div>
                </div>
              </div>
              <div className="tabs" role="tablist" aria-label={t('tb.sections')} style={{ borderTop: 0 }}>
                {EDIT_TABS.map((x) => (
                  <button key={x} type="button" role="tab" aria-selected={tab === x} className={`tab${tab === x ? ' on' : ''}`} onClick={() => setTab(x)}>{t(`tb.step.${x}`)}</button>
                ))}
              </div>
              <div className="tb-step-body" style={{ borderTop: '1px solid var(--divider)' }}>
                {tab === 'basics' && <BasicsStep tpl={tpl} set={set} setGuide={setGuide} />}
                {tab === 'training' && <TrainingStep key={tpl.id} tpl={tpl} set={set} setGuide={setGuide} />}
                {tab === 'nutrition' && <NutritionStep tpl={tpl} set={set} setGuide={setGuide} />}
                {tab === 'recovery' && <RecoveryStep tpl={tpl} set={set} setGuide={setGuide} />}
                {tab === 'instructions' && <InstructionsStep tpl={tpl} set={set} setGuide={setGuide} />}
              </div>
            </section>

            <AssignPanel key={tpl.id} tpl={tpl} />
          </>
        ) : (
          <div className="card wide"><Empty>{t('tpl.select')}</Empty></div>
        )}
      </div>

      {confirmDelete && tpl && (
        <Modal title={t('tpl.deleteTitle')} onClose={() => setConfirmDelete(false)} footer={
          <>
            <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</button>
            <button type="button" className="btn dark" onClick={() => { deleteTemplate(tpl.id); setConfirmDelete(false); navigate('/programs'); toast(t('tpl.deleted')); }}>{t('tpl.deleteConfirm')}</button>
          </>
        }>
          <p>{t('tpl.deleteBody', { name: tpl.name })}</p>
        </Modal>
      )}
    </>
  );
}

function AssignPanel({ tpl }: { tpl: Template }) {
  const state = useAppState();
  const t = useT();
  const toast = useToast();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [start, setStart] = useState(addDays(startOfWeek(todayISO()), 7));

  const candidates = state.trainees
    .filter((tr) => tr.status !== 'inactive')
    .filter((tr) => !q || fullName(tr).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(!!a.program) - Number(!!b.program) || fullName(a).localeCompare(fullName(b)));
  const toggle = (tid: string) => setPicked((s) => {
    const n = new Set(s);
    if (n.has(tid)) n.delete(tid);
    else n.add(tid);
    return n;
  });
  const assign = () => {
    assignTemplate(tpl.id, [...picked], start);
    toast(t('tpl.assignedTo', { n: picked.size }));
    setPicked(new Set());
  };

  return (
    <aside className="card narrow" aria-label={t('tpl.assignTitle')}>
      <div className="card-head">
        <div className="stack" style={{ gap: 2 }}>
          <h2 className="card-title">{t('tpl.assignTitle')}</h2>
          <span className="small muted">{t('tpl.assignHint')}</span>
        </div>
      </div>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--divider)' }}>
        <label className="search" style={{ minWidth: 0, height: 36 }}>
          <Icon name="search" size={15} />
          <span className="sr-only">{t('tpl.findTrainee')}</span>
          <input placeholder={t('tpl.findTrainee')} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {candidates.map((tr) => (
          <label key={tr.id} className="list-row" style={{ cursor: 'pointer', padding: '10px 14px' }}>
            <input type="checkbox" checked={picked.has(tr.id)} onChange={() => toggle(tr.id)} style={{ width: 16, height: 16, margin: 0, accentColor: 'var(--accent)' }} />
            <Avatar trainee={tr} size={28} />
            <span className="stack grow" style={{ gap: 1 }}>
              <span style={{ fontWeight: 500 }}>{fullName(tr)}</span>
              <span className="xs faint ellipsis">{tr.program ? tr.program.name : t('tpl.noProgramYet')}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="card-body" style={{ borderTop: '1px solid var(--divider)' }}>
        <label className="field">{t('form.startDate')}<input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <button type="button" className="btn primary" disabled={picked.size === 0} onClick={assign}>
          {picked.size ? t('tpl.assignN', { n: picked.size }) : t('tpl.selectTrainees')}
        </button>
      </div>
    </aside>
  );
}
