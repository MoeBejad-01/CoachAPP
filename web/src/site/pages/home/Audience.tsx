// "For Coaches" and "For Trainees": benefits beside a device mockup, mirrored.

import type { ReactNode } from 'react';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import type { StringKey } from '../../../i18n/strings';
import { COACH_BENEFITS, TRAINEE_BENEFITS } from '../../config/content';
import { LaptopFrame, PhoneFrame } from '../../components/DeviceMockups';
import { FloatingDumbbell } from '../../components/Dumbbell';
import { ButtonLink, Reveal, RevealItem, SectionHeader, cx } from '../../components/ui';
import { useScrollVar } from '../../motion';

function Split({ id, tone, flip, eyebrow, title, lead, benefits, action, note, visual }: {
  id: string;
  tone?: 'tint';
  flip?: boolean;
  eyebrow: string;
  title: string;
  lead: string;
  benefits: StringKey[];
  action: ReactNode;
  note?: string;
  visual: ReactNode;
}) {
  const { t } = useI18n();
  const ref = useScrollVar<HTMLElement>();
  return (
    <section ref={ref} id={id} className={cx('s-section split', tone && `s-section--${tone}`, flip && 'split--flip')} aria-labelledby={`${id}-title`}>
      <div className="s-container split-grid">
        <div className="split-copy">
          <SectionHeader id={`${id}-title`} align="start" eyebrow={eyebrow} title={title} lead={lead} />
          <ul className="split-list">
            {benefits.map((b, i) => (
              <RevealItem key={b} delay={80 + i * 60}>
                <span className="split-check"><Icon name="check" size={14} strokeWidth={2.75} /></span>
                {t(b)}
              </RevealItem>
            ))}
          </ul>
          <Reveal className="split-actions" delay={200}>
            {action}
            {note && <p className="split-note">{note}</p>}
          </Reveal>
        </div>
        <Reveal className="split-visual" delay={120}>{visual}</Reveal>
      </div>
    </section>
  );
}

export function ForCoaches() {
  const { t } = useI18n();
  return (
    <Split id="for-coaches" eyebrow={t('site.coaches.eyebrow')} title={t('site.coaches.title')} lead={t('site.coaches.lead')}
      benefits={COACH_BENEFITS}
      action={<ButtonLink to="/signup?role=coach" size="lg">{t('site.coaches.cta')}</ButtonLink>}
      visual={<LaptopFrame label={t('site.mock.label')} />} />
  );
}

export function ForTrainees() {
  const { t } = useI18n();
  return (
    <Split id="for-trainees" tone="tint" flip eyebrow={t('site.trainees.eyebrow')} title={t('site.trainees.title')} lead={t('site.trainees.lead')}
      benefits={TRAINEE_BENEFITS}
      action={<ButtonLink to="/signup?role=trainee" size="lg" variant="secondary">{t('site.trainees.cta')}</ButtonLink>}
      note={t('site.trainees.note')}
      visual={
        <div className="split-phone">
          <FloatingDumbbell className="trainees-db1" size={170} rotate={-28} depth={110} />
          <FloatingDumbbell className="trainees-db2" size={120} rotate={16} depth={-70} delay={2} />
          <PhoneFrame label={t('site.tmock.label')} />
        </div>
      } />
  );
}
