import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  DEFAULT_LANGUAGE,
  getActiveLanguage,
  getText,
  setActiveLanguage,
  type Language,
} from '../narration/fr';

export const LANGUAGE_STORAGE_KEY = 'circuits-de-zap:language';

export interface LanguageOption {
  id: Language;
  label: string;
  short: string;
  locale: string;
}

export const LANGUAGES: readonly LanguageOption[] = [
  { id: 'fr', label: 'Français', short: 'FR', locale: 'fr-FR' },
  { id: 'en', label: 'English', short: 'EN', locale: 'en-US' },
  { id: 'zh', label: '中文', short: '中文', locale: 'zh-CN' },
];

export const LANGUAGE_LOCALES: Record<Language, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  zh: 'zh-CN',
};

function isLanguage(value: unknown): value is Language {
  return value === 'fr' || value === 'en' || value === 'zh';
}

function readStoredLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

interface LanguageContextValue {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  locale: LANGUAGE_LOCALES[DEFAULT_LANGUAGE],
  setLanguage: () => undefined,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  // The translation proxies read this module value during render. Setting it
  // before the children render keeps the switch synchronous and reload-free.
  if (getActiveLanguage() !== language) {
    setActiveLanguage(language);
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Private browsing: the in-memory choice still lasts for this session.
    }

    document.documentElement.lang =
      language === 'zh' ? 'zh-CN' : language;
    document.title = getText('home.title');
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setActiveLanguage(next);
    setLanguageState(next);
  }, []);

  const value = useMemo(
    () => ({
      language,
      locale: LANGUAGE_LOCALES[language],
      setLanguage,
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
