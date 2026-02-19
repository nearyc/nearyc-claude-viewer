import { zhCN } from './zh-CN';
import { en } from './en';
import { TranslationSchema, Language, LANGUAGE_CONFIG } from '../types';

export const locales: Record<Language, TranslationSchema> = {
  'zh-CN': zhCN,
  'en': en,
};

export const defaultLocale: Language = 'zh-CN';

export const availableLocales = Object.entries(LANGUAGE_CONFIG).map(([id, config]) => ({
  id: id as Language,
  ...config,
}));

export function getLocale(id: Language): TranslationSchema {
  return locales[id] ?? locales[defaultLocale];
}

export function isValidLocale(id: string): id is Language {
  return id in locales;
}

export type { Language, TranslationSchema };
