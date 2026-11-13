// Testimonials as they actually arrive: trainee messages from the coach's
// inbox (shared with permission), each typing in before it appears. Then the FAQ.

import type { CSSProperties } from 'react';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import { useCoach } from '../../coach/kit';
import { Reveal, RevealItem, SectionHeader } from '../../components/ui';

export function Inbox() {
  const { t } = useI18n();
  const { p, L, first } = useCoach();
  return (
    <section id="inbox" className="s-section s-section--tint cp-inbox" aria-labelledby="cp-inbox-title">
      <div className="s-container">
        <SectionHeader id="cp-inbox-title" eyebrow={t('site.cp.inbox.eyebrow')} title={t('site.cp.inbox.title', { name: first })} />
        <ul className="cp-msgs">
          {p.inbox.map((m, i) => (
            <RevealItem key={i} delay={(i % 3) * 120} className="cp-msg" style={{ '--i': i % 3 } as CSSProperties}>
              <span className="cp-msg-av" aria-hidden="true">{L(m.from).slice(0, 1)}</span>
              <div className="cp-msg-body">
                <div className="cp-msg-meta">
                  <b>{L(m.from)}</b>
                  <span>{t('site.cp.results.week', { n: m.week })}</span>
                </div>
                <div className="cp-bubble">
                  <span className="cp-typing" aria-hidden="true"><i /><i /><i /></span>
                  <p>{L(m.text)}</p>
                </div>
                {m.pr && <span className="cp-pr"><Icon name="trophy" size={13} strokeWidth={2.2} />{t('site.feat.v.pr')}</span>}
              </div>
            </RevealItem>
          ))}
        </ul>
        <p className="cp-note">{t('site.cp.inbox.consent')}</p>
      </div>
    </section>
  );
}

export function Faq() {
  const { t } = useI18n();
  const { p, L } = useCoach();
  return (
    <section id="faq" className="s-section cp-faq" aria-labelledby="cp-faq-title">
      <div className="s-container cp-faq-grid">
        <SectionHeader id="cp-faq-title" align="start" eyebrow={t('site.cp.faq.eyebrow')} title={t('site.cp.faq.title')} />
        <Reveal className="cp-faq-list" delay={100}>
          {p.faq.map((f, i) => (
            <details key={i}>
              <summary>{L(f.q)}<span className="cp-faq-icon" aria-hidden="true" /></summary>
              <p>{L(f.a)}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
