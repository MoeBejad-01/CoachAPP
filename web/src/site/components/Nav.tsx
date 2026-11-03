// Top navigation: transparent over the hero, frosted glass once the page
// scrolls. Below the desktop breakpoint the links move into a full-screen sheet.

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { useI18n } from '../../i18n';
import { NAV_LINKS, type SectionId } from '../config/site';
import { prefersReducedMotion } from '../motion';
import { Logo } from './Logo';
import { LanguageSwitch, ThemeToggle } from './Toggles';
import { ButtonLink, cx } from './ui';

const DESKTOP = window.matchMedia('(min-width: 1080px)');

/** Smooth-scrolls to a homepage section and moves focus there. */
export function scrollToSection(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(history.state, '', `#${id}`);
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  return true;
}

/** A link to a homepage section: scrolls in place on the homepage, navigates there from other pages. */
export function SectionLink({ id, className, children, onNavigate, current }: {
  id: SectionId;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
  current?: boolean;
}) {
  const { pathname } = useLocation();
  if (pathname !== '/') {
    return <Link to={`/#${id}`} className={className} onClick={onNavigate}>{children}</Link>;
  }
  return (
    <a href={`#${id}`} className={className} aria-current={current ? 'true' : undefined}
      onClick={(e) => {
        e.preventDefault();
        onNavigate?.();
        // Let a closing menu release the scroll lock first.
        requestAnimationFrame(() => scrollToSection(id));
      }}>
      {children}
    </a>
  );
}

export function Nav() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the link for the section in the middle of the screen.
  useEffect(() => {
    if (!onHome) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    document.querySelectorAll('main section[id]').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [onHome]);

  useLayoutEffect(() => {
    if (!open) return;
    document.documentElement.classList.add('s-locked');
    return () => document.documentElement.classList.remove('s-locked');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    sheet.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      menuBtn.current?.focus();
    };
    const onWide = () => { if (DESKTOP.matches) setOpen(false); };
    document.addEventListener('keydown', onKey);
    DESKTOP.addEventListener('change', onWide);
    return () => {
      document.removeEventListener('keydown', onKey);
      DESKTOP.removeEventListener('change', onWide);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <header className={cx('s-nav', (scrolled || open) && 'is-solid', open && 'is-open')}>
        <div className="s-container s-nav-in">
          <Logo onClick={close} />
          <nav className="s-nav-links" aria-label={t('site.nav.label')}>
            <ul>
              {NAV_LINKS.map((l) => (
                <li key={l.id}>
                  <SectionLink id={l.id} className="s-nav-link" current={active === l.id}>{t(l.label)}</SectionLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="s-nav-tools">
            <LanguageSwitch className="s-wide-only" />
            <ThemeToggle className="s-wide-only" />
            <Link to="/login" className="s-nav-login s-wide-only">{t('site.nav.login')}</Link>
            <ButtonLink to="/signup" size="sm" className="s-nav-cta">{t('site.nav.getStarted')}</ButtonLink>
            <button ref={menuBtn} type="button" className="s-icon-btn s-nav-menu" aria-expanded={open} aria-controls="s-sheet"
              aria-label={t(open ? 'site.nav.menuClose' : 'site.nav.menuOpen')} onClick={() => setOpen(!open)}>
              <Icon name={open ? 'x' : 'menu'} size={20} />
            </button>
          </div>
        </div>
      </header>

      <div id="s-sheet" ref={sheet} className={cx('s-sheet', open && 'is-open')} hidden={!open}>
        <nav aria-label={t('site.nav.label')}>
          <ul className="s-sheet-links">
            {NAV_LINKS.map((l, i) => (
              <li key={l.id} style={{ '--i': i } as CSSProperties}>
                <SectionLink id={l.id} onNavigate={close}>{t(l.label)}</SectionLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="s-sheet-tools">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
        <div className="s-sheet-actions">
          <ButtonLink to="/login" variant="secondary" size="lg" block onClick={close}>{t('site.nav.login')}</ButtonLink>
          <ButtonLink to="/signup" size="lg" block onClick={close}>{t('site.nav.getStarted')}</ButtonLink>
        </div>
      </div>
    </>
  );
}
