import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { markThreadRead, sendBroadcast, sendMessage } from '../data/actions';
import { allStats, fullName, threads } from '../data/selectors';
import { useAppState } from '../data/store';
import type { Message } from '../data/types';
import { Icon } from '../components/Icon';
import { Avatar, Empty, GroupChip, Modal, useToast } from '../components/ui';
import { useT } from '../i18n';
import { flagDetail, flagText } from '../i18n/flags';
import { daysBetween, fmtDay, fmtRelativeDay, fmtStamp, fmtTime, todayISO, toISO } from '../lib/dates';

const QUICK = ['chat.quick1', 'chat.quick2', 'chat.quick3'] as const;

export function MessagesPage() {
  const { id } = useParams();
  const state = useAppState();
  const t = useT();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [draft, setDraft] = useState('');
  const [broadcast, setBroadcast] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const list = useMemo(() => threads(state), [state]);
  const stats = useMemo(() => allStats(state), [state]);
  const active = state.trainees.find((x) => x.id === id);
  const msgs = useMemo(() => state.messages.filter((m) => m.traineeId === id).sort((a, b) => a.at.localeCompare(b.at)), [state.messages, id]);

  useEffect(() => {
    if (id) markThreadRead(id);
  }, [id, msgs.length]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [id, msgs.length]);
  useEffect(() => setDraft(''), [id]);

  const firstWithHistory = list.find((x) => x.last)?.trainee.id;
  if (!id && firstWithHistory) return <Navigate to={`/messages/${firstWithHistory}`} replace />;

  const shown = list.filter(({ trainee, last, unread }) => {
    if (onlyUnread && unread === 0) return false;
    if (q) return fullName(trainee).toLowerCase().includes(q.toLowerCase());
    return !!last || trainee.id === id;
  });

  const send = () => {
    if (!id || !draft.trim()) return;
    sendMessage(id, draft.trim());
    setDraft('');
  };

  const s = active ? stats.get(active.id) : undefined;

  return (
    <>
      <header className="page-head">
        <div className="stack">
          <h1 className="page-title">{t('nav.messages')}</h1>
          <p className="muted">{t('chat.subtitle')}</p>
        </div>
        <button type="button" className="btn" onClick={() => setBroadcast(true)}><Icon name="send" size={16} />{t('chat.broadcast')}</button>
      </header>

      <div className="chat">
        <section className="chat-list" aria-label={t('chat.conversations')}>
          <div className="stack" style={{ padding: 14, borderBottom: '1px solid var(--divider)', gap: 10 }}>
            <label className="search" style={{ minWidth: 0, height: 38 }}>
              <Icon name="search" size={15} />
              <span className="sr-only">{t('chat.searchPeople')}</span>
              <input type="search" placeholder={t('chat.searchPeople')} value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <div className="seg" style={{ alignSelf: 'flex-start' }}>
              <button type="button" className={!onlyUnread ? 'on' : ''} onClick={() => setOnlyUnread(false)}>{t('common.all')}</button>
              <button type="button" className={onlyUnread ? 'on' : ''} onClick={() => setOnlyUnread(true)}>{t('chat.unread')}</button>
            </div>
          </div>
          <div className="items">
            {shown.map(({ trainee, last, unread }) => (
              <button key={trainee.id} type="button" className={`convo${trainee.id === id ? ' on' : ''}`} onClick={() => navigate(`/messages/${trainee.id}`)}>
                <Avatar trainee={trainee} size={36} />
                <span className="stack grow" style={{ gap: 3 }}>
                  <span className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="ellipsis" style={{ fontWeight: unread ? 600 : 500 }}>{fullName(trainee)}</span>
                    <span className="xs faint" style={{ whiteSpace: 'nowrap' }}>{last ? fmtStamp(last.at) : ''}</span>
                  </span>
                  <span className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="ellipsis" dir="auto" style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'start' }}>{last ? `${last.from === 'coach' ? t('chat.you') : ''}${last.text}` : t('chat.noMessages')}</span>
                    {unread > 0 && <span className="nav-badge" style={{ background: 'var(--accent)', color: '#fff' }}>{unread}</span>}
                  </span>
                </span>
              </button>
            ))}
            {shown.length === 0 && <Empty>{t('chat.noConversations')}</Empty>}
          </div>
        </section>

        <section className="chat-main" aria-label={t('chat.conversation')}>
          {active ? (
            <>
              <div className="card-head">
                <div className="row" style={{ gap: 12 }}>
                  <Avatar trainee={active} size={36} />
                  <div className="stack" style={{ gap: 1 }}>
                    <span style={{ fontWeight: 600 }}>{fullName(active)}</span>
                    <span className="small muted">{active.program ? `${active.program.name}${s?.week ? ` · ${t('common.weekOf', { w: s.week, n: active.program.weeks })}` : ''}` : t('chat.noProgram')}</span>
                  </div>
                </div>
                <Link to={`/trainees/${active.id}`} className="btn sm">{t('chat.viewProfile')}</Link>
              </div>
              <div className="chat-scroll" ref={scroller}>
                {msgs.map((m, i) => <Bubble key={m.id} m={m} prev={msgs[i - 1]} />)}
                {msgs.length === 0 && <Empty>{t('chat.sayHello', { name: active.firstName })}</Empty>}
              </div>
              <div className="stack" style={{ borderTop: '1px solid var(--divider)', padding: '12px 16px 16px', gap: 10 }}>
                <div className="row wrap" style={{ gap: 6 }}>
                  {QUICK.map((k) => <button key={k} type="button" className="quick" onClick={() => setDraft(t(k))}>{t(k)}</button>)}
                </div>
                <div className="row" style={{ alignItems: 'flex-end' }}>
                  <label className="sr-only" htmlFor="composer">{t('chat.message')}</label>
                  <textarea id="composer" className="textarea" rows={2} placeholder={t('chat.placeholder', { name: active.firstName })} value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} style={{ resize: 'none' }} />
                  <button type="button" className="btn primary" disabled={!draft.trim()} onClick={send}>{t('chat.send')}</button>
                </div>
              </div>
            </>
          ) : <Empty>{t('chat.select')}</Empty>}
        </section>

        {active && s && (
          <aside className="chat-side" aria-label={t('chat.context')}>
            <h2 className="card-title" style={{ fontSize: 14 }}>{t('chat.context')}</h2>
            <dl className="kv">
              <dt>{t('roster.colStatus')}</dt><dd><GroupChip group={s.group} /></dd>
              <dt>{t('roster.colAdherence')}</dt><dd className="mono">{s.adherence === null ? '—' : `${s.adherence}%`}</dd>
              <dt>{t('roster.colLast')}</dt><dd>{fmtRelativeDay(s.lastLog?.date)}</dd>
              <dt>{t('roster.colCheckin')}</dt><dd>{s.missedCheckins ? <span className="warn">{t('common.overdue')}</span> : fmtDay(s.nextCheckin)}</dd>
            </dl>
            {s.flags.length > 0 && (
              <div className="stack" style={{ borderTop: '1px solid var(--divider)', paddingTop: 14, gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{t('chat.flags')}</span>
                {s.flags.map((f) => <span key={f.kind} className="small"><span className="warn">{flagText(t, f)}</span> <span className="muted">· {flagDetail(t, f)}</span></span>)}
              </div>
            )}
            <div className="stack" style={{ borderTop: '1px solid var(--divider)', paddingTop: 14, gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t('chat.pinned')}</span>
              <p className="small" style={{ lineHeight: 1.5, color: 'var(--ink-2)' }}>{active.pinnedNote || t('chat.nothingPinned')}</p>
            </div>
            <div className="stack" style={{ borderTop: '1px solid var(--divider)', paddingTop: 14, gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t('chat.quickActions')}</span>
              <Link to={`/trainees/${active.id}?tab=program`} className="btn sm" style={{ justifyContent: 'flex-start' }}>{t('chat.adjustProgram')}</Link>
              <Link to={`/trainees/${active.id}?tab=notes`} className="btn sm" style={{ justifyContent: 'flex-start' }}>{t('chat.writeNote')}</Link>
              <Link to="/calendar" className="btn sm" style={{ justifyContent: 'flex-start' }}>{t('chat.bookCall')}</Link>
            </div>
          </aside>
        )}
      </div>

      {broadcast && <BroadcastModal onClose={() => setBroadcast(false)} />}
    </>
  );
}

function Bubble({ m, prev }: { m: Message; prev?: Message }) {
  const mine = m.from === 'coach';
  const day = toISO(new Date(m.at));
  const showDay = !prev || toISO(new Date(prev.at)) !== day;
  return (
    <>
      {showDay && <div className="xs faint" style={{ alignSelf: 'center', padding: '4px 0' }}>{daysBetween(day, todayISO()) <= 1 ? fmtRelativeDay(day) : fmtDay(day)}</div>}
      <div className="stack" style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 4 }}>
        <div className={`bubble ${mine ? 'me' : 'them'}`} dir="auto">{m.text}</div>
        <span className="xs faint">{fmtTime(m.at)}</span>
      </div>
    </>
  );
}

function BroadcastModal({ onClose }: { onClose: () => void }) {
  const state = useAppState();
  const t = useT();
  const toast = useToast();
  const [audience, setAudience] = useState<'active' | 'program'>('active');
  const [tplId, setTplId] = useState(state.templates[0]?.id ?? '');
  const [text, setText] = useState('');
  const recipients = state.trainees.filter((x) => x.status === 'active' && (audience === 'active' || x.program?.templateId === tplId));
  const send = () => {
    sendBroadcast(recipients.map((x) => x.id), text.trim());
    toast(t('chat.broadcastSent', { n: recipients.length }));
    onClose();
  };
  return (
    <Modal title={t('chat.broadcastTitle')} onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button><button type="button" className="btn primary" disabled={!text.trim() || recipients.length === 0} onClick={send}>{t('chat.sendTo', { n: recipients.length })}</button></>}>
      <div className="seg" style={{ alignSelf: 'flex-start' }}>
        <button type="button" className={audience === 'active' ? 'on' : ''} onClick={() => setAudience('active')}>{t('chat.allActive')}</button>
        <button type="button" className={audience === 'program' ? 'on' : ''} onClick={() => setAudience('program')}>{t('chat.byProgram')}</button>
      </div>
      {audience === 'program' && (
        <label className="field">{t('roster.colProgram')}
          <select className="select" value={tplId} onChange={(e) => setTplId(e.target.value)}>
            {state.templates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
      )}
      <label className="field">{t('chat.message')}<textarea className="textarea" rows={4} value={text} placeholder={t('chat.broadcastPlaceholder')} onChange={(e) => setText(e.target.value)} /></label>
      <span className="small muted">{t('chat.broadcastNote')}</span>
    </Modal>
  );
}
