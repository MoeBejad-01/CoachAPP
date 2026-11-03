import { useLayoutEffect, type ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { useTheme } from '../theme';
import '../theme.css';
import '../site.css';
import { cx } from './ui';

/**
 * Root of every public page. Applies the site theme and marks <html> so the
 * page background, color scheme and smooth scrolling match (see theme.css).
 */
export function SiteShell({ className, children }: { className?: string; children: ReactNode }) {
  const { t } = useI18n();
  const { theme } = useTheme();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.site = theme;
    return () => { delete root.dataset.site; };
  }, [theme]);

  return (
    <div className={cx('site', className)} data-theme={theme}>
      <a className="s-skip" href="#main">{t('site.skip')}</a>
      {children}
    </div>
  );
}
