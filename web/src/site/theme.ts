// Light/dark theme for the public site (home, login, signup). It follows the
// system setting until the visitor picks one with the toggle; that choice is
// remembered. The colors themselves live in theme.css.

import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'coachhq:theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set<() => void>();

function readSaved(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

let saved = readSaved();
const emit = () => listeners.forEach((l) => l());
media.addEventListener('change', emit);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const current = (): Theme => saved ?? (media.matches ? 'dark' : 'light');

export function setTheme(theme: Theme) {
  saved = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked: the choice lasts for this visit.
  }
  emit();
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, current);
  return { theme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}
