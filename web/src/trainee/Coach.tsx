import { useEffect, useRef, useState } from 'react';
import { markCoachMessagesSeen, sendTraineeMessage } from '../data/actions';
import { useAppState } from '../data/store';
import { Icon } from '../components/Icon';
import { useT } from '../i18n';
import { fmtAgo, fmtStamp } from '../lib/dates';
import { TabScreen, useTraineeApp } from './TraineeApp';

/** Chat with the coach, plus the notes the coach chose to share. */
export function CoachScreen() {
  const t = useT();
  const state = useAppState();
  const { trainee } = useTraineeApp();
  const [view, setView] = useState<'chat' | 'notes'>('chat');
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const msgs = state.messages.filter((m) => m.traineeId === trainee.id).sort((a, b) => a.at.localeCompare(b.at));
  const notes = state.notes.filter((n) => n.traineeId === trainee.id && n.shared).sort((a, b) => b.at.localeCompare(a.at));
  const coachFirst = state.coach.name.split(' ')[0];

  useEffect(() => { markCoachMessagesSeen(trainee.id); }, [trainee.id, msgs.length]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length, view]);

  const send = () => {
    if (!text.trim()) return;
    sendTraineeMessage(trainee.id, text.trim());
    setText('');
  };

  return (
    <TabScreen
      title={state.coach.name}
      sub={state.coach.title}
      footer={view === 'chat' ? (
        <div className="ta-compose">
          <input value={text} placeholder={t('ta.coach.placeholder', { name: coachFirst })} aria-label={t('ta.coach.placeholder', { name: coachFirst })} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
          <button type="button" className="ta-send" aria-label={t('ta.coach.send')} disabled={!text.trim()} onClick={send}><Icon name="send" size={17} /></button>
        </div>
      ) : undefined}
      action={<span className="avatar" style={{ width: 40, height: 40, background: '#17181c', color: '#fff', fontSize: 13 }}>{state.coach.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>}
    >
      <div className="ta-seg" role="tablist">
        <button type="button" role="tab" aria-selected={view === 'chat'} className={view === 'chat' ? 'on' : ''} onClick={() => setView('chat')}>{t('ta.coach.chat')}</button>
        <button type="button" role="tab" aria-selected={view === 'notes'} className={view === 'notes' ? 'on' : ''} onClick={() => setView('notes')}>{t('ta.coach.notes', { n: notes.length })}</button>
      </div>

      {view === 'chat' ? (
        <>
          <div className="ta-chat" style={{ padding: 0 }}>
            {msgs.length === 0 && <p className="small muted" style={{ textAlign: 'center', padding: 20 }}>{t('ta.coach.empty', { name: coachFirst })}</p>}
            {msgs.map((m) => (
              <div key={m.id} className="stack" style={{ gap: 3, alignItems: m.from === 'trainee' ? 'flex-end' : 'flex-start' }}>
                <div className={`bubble ${m.from === 'trainee' ? 'me' : 'them'}`} dir="auto">{m.text}</div>
                <span className="xs faint">{fmtStamp(m.at)}</span>
              </div>
            ))}
            <div ref={end} />
          </div>
        </>
      ) : (
        <>
          {notes.map((n) => (
            <section key={n.id} className="ta-note">
              <span className="xs faint">{fmtAgo(n.at)}</span>
              <p style={{ lineHeight: 1.55, fontSize: 14 }}>{n.text}</p>
            </section>
          ))}
          {notes.length === 0 && <p className="small muted" style={{ textAlign: 'center', padding: 20 }}>{t('ta.coach.noNotes')}</p>}
        </>
      )}
    </TabScreen>
  );
}
