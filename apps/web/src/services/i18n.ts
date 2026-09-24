import { settings, setSettings, persistState } from '../db/localDb';
import { translations, TranslationDict, Language } from '@byapar/core';

export const currentLang = (): Language => settings.lang || 'en';

export const t = (key: keyof TranslationDict, fallback?: string): string => {
  const lang = currentLang();
  const dict = translations[lang] || translations.en;
  return dict[key] || fallback || (translations.en[key] ?? key);
};

export const toggleLanguage = () => {
  setSettings((draft) => {
    draft.lang = draft.lang === 'ne' ? 'en' : 'ne';
  });
  persistState();
};

export const setLanguage = (lang: Language) => {
  setSettings((draft) => {
    draft.lang = lang;
  });
  persistState();
};
