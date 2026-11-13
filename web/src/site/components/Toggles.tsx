import { Icon } from '../../components/Icon';
import { useI18n } from '../../i18n';
import { useTheme } from '../theme';
import { cx } from './ui';

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const { theme, toggle } = useTheme();
  const label = t(theme === 'dark' ? 'site.theme.toLight' : 'site.theme.toDark');
  return (
    <button type="button" className={cx('s-icon-btn', className)} onClick={toggle} aria-label={label} title={label}>
      <span key={theme} className="s-theme-icon"><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} /></span>
    </button>
  );
}

export function LanguageSwitch({ className }: { className?: string }) {
  const { t, lang, setLang } = useI18n();
  return (
    <div className={cx('s-seg', className)} role="group" aria-label={t('site.lang.label')}>
      <button type="button" lang="en" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
      <button type="button" lang="ar" aria-pressed={lang === 'ar'} onClick={() => setLang('ar')}>عربي</button>
    </div>
  );
}
