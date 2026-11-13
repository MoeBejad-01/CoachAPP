// People who asked to join from the coach's public page. Each one waits here until the coach
// approves it (which creates the trainee, in onboarding), declines it, or reaches them on
// WhatsApp first. The data comes from Supabase in remote mode; see data/joinRequests.ts.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { approveRequest, declineRequest, frequencyFor, goalTypeFor, whatsappLink } from '../data/joinRequests';
import { TIERS } from '../data/plans';
import { useAppState } from '../data/store';
import { Card, Empty, Modal, useToast } from '../components/ui';
import { Icon } from '../components/Icon';
import { useT } from '../i18n';
import { fmtDay, weekdayName } from '../lib/dates';
import type { JoinRequest, PlanTier } from '../data/types';

type Filter = 'pending' | 'all';

// The public form's values, spelled out so the string keys stay checked.
const PLACES = { gym: 'req.place.gym', home: 'req.place.home', both: 'req.place.both' } as const;
const EXPERIENCE = { new: 'req.exp.new', under1: 'req.exp.under1', one3: 'req.exp.one3', over3: 'req.exp.over3' } as const;
const STARTS = { asap: 'req.start.asap', twoWeeks: 'req.start.twoWeeks', month: 'req.start.month' } as const;
const lookup = <T extends Record<string, string>>(map: T, key: string | undefined) =>
  (key && key in map ? map[key as keyof T] : null);

export function RequestsPage() {
  const state = useAppState();
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('pending');
  const [approving, setApproving] = useState<JoinRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const all = useMemo(() => [...state.joinRequests].sort((a, b) => b.sentAt.localeCompare(a.sentAt)), [state.joinRequests]);
  const pending = all.filter((r) => r.status === 'pending');
  const shown = filter === 'pending' ? pending : all;

  const decline = async (req: JoinRequest) => {
    setBusy(true);
    try {
      await declineRequest(req);
      toast(t('req.declinedToast', { name: req.name }));
    } catch (e) {
      toast(t('req.failed', { msg: e instanceof Error ? e.message : String(e) }));
    }
    setBusy(false);
  };

  const approve = async (req: JoinRequest, tier: PlanTier) => {
    setBusy(true);
    try {
      const id = await approveRequest(req, tier);
      setApproving(null);
      toast(t('req.approvedToast', { name: req.name }));
      navigate(`/trainees/${id}`);
    } catch (e) {
      toast(t('req.failed', { msg: e instanceof Error ? e.message : String(e) }));
    }
    setBusy(false);
  };

  return (
    <>
      <header className="page-head">
        <div className="stack">
          <h1 className="page-title">{t('nav.requests')}</h1>
          <p className="muted">{t('req.subtitle')}</p>
        </div>
        <div className="seg">
          <button type="button" className={filter === 'pending' ? 'on' : ''} onClick={() => setFilter('pending')}>
            {t('req.waiting')} {pending.length > 0 && <span className="mono">{pending.length}</span>}
          </button>
          <button type="button" className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>{t('common.all')}</button>
        </div>
      </header>

      {shown.length === 0 ? (
        <Card><Empty>{filter === 'pending' ? t('req.emptyPending') : t('req.empty')}</Empty></Card>
      ) : (
        <div className="section">
          {shown.map((req) => (
            <RequestCard key={req.id} req={req} busy={busy} onApprove={() => setApproving(req)} onDecline={() => void decline(req)} />
          ))}
        </div>
      )}

      {approving && (
        <ApproveModal req={approving} busy={busy} onClose={() => setApproving(null)} onApprove={(tier) => void approve(approving, tier)} />
      )}
    </>
  );
}

function RequestCard({ req, busy, onApprove, onDecline }: { req: JoinRequest; busy: boolean; onApprove: () => void; onDecline: () => void }) {
  const t = useT();
  const a = req.answers;
  const wa = whatsappLink(req, t('req.waText', { name: req.name.split(' ')[0] }));
  const facts: [string, string][] = [
    [t('req.goal'), t(`goal.${goalTypeFor(a)}`)],
    [t('req.availability'), t('req.daysWeek', { n: frequencyFor(a) })],
    [t('req.place'), lookup(PLACES, a.place) ? t(lookup(PLACES, a.place)!) : '—'],
    [t('req.experience'), lookup(EXPERIENCE, a.experience) ? t(lookup(EXPERIENCE, a.experience)!) : '—'],
    [t('req.start'), lookup(STARTS, a.start) ? t(lookup(STARTS, a.start)!) : '—'],
    [t('req.city'), a.city || '—'],
  ];

  return (
    <Card
      title={
        <span className="row" style={{ gap: 10 }}>
          <span>{req.name}</span>
          {req.status === 'pending'
            ? <span className="chip warn">{t('req.pending')}</span>
            : <span className={`chip ${req.status === 'approved' ? 'ok' : ''}`}>{t(`req.${req.status}`)}</span>}
        </span>
      }
      action={<span className="small muted">{fmtDay(req.sentAt.slice(0, 10))}</span>}
    >
      <div className="card-body">
        <div className="row wrap" style={{ gap: 8 }}>
          <span className="chip outline">{req.email}</span>
          {req.phone && <span className="chip outline mono">+{req.phone}</span>}
          {req.planId && req.planId !== 'unsure' && <span className="chip accent">{t('req.wants', { plan: req.planId })}</span>}
        </div>

        {req.message && <p className="quote">{req.message}</p>}

        <dl className="kv" style={{ gridTemplateColumns: 'auto 1fr auto 1fr' }}>
          {facts.map(([k, v]) => (<span key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></span>))}
        </dl>

        <Body a={a} />
        {(a.painNotes || a.medications) && (
          <div className="tb-warn">
            <span className="row" style={{ gap: 8 }}><Icon name="bolt" size={14} />{[a.painNotes, a.medications].filter(Boolean).join(' · ')}</span>
          </div>
        )}
      </div>

      {req.status === 'pending' && (
        <div className="card-foot">
          {wa
            ? <a className="btn sm" href={wa} target="_blank" rel="noopener noreferrer"><Icon name="message" size={14} />{t('req.whatsapp')}</a>
            : <span className="small faint">{t('req.noPhone')}</span>}
          <span className="row" style={{ gap: 8 }}>
            <button type="button" className="btn sm danger" disabled={busy} onClick={onDecline}>{t('req.decline')}</button>
            <button type="button" className="btn sm primary" disabled={busy} onClick={onApprove}><Icon name="check" size={14} />{t('req.approve')}</button>
          </span>
        </div>
      )}
    </Card>
  );
}

/** Height, weight and target, when the form collected them. */
function Body({ a }: { a: JoinRequest['answers'] }) {
  const t = useT();
  const items: [string, string][] = [];
  if (a.heightCm) items.push([t('form.height'), `${a.heightCm} ${t('unit.cm')}`]);
  if (a.weightKg) items.push([t('form.weight'), `${a.weightKg} ${t('unit.kg')}`]);
  if (a.targetWeightKg) items.push([t('req.target'), `${a.targetWeightKg} ${t('unit.kg')}`]);
  if (a.days?.length) items.push([t('req.canTrain'), a.days.map((d) => weekdayName(d)).join(t('common.comma') + ' ')]);
  if (items.length === 0) return null;
  return (
    <div className="targets">
      {items.map(([k, v]) => (
        <div className="target" key={k}>
          <span className="xs muted">{k}</span>
          <span className="target-v">{v}</span>
        </div>
      ))}
    </div>
  );
}

function ApproveModal({ req, busy, onClose, onApprove }: { req: JoinRequest; busy: boolean; onClose: () => void; onApprove: (tier: PlanTier) => void }) {
  const t = useT();
  const guess = TIERS.includes(req.planId as PlanTier) ? (req.planId as PlanTier) : 'essential';
  const [tier, setTier] = useState<PlanTier>(guess);
  return (
    <Modal
      title={t('req.approveTitle', { name: req.name })}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="btn primary" disabled={busy} onClick={() => onApprove(tier)}>{t('req.createTrainee')}</button>
        </>
      }
    >
      <p className="muted">{t('req.approveBody')}</p>
      <div className="choices">
        {TIERS.map((x) => (
          <button type="button" key={x} className={`choice${tier === x ? ' on' : ''}`} onClick={() => setTier(x)}>
            <span className="t">{t(`tier.${x}`)}</span>
            <span className="s">{t(`tier.${x}.sub`)}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
