import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.json';
import zh from './zh.json';
import ja from './ja.json';

const resources = { en, zh, ja };
const defaultLang = 'en';

export const languageOptions = [
  { value: 'zh', label: zh['lang.zh'] || '中文' },
  { value: 'en', label: en['lang.en'] || 'English' },
  { value: 'ja', label: ja['lang.ja'] || '日本語' },
];

function normalizeLang(input) {
  if (!input || typeof input !== 'string') return defaultLang;
  const lower = input.toLowerCase();
  if (lower.startsWith('zh')) return 'zh';
  if (lower.startsWith('ja')) return 'ja';
  return 'en';
}

function detectInitialLang() {
  try {
    const saved = localStorage.getItem('lang');
    if (saved && resources[saved]) return saved;
  } catch {}
  try {
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || defaultLang;
    const normalized = normalizeLang(nav);
    if (resources[normalized]) return normalized;
  } catch {}
  return defaultLang;
}

function createTranslator(lang) {
  return (key, vars) => {
    const template = resources[lang]?.[key] ?? resources[defaultLang]?.[key] ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
  };
}

const I18nContext = createContext({
  lang: defaultLang,
  t: (key, vars) => createTranslator(defaultLang)(key, vars),
  changeLanguage: () => {},
});

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => detectInitialLang());

  useEffect(() => {
    try {
      localStorage.setItem('lang', lang);
    } catch {}
  }, [lang]);

  const t = useMemo(() => createTranslator(lang), [lang]);

  const value = useMemo(
    () => ({
      lang,
      t,
      changeLanguage: (next) => {
        if (resources[next]) setLang(next);
      },
    }),
    [lang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext);
}
