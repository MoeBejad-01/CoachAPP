// Small pieces shared by the coach page sections.

import type { ReactNode } from 'react';
import { useCoach } from '../../coach/kit';
import { scrollToSection } from '../../components/Nav';

/** An in-page link that smooth-scrolls to a section of the coach page. */
export function JumpLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return (
    <a href={`#${to}`} className={className} onClick={(e) => { e.preventDefault(); scrollToSection(to); }}>
      {children}
    </a>
  );
}

/** This month's name in the page language. */
export function useMonth() {
  const { numLocale } = useCoach();
  return new Intl.DateTimeFormat(numLocale, { month: 'long' }).format(new Date());
}
