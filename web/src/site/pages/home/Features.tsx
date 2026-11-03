import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import { FEATURES, type FeatureVisual } from '../../config/content';
import { FloatingDumbbell } from '../../components/Dumbbell';
import { RevealItem, SectionHeader, cx } from '../../components/ui';
import { useScrollVar } from '../../motion';

export function Features() {
  const { t } = useI18n();
  const ref = useScrollVar<HTMLElement>();
  return (
    <section ref={ref} id="features" className="s-section features" aria-labelledby="features-title">
      <FloatingDumbbell className="features-db1" size={220} rotate={-18} depth={140} />
      <FloatingDumbbell className="features-db2" size={150} rotate={24} depth={-90} delay={1.5} />
      <div className="s-container">
        <SectionHeader id="features-title" eyebrow={t('site.feat.eyebrow')} title={t('site.feat.title')} lead={t('site.feat.lead')} />
        <ul className="bento">
          {FEATURES.map((f, i) => (
            <RevealItem key={f.id} delay={(i % 4) * 70} className={cx('s-card bento-card', f.size && `bento-card--${f.size}`)}>
              <span className="s-ico s-ico--brand"><Icon name={f.icon} size={22} /></span>
              <h3>{t(f.title)}</h3>
              <p>{t(f.body)}</p>
              {f.visual && <Visual kind={f.visual} />}
            </RevealItem>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Visual({ kind }: { kind: FeatureVisual }) {
  const { t } = useI18n();
  switch (kind) {
    case 'video':
      return (
        <div className="fv fv-video" aria-hidden="true">
          <div className="fv-player">
            <span className="fv-badge">HD</span>
            <span className="fv-play"><Icon name="play" size={22} /></span>
            <div className="fv-caption">
              <b>{t('site.feat.v.video')}</b>
              <span>{t('site.feat.v.sets')}</span>
            </div>
            <span className="fv-progress"><span /></span>
          </div>
          <ul className="fv-queue">
            <li><span className="fv-thumb" />{t('site.feat.v.next1')}</li>
            <li><span className="fv-thumb" />{t('site.feat.v.next2')}</li>
          </ul>
        </div>
      );
    case 'chart':
      return (
        <div className="fv fv-chart" aria-hidden="true">
          <div className="fv-chart-head">
            <span>{t('site.feat.v.chart')}</span>
            <b className="fv-pr">{t('site.feat.v.pr')}</b>
          </div>
          <svg viewBox="0 0 300 90" preserveAspectRatio="none">
            <defs>
              <linearGradient id="fv-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3BA7F2" stopOpacity=".35" />
                <stop offset="1" stopColor="#3BA7F2" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,78 C30,74 50,70 75,62 C100,54 115,58 140,48 C165,38 185,42 210,30 C235,20 260,18 300,8 L300,90 L0,90 Z" fill="url(#fv-area)" />
            <path className="fv-line" d="M0,78 C30,74 50,70 75,62 C100,54 115,58 140,48 C165,38 185,42 210,30 C235,20 260,18 300,8" />
          </svg>
        </div>
      );
    case 'ai':
      return (
        <div className="fv fv-ai" aria-hidden="true">
          <p className="fv-bubble fv-bubble--me">{t('site.feat.v.aiQ')}</p>
          <p className="fv-bubble fv-bubble--ai"><Icon name="sparkles" size={14} />{t('site.feat.v.aiA')}</p>
        </div>
      );
    case 'sync':
      return (
        <div className="fv fv-sync" aria-hidden="true">
          <span className="fv-device fv-device--laptop"><span /></span>
          <span className="fv-sync-dots"><i /><i /><i /></span>
          <span className="fv-device fv-device--phone"><span /></span>
        </div>
      );
    case 'language':
      return (
        <div className="fv fv-lang" aria-hidden="true">
          <span lang="en" dir="ltr">Aa</span>
          <span className="fv-lang-sep" />
          <span lang="ar" dir="rtl">أب</span>
        </div>
      );
    case 'page':
      return (
        <div className="fv fv-page" aria-hidden="true">
          <span className="fv-page-cover" />
          <span className="fv-page-av">O</span>
          <b>{t('site.tmock.coach')}</b>
          <span className="fv-page-tags">{t('site.feat.v.tags')}</span>
        </div>
      );
  }
}
