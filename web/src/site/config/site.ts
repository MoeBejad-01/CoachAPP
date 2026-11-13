// Site-wide settings for the public website: navigation, contact details and
// social profiles. Text is in i18n/strings.ts under `site.*`.

import type { IconName } from '../../components/Icon';
import type { StringKey } from '../../i18n/strings';

export type SectionId =
  | 'about' | 'services' | 'features' | 'how-it-works'
  | 'for-coaches' | 'for-trainees' | 'pricing' | 'contact';

/** Top navigation, in display order. Each link scrolls to the section with that id. */
export const NAV_LINKS: { id: SectionId; label: StringKey }[] = [
  { id: 'features', label: 'site.nav.features' },
  { id: 'how-it-works', label: 'site.nav.how' },
  { id: 'for-coaches', label: 'site.nav.coaches' },
  { id: 'for-trainees', label: 'site.nav.trainees' },
  { id: 'pricing', label: 'site.nav.pricing' },
  { id: 'about', label: 'site.nav.about' },
  { id: 'contact', label: 'site.nav.contact' },
];

/** Placeholders: replace with the real address and profiles before launch. */
export const CONTACT_EMAIL = 'hello@coachhq.example';

export const SOCIALS: { id: string; name: string; icon: IconName; href: string }[] = [
  { id: 'instagram', name: 'Instagram', icon: 'instagram', href: 'https://instagram.com/' },
  { id: 'x', name: 'X', icon: 'xLogo', href: 'https://x.com/' },
  { id: 'youtube', name: 'YouTube', icon: 'youtube', href: 'https://youtube.com/' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin', href: 'https://linkedin.com/' },
];
