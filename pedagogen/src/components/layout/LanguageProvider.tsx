'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type UILanguage = 'fr' | 'ar';

interface LanguageContextType {
  lang: UILanguage;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'fr',
  toggle: () => {},
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<UILanguage>('fr');

  useEffect(() => {
    const stored = localStorage.getItem('pedagogen_lang') as UILanguage | null;
    if (stored) setLang(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('pedagogen_lang', lang);
  }, [lang]);

  const toggle = () => setLang((prev) => (prev === 'fr' ? 'ar' : 'fr'));

  return (
    <LanguageContext.Provider value={{ lang, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}
