import { useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import type { StringKey } from '../../../i18n/strings';
import { useCoach } from '../../coach/kit';
import { HEAD, SHAPES, SILHOUETTE } from '../../components/anatomy/shapes';
import { cx } from '../../components/ui';
import { useReducedMotion } from '../../motion';
import { PhotoUploadError, uploadCoachPhoto, type PhotoError } from '../../services/coachProfiles';
import { JumpLink, useMonth } from './bits';

const MIRROR = 'matrix(-1 0 0 1 200 0)';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** The coach's photo, or their initials until they upload one. */
export function CoachAvatar({ size }: { size: number }) {
  const { p } = useCoach();
  return p.photo ? (
    <img className="cp-avatar" src={p.photo} alt="" width={size} height={size} />
  ) : (
    <span className="cp-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true" lang="en">
      {initials(p.name.en)}
    </span>
  );
}

export function CoachHero() {
  const { t } = useI18n();
  const { p, L, name, first, count, num } = useCoach();
  const [, ...rest] = name.split(/\s+/);

  return (
    <section id="top" className="cp-hero" aria-labelledby="cp-name">
      <div className="cp-hero-bg" aria-hidden="true" />
      <div className="s-container cp-hero-in">
        <div className="cp-hero-copy">
          <Availability />
          {(L(p.title) || L(p.location)) && (
            <p className="cp-role">
              {L(p.title) || t('site.cp.defaultTitle')}
              {L(p.location) && <span><Icon name="pin" size={15} strokeWidth={2} />{L(p.location)}</span>}
            </p>
          )}
          <h1 id="cp-name" className="cp-name">
            <span>{first}</span> {rest.length > 0 && <span className="s-grad-text">{rest.join(' ')}</span>}
          </h1>
          {L(p.tagline) && <p className="cp-tagline">{L(p.tagline)}</p>}
          <div className="cp-hero-ctas">
            {p.plans.length > 0 && <JumpLink to="plans" className="s-btn s-btn--primary s-btn--lg">{t('site.cp.trainWith', { name: first })}</JumpLink>}
            {p.introCall && (
              <JumpLink to="intro" className="s-btn s-btn--ghost s-btn--lg">
                {t('site.cp.introCta')}<Icon name="arrow" size={18} strokeWidth={2} />
              </JumpLink>
            )}
          </div>
          <ul className="cp-trust">
            {p.rating && (
              <li><Icon name="star" size={16} strokeWidth={2} /><b>{num(p.rating.score, 1)}</b>{count('site.cp.reviews', p.rating.count)}</li>
            )}
            {p.languages.length > 0 && <li><Icon name="translate" size={16} />{p.languages.map(L).join(' · ')}</li>}
            {p.responseTime && <li><Icon name="clock" size={16} />{L(p.responseTime)}</li>}
          </ul>
        </div>
        <Portrait />
      </div>
    </section>
  );
}

/** "3 spots open for November", with a slot meter: taken slots solid, open ones glowing. */
function Availability() {
  const { t } = useI18n();
  const { p, count } = useCoach();
  const month = useMonth();
  if (!p.capacity) return null;
  const { total, taken } = p.capacity;
  const open = Math.max(0, total - taken);
  return (
    <p className={cx('cp-avail', open === 0 && 'is-full')}>
      <span className="cp-slots" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => <i key={i} className={i >= taken ? 'open' : undefined} />)}
      </span>
      {open ? count('site.cp.spots', open, { month }) : t('site.cp.full')}
    </p>
  );
}

/** Portrait card that tilts toward the pointer, with the first stats floating in front of it. */
function Portrait() {
  const { t } = useI18n();
  const { p, L, name, num, owner } = useCoach();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`);
    ref.current.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
    ref.current.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`);
    ref.current.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const leave = () => {
    ['--rx', '--ry', '--gx', '--gy'].forEach((v) => ref.current?.style.removeProperty(v));
  };

  return (
    <div className="cp-hero-visual">
      <div ref={ref} className="cp-tilt" onPointerMove={move} onPointerLeave={leave}>
        <div className={cx('cp-portrait', !p.photo && 'is-default')}>
          {p.photo ? <img src={p.photo} alt={t('site.cp.portrait', { name })} /> : <PortraitArt />}
          <div className="cp-portrait-glare" aria-hidden="true" />
          <div className="cp-portrait-tag">
            <b>{name}</b>
            {L(p.title) && <span>{L(p.title)}</span>}
          </div>
        </div>
        {p.stats.slice(0, 3).map((s, i) => (
          <div key={i} className={`cp-float cp-float--${i}`} style={{ '--i': i } as CSSProperties}>
            <b><span dir="ltr">{s.prefix}{num(s.value)}{s.suffix}</span></b>
            <span>{L(s.label)}</span>
          </div>
        ))}
      </div>
      {owner && <PhotoControls />}
    </div>
  );
}

const PHOTO_ERRORS: Record<PhotoError, StringKey> = {
  type: 'site.cp.photo.errType',
  size: 'site.cp.photo.errSize',
  read: 'site.cp.photo.errRead',
};

/** For the coach on their own page: upload a photo, or go back to the default picture. */
function PhotoControls() {
  const { t } = useI18n();
  const { p, update } = useCoach();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);

  const upload = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const photo = await uploadCoachPhoto(file);
      if (!update({ ...p, photo })) setError('site.cp.photo.errSave');
    } catch (e) {
      setError(e instanceof PhotoUploadError ? PHOTO_ERRORS[e.code] : 'site.cp.photo.errRead');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cp-photo-tools">
      <div className="cp-photo-btns">
        <label className={cx('s-btn s-btn--secondary s-btn--sm', busy && 'is-busy')}>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy}
            onChange={(e) => upload(e.currentTarget)} />
          {busy ? <span className="s-spinner" aria-hidden="true" /> : <Icon name="camera" size={16} />}
          {t(busy ? 'site.cp.photo.uploading' : p.photo ? 'site.cp.photo.change' : 'site.cp.photo.add')}
        </label>
        {p.photo && !busy && (
          <button type="button" className="s-btn s-btn--ghost s-btn--sm" onClick={() => { setError(null); update({ ...p, photo: undefined }); }}>
            {t('site.cp.photo.useDefault')}
          </button>
        )}
      </div>
      {error ? <p className="s-err" role="alert"><Icon name="alert" size={14} strokeWidth={2} />{t(error)}</p>
        : <p className="cp-photo-hint">{t('site.cp.photo.hint')}</p>}
    </div>
  );
}

/**
 * The default picture, for coaches who haven't added a photo or prefer not to:
 * the site's anatomy figure, cropped to the chest up, drawn as a lit hologram
 * over their initials.
 */
function PortraitArt() {
  const { p } = useCoach();
  const uid = `pa${useId().replace(/[^\w-]/g, '')}`;
  const lit = new Set(['chest', 'shoulders']);
  return (
    <svg className="cp-art" viewBox="30 6 140 175" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".5" />
          <stop offset="1" stopColor="#fff" stopOpacity=".06" />
        </linearGradient>
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <text className="cp-art-mono" x="100" y="128" textAnchor="middle">{initials(p.name.en)}</text>
      <g fill={`url(#${uid}-skin)`}>
        <ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} />
        <path d={SILHOUETTE} />
        <path d={SILHOUETTE} transform={MIRROR} />
      </g>
      {Object.entries(SHAPES.front).map(([group, paths]) => (
        <g key={group} className={lit.has(group) ? 'cp-art-lit' : 'cp-art-muscle'} filter={lit.has(group) ? `url(#${uid}-glow)` : undefined}>
          {paths!.flatMap((d, i) => [<path key={`${i}l`} d={d} />, <path key={`${i}r`} d={d} transform={MIRROR} />])}
        </g>
      ))}
    </svg>
  );
}
