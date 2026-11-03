// Stylised screenshots of the real product inside device frames: the coach
// dashboard in a laptop and the trainee app in a phone. Pure markup, so they
// stay sharp, follow the language and weigh nothing.

import { Icon, type IconName } from '../../components/Icon';
import { useI18n } from '../../i18n';
import type { StringKey } from '../../i18n/strings';

export function LaptopFrame({ label }: { label: string }) {
  return (
    <figure className="laptop" role="img" aria-label={label}>
      <div className="laptop-screen">
        <span className="laptop-cam" />
        <div className="laptop-display" aria-hidden="true"><DashboardMock /></div>
      </div>
      <div className="laptop-base"><span /></div>
    </figure>
  );
}

export function PhoneFrame({ label }: { label: string }) {
  return (
    <figure className="phone" role="img" aria-label={label}>
      <div className="phone-display" aria-hidden="true">
        <span className="phone-island" />
        <TraineeMock />
      </div>
    </figure>
  );
}

const DASH_NAV: [IconName, StringKey][] = [
  ['grid', 'nav.overview'],
  ['users', 'nav.trainees'],
  ['clipboard', 'nav.programs'],
  ['message', 'nav.messages'],
  ['calendar', 'nav.calendar'],
  ['card', 'nav.billing'],
];

const ATTENTION: [StringKey, StringKey, 'warn' | 'ok' | 'info', number][] = [
  ['site.mock.r1', 'site.mock.r1f', 'warn', 2],
  ['site.mock.r2', 'site.mock.r2f', 'ok', 0],
  ['site.mock.r3', 'site.mock.r3f', 'info', 4],
];

const WEEK = [72, 88, 64, 92, 80, 96, 70];

function DashboardMock() {
  const { t } = useI18n();
  return (
    <div className="dm">
      <aside className="dm-side">
        <div className="dm-brand"><span className="dm-mark">C</span><span lang="en" dir="ltr">Coach HQ</span></div>
        <ul>
          {DASH_NAV.map(([icon, key], i) => (
            <li key={key} className={i === 0 ? 'on' : undefined}><Icon name={icon} size={13} />{t(key)}</li>
          ))}
        </ul>
      </aside>
      <div className="dm-main">
        <div className="dm-head">
          <div>
            <span className="dm-sub">{t('site.mock.greeting')}</span>
            <b>{t('nav.overview')}</b>
          </div>
          <span className="dm-btn"><Icon name="plus" size={11} strokeWidth={2.5} />{t('common.newTrainee')}</span>
        </div>
        <div className="dm-kpis">
          <div><span>{t('site.mock.k1')}</span><b>24</b><i className="up">+3</i></div>
          <div><span>{t('site.mock.k2')}</span><b>87%</b><i className="up">+5%</i></div>
          <div><span>{t('site.mock.k3')}</span><b>18/21</b><i>{t('site.mock.k3d')}</i></div>
        </div>
        <div className="dm-grid">
          <div className="dm-card">
            <div className="dm-card-title">{t('site.mock.attention')}</div>
            {ATTENTION.map(([name, flag, tone, tint]) => (
              <div key={name} className="dm-row">
                <span className={`dm-av t${tint}`}>{t(name).slice(0, 1)}</span>
                <span className="dm-name">{t(name)}</span>
                <span className={`dm-flag ${tone}`}>{t(flag)}</span>
              </div>
            ))}
          </div>
          <div className="dm-card">
            <div className="dm-card-title">{t('site.mock.weekly')}</div>
            <div className="dm-bars">
              {WEEK.map((v, i) => <span key={i} style={{ blockSize: `${v}%` }} className={i === 5 ? 'hi' : undefined} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SESSION: [StringKey, string, boolean][] = [
  ['site.tmock.e1', '4 × 6', true],
  ['site.tmock.e2', '4 × 8', true],
  ['site.tmock.e3', '3 × 8', false],
];

const TABS: IconName[] = ['grid', 'clipboard', 'chart', 'message', 'user'];

function TraineeMock() {
  const { t } = useI18n();
  return (
    <div className="tm">
      <div className="tm-status" dir="ltr"><span>9:41</span><span className="tm-signal"><i /><i /><i /></span></div>
      <div className="tm-scroll">
        <div className="tm-head">
          <span className="tm-sub">{t('site.tmock.today')}</span>
          <b>{t('site.tmock.session')}</b>
        </div>
        <div className="tm-video">
          <span className="tm-play"><Icon name="play" size={16} /></span>
          <span className="tm-video-label">{t('site.tmock.video')}</span>
          <span className="tm-video-bar"><span /></span>
        </div>
        <ul className="tm-list">
          {SESSION.map(([key, sets, done]) => (
            <li key={key}>
              <span className={done ? 'tm-check on' : 'tm-check'}>{done && <Icon name="check" size={11} strokeWidth={3} />}</span>
              <span className="tm-ex">{t(key)}</span>
              <span className="tm-sets" dir="ltr">{sets}</span>
            </li>
          ))}
        </ul>
        <div className="tm-coach">
          <span className="tm-av">O</span>
          <div>
            <b>{t('site.tmock.coach')}</b>
            <p>{t('site.tmock.comment')}</p>
          </div>
        </div>
        <span className="tm-start">{t('site.tmock.start')}</span>
      </div>
      <div className="tm-tabs">
        {TABS.map((icon, i) => <span key={icon} className={i === 0 ? 'on' : undefined}><Icon name={icon} size={16} /></span>)}
      </div>
    </div>
  );
}
