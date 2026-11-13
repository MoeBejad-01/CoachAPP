// Scroll handling for the public site's routes (not the coach dashboard or
// trainee app): a new page starts at the top, and `/#section` links from other
// pages land on that section. Lives outside <Routes> so switching language,
// which remounts the routes, doesn't move the page.

import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollManager() {
  const { pathname, hash, key } = useLocation();
  const lastKey = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (lastKey.current === key) return;
    const isFirst = lastKey.current === null;
    lastKey.current = key;
    if (pathname.startsWith('/coach') || pathname.startsWith('/app')) return;
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    } else if (!isFirst) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname, hash, key]);

  return null;
}
