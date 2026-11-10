import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { DICTIONARIES, ENGLISH, LANGUAGES, LangCode, TKey } from '../i18n/translations';

interface LanguageContextType {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: TKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const STORAGE_KEY = 'occupra_lang';

const initialLang = (): LangCode => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as LangCode | null;
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch (_) {}
  return 'en';
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<LangCode>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang; // lets the browser pick the right fonts / screen-reader voice
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {}
  }, [lang]);

  const t = useCallback((key: TKey) => DICTIONARIES[lang][key] ?? ENGLISH[key] ?? key, [lang]);

  return <LanguageContext.Provider value={{ lang, setLang: setLangState, t }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
