import React, { createContext, useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type Language = 'en' | 'my';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();

  const language = (i18n.language || 'en') as Language;

  const setLanguage = useCallback((lang: Language) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('cv-lang', lang);
  }, [i18n]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
