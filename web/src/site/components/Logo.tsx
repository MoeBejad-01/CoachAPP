import { useId } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';

/** The Coach HQ mark: a barbell on the brand gradient. */
export function LogoMark({ size = 28 }: { size?: number }) {
  const grad = `logo${useId().replace(/[^\w-]/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="s-logo-mark">
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0B3D91" />
          <stop offset=".6" stopColor="#007AFF" />
          <stop offset="1" stopColor="#3BA7F2" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${grad})`} />
      <g fill="#fff">
        <rect x="6" y="15" width="20" height="2" rx="1" />
        <rect x="8" y="10" width="3" height="12" rx="1.5" />
        <rect x="21" y="10" width="3" height="12" rx="1.5" />
        <rect x="4.5" y="12.5" width="2.5" height="7" rx="1.25" />
        <rect x="25" y="12.5" width="2.5" height="7" rx="1.25" />
      </g>
      <circle cx="26" cy="7" r="2.2" fill="#7FE7D6" />
    </svg>
  );
}

export function Logo({ onClick }: { onClick?: () => void }) {
  const { t } = useI18n();
  return (
    <Link to="/" className="s-logo" aria-label={t('site.nav.home')} onClick={onClick}>
      <LogoMark />
      <span className="s-logo-word" lang="en" dir="ltr">Coach HQ</span>
    </Link>
  );
}
