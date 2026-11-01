import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setDateLocale } from '../lib/dates';
import { ar, en, type StringKey } from './strings';

export type Lang = 'en' | 'ar';
export type T = (key: StringKey, vars?: Record<string, string | number>) => string;

const KEY = 'coachhq:lang';
const DICTS: Record<Lang, Record<StringKey, string>> = { en, ar };

interface I18n {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (l: Lang) => void;
  t: T;
}

const Ctx = createContext<I18n | null>(null);

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'ar') return saved;
  } catch {
    // ignore
  }
  return navigator.language?.startsWith('ar') ? 'ar' : 'en';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  // Set synchronously so date, number and unit helpers format in the right language on this render.
  setDateLocale(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const t = useCallback<T>((key, vars) => {
    let s = DICTS[lang][key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  }, [lang]);

  const value = useMemo(() => ({ lang, dir, setLang: setLangState, t } as I18n), [lang, dir, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used inside LangProvider');
  return v;
}

export const useT = () => useI18n().t;
