import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { translations, languages } from '../i18n';
import { getUserProfile, saveUserProfile } from '../services/userProfileService';
import type { UserProfile } from '../types';

type LanguageCode = keyof typeof languages;

interface LanguageContextType {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: string, defaultVal?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LanguageCode>(() => {
    const savedProfile = getUserProfile();
    if (savedProfile?.language && languages[savedProfile.language]) {
        return savedProfile.language;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
        const storedLang = window.localStorage.getItem('language');
        if (storedLang && languages[storedLang as LanguageCode]) {
            return storedLang as LanguageCode;
        }
    }
    return 'en';
  });

  useEffect(() => {
    try {
        window.localStorage.setItem('language', lang);
    } catch (e) {
        console.error("Failed to save language to localStorage", e);
    }
  }, [lang]);
  
  const setLang = useCallback((newLang: LanguageCode) => {
    if(languages[newLang]) {
        setLangState(newLang);
        // Save to user profile
        saveUserProfile({ language: newLang });
    }
  }, []);

  const t = useCallback((key: string, defaultVal?: string): string => {
    const keys = key.split('.');

    const getTranslation = (languageCode: LanguageCode): string | undefined => {
        let result: any = translations[languageCode];
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = result[k];
            } else {
                return undefined;
            }
        }
        return typeof result === 'string' ? result : undefined;
    };

    const translatedText = getTranslation(lang);
    if (translatedText !== undefined) {
        return translatedText;
    }

    if (lang !== 'en') {
        const fallbackText = getTranslation('en');
        if (fallbackText !== undefined) {
            return fallbackText;
        }
    }

    return defaultVal ?? key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};