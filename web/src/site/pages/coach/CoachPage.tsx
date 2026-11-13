// A coach's public page at /c/<handle>: the link a coach sends to prospective
// trainees. Everything comes from the coach's profile (site/coach/types.ts);
// sections show in the order the coach picked and only when they have content.

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { useI18n } from '../../../i18n';
import type { StringKey } from '../../../i18n/strings';
import { CoachCtx, makeCoachKit, useCoach } from '../../coach/kit';
import type { CoachProfile, CoachSection } from '../../coach/types';
import { Dumbbell3D } from '../../components/Dumbbell';
import { LogoMark } from '../../components/Logo';
import { SiteShell } from '../../components/SiteShell';
import { LanguageSwitch, ThemeToggle } from '../../components/Toggles';
import { Reveal, cx } from '../../components/ui';
import { getSession } from '../../services/auth';
import { getCoachProfile, saveCoachProfile } from '../../services/coachProfiles';
import { NotFoundPage } from '../NotFoundPage';
import { Method, Numbers, Story } from './About';
import { JumpLink, useMonth } from './bits';
import { CoachHero, CoachAvatar } from './Hero';
import { Faq, Inbox } from './Inbox';
import { IntroCall } from './IntroCall';
import { Platform } from './Platform';
import { Plans } from './Plans';
import { Programs } from './Programs';
import { Results } from './Results';
import '../../coach.css';

const SECTIONS: Record<CoachSection, ComponentType> = {
  numbers: Numbers, story: Story, platform: Platform, results: Results, method: Method,
  programs: Programs, plans: Plans, inbox: Inbox, intro: IntroCall, faq: Faq,
};

/** Whether a section has anything to show for this coach. */
function hasContent(p: CoachProfile, s: CoachSection): boolean {
  switch (s) {
    case 'numbers': return p.stats.length > 0;
    case 'story': return !!p.story;
    case 'platform': return !!p.platform?.lifts.length;
    case 'results': return p.results.length > 0;
    case 'method': return p.method.length > 0;
    case 'programs': return p.programs.length > 0;
    case 'plans': return p.plans.length > 0;
    case 'inbox': return p.inbox.length > 0;
    case 'intro': return !!p.introCall && Object.values(p.introCall.slots).some((s) => s?.length);
    case 'faq': return p.faq.length > 0;
  }
}

/** Header links, for the sections this coach shows. */
const LINKS: { section: CoachSection; id: string; label: StringKey }[] = [
  { section: 'story', id: 'about', label: 'site.cp.nav.about' },
  { section: 'results', id: 'results', label: 'site.cp.nav.results' },
  { section: 'programs', id: 'programs', label: 'site.cp.nav.programs' },
  { section: 'plans', id: 'plans', label: 'site.cp.nav.plans' },
  { section: 'faq', id: 'faq', label: 'site.cp.nav.faq' },
];

type Load = { status: 'loading' } | { status: 'missing' } | { status: 'ok'; profile: CoachProfile };

export function CoachPage() {
  const { handle = '' } = useParams();
  const { t, lang } = useI18n();
  const [load, setLoad] = useState<Load>({ status: 'loading' });

  useEffect(() => {
    let live = true;
    getCoachProfile(handle).then((profile) => {
      if (live) setLoad(profile ? { status: 'ok', profile } : { status: 'missing' });
    });
    return () => { live = false; };
  }, [handle]);

  const kit = useMemo(() => {
    if (load.status !== 'ok') return null;
    const update = (next: CoachProfile) => {
      setLoad({ status: 'ok', profile: next });
      return saveCoachProfile(next);
    };
    return makeCoachKit(load.profile, lang, t, { owner: getSession()?.accountId === load.profile.id, update });
  }, [load, lang, t]);

  useEffect(() => {
    if (!kit) return;
    const before = document.title;
    document.title = `${kit.name} · Coach HQ`;
    return () => { document.title = before; };
  }, [kit]);

  if (load.status === 'missing') return <NotFoundPage />;
  if (!kit) return <SiteShell className="cp"><main id="main" className="cp-loading" /></SiteShell>;

  const shown = kit.p.sections.filter((s) => hasContent(kit.p, s));
  return (
    <CoachCtx.Provider value={kit}>
      <SiteShell className="cp">
        <CoachHeader shown={shown} />
        <main id="main" tabIndex={-1}>
          <CoachHero />
          {shown.map((s) => {
            const Section = SECTIONS[s];
            return <Section key={s} />;
          })}
          {shown.length === 0 ? <EmptyPage /> : <CoachCta />}
        </main>
        <CoachFooter />
        {kit.p.plans.length > 0 && <JoinBar />}
      </SiteShell>
    </CoachCtx.Provider>
  );
}

function ShareButton({ withLabel }: { withLabel?: boolean }) {
  const { t } = useI18n();
  const { name } = useCoach();
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const share = async () => {
    const url = window.location.href.split('#')[0];
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} · Coach HQ`, url });
      } catch {
        // Closed the share sheet.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked: nothing more to do.
    }
  };

  const label = t(copied ? 'site.cp.copied' : 'site.cp.share');
  return withLabel ? (
    <button type="button" className="s-btn s-btn--lg s-btn--onDarkGhost" onClick={share}>
      <Icon name={copied ? 'check' : 'share'} size={18} strokeWidth={2} />{t(copied ? 'site.cp.copied' : 'site.cp.sharePage')}
    </button>
  ) : (
    <button type="button" className={cx('s-icon-btn', copied && 'is-done')} onClick={share} aria-label={label} title={label}>
      <Icon name={copied ? 'check' : 'share'} size={18} />
      <span className="sr-only" aria-live="polite">{copied ? label : ''}</span>
    </button>
  );
}

function CoachHeader({ shown }: { shown: CoachSection[] }) {
  const { t, lang, setLang } = useI18n();
  const { name, p } = useCoach();
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={cx('s-nav cp-nav', solid && 'is-solid')}>
      <div className="s-container s-nav-in">
        <JumpLink to="top" className="cp-id">
          <CoachAvatar size={32} />
          <span>{name}</span>
        </JumpLink>
        <nav className="s-nav-links" aria-label={t('site.cp.nav.label')}>
          <ul>
            <li><Link to="/" className="s-nav-link">{t('site.nav.homeLink')}</Link></li>
            {LINKS.filter((l) => shown.includes(l.section)).map((l) => (
              <li key={l.id}><JumpLink to={l.id} className="s-nav-link">{t(l.label)}</JumpLink></li>
            ))}
          </ul>
        </nav>
        <div className="s-nav-tools">
          <LanguageSwitch className="s-wide-only" />
          <ThemeToggle className="s-wide-only" />
          <button type="button" className="s-icon-btn cp-lang" lang={lang === 'ar' ? 'en' : 'ar'}
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} aria-label={t('site.lang.label')}>
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
          <ShareButton />
          {p.plans.length > 0 && <JumpLink to="plans" className="s-btn s-btn--primary s-btn--sm">{t('site.cp.joinShort')}</JumpLink>}
        </div>
      </div>
    </header>
  );
}

function CoachCta() {
  const { t } = useI18n();
  const { first, p, count } = useCoach();
  const open = p.capacity ? Math.max(0, p.capacity.total - p.capacity.taken) : null;
  const month = useMonth();
  return (
    <section className="cp-cta" aria-labelledby="cp-cta-title">
      <div className="s-container">
        <Reveal className="cp-cta-card">
          <div className="cp-cta-glow" aria-hidden="true" />
          <div className="cp-cta-copy">
            <h2 id="cp-cta-title">{t('site.cp.cta.title')}</h2>
            {open !== null && <p>{open ? count('site.cp.spots', open, { month }) : t('site.cp.full')}</p>}
            <div className="cp-cta-actions">
              {p.plans.length > 0 && (
                <JumpLink to="plans" className="s-btn s-btn--lg s-btn--onDark">{t('site.cp.trainWith', { name: first })}</JumpLink>
              )}
              <ShareButton withLabel />
            </div>
          </div>
          <Dumbbell3D className="cp-cta-3d" />
        </Reveal>
      </div>
    </section>
  );
}

function EmptyPage() {
  const { t } = useI18n();
  const { first } = useCoach();
  return (
    <section className="s-section cp-empty">
      <div className="s-container">
        <p>{t('site.cp.empty', { name: first })}</p>
      </div>
    </section>
  );
}

function CoachFooter() {
  const { t } = useI18n();
  const { p, name } = useCoach();
  const icons = { instagram: 'instagram', youtube: 'youtube', x: 'xLogo', linkedin: 'linkedin' } as const;
  const names = { instagram: 'Instagram', youtube: 'YouTube', x: 'X', linkedin: 'LinkedIn' } as const;
  return (
    <footer className="s-footer cp-footer">
      <div className="s-container cp-footer-in">
        <div className="cp-footer-me">
          <p>{t('site.cp.rights', { year: new Date().getFullYear(), name })}</p>
          {p.socials.length > 0 && (
            <ul className="s-socials">
              {p.socials.map((s) => (
                <li key={s.network}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="s-icon-btn" aria-label={t('site.cp.socialOn', { name, network: names[s.network] })}>
                    <Icon name={icons[s.network]} size={18} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="cp-footer-tools">
          <LanguageSwitch />
          <ThemeToggle />
          <Link to="/" className="cp-powered">
            {t('site.cp.powered')}
            <LogoMark size={20} />
            <span lang="en" dir="ltr">Coach HQ</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}

/** Phone-width bar that keeps the plans one tap away once the hero scrolls off. */
function JoinBar() {
  const { t } = useI18n();
  const { p, money } = useCoach();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.getElementById('top');
    const plans = document.getElementById('plans');
    if (!hero) return;
    let pastHero = false;
    let atPlans = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) pastHero = !e.isIntersecting && e.boundingClientRect.top < 0;
        if (e.target === plans) atPlans = e.isIntersecting;
      }
      setShow(pastHero && !atPlans);
    });
    io.observe(hero);
    if (plans) io.observe(plans);
    return () => io.disconnect();
  }, []);
  const from = Math.min(...p.plans.map((x) => x.pricePerMonth));
  return (
    <div className={cx('cp-joinbar', show && 'is-shown')} aria-hidden={!show} inert={!show}>
      <CoachAvatar size={36} />
      <span className="cp-joinbar-text">{t('site.cp.from', { price: money(from) })}</span>
      <JumpLink to="plans" className="s-btn s-btn--primary s-btn--sm">{t('site.cp.joinShort')}</JumpLink>
    </div>
  );
}
