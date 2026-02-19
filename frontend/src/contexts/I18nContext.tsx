import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Language, getLocale, defaultLocale, isValidLocale } from '../i18n';
import { TranslationSchema } from '../i18n/types';

const STORAGE_KEY = 'claude-viewer-locale';

interface I18nContextType {
  locale: Language;
  setLocale: (locale: Language | ((prev: Language) => Language)) => void;
  toggleLocale: () => void;
  t: TranslationSchema;
  isZhCN: boolean;
  isEn: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// 从 localStorage 获取语言设置
const getStoredLocale = (): Language | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidLocale(stored)) {
      return stored as Language;
    }
  } catch {
    // 忽略 localStorage 错误
  }
  return null;
};

// 保存语言设置到 localStorage
const storeLocale = (locale: Language): void => {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // 忽略 localStorage 错误
  }
};

// 检测浏览器语言偏好
const getBrowserLocale = (): Language => {
  if (typeof navigator === 'undefined') {
    return defaultLocale;
  }

  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage;

  if (!browserLang) {
    return defaultLocale;
  }

  // 精确匹配
  if (isValidLocale(browserLang)) {
    return browserLang as Language;
  }

  // 模糊匹配 (e.g., 'zh-CN' matches 'zh')
  const langPrefix = browserLang.split('-')[0].toLowerCase();
  if (langPrefix === 'zh') {
    return 'zh-CN';
  }
  if (langPrefix === 'en') {
    return 'en';
  }

  return defaultLocale;
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Language>(() => {
    return getStoredLocale() || getBrowserLocale();
  });

  const setLocale = useCallback((newLocale: Language | ((prev: Language) => Language)) => {
    setLocaleState((prev) => {
      const resolvedLocale = typeof newLocale === 'function' ? newLocale(prev) : newLocale;
      storeLocale(resolvedLocale);
      // 设置 html lang 属性
      document.documentElement.lang = resolvedLocale === 'zh-CN' ? 'zh-CN' : 'en';
      return resolvedLocale;
    });
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === 'zh-CN' ? 'en' : 'zh-CN'));
  }, [setLocale]);

  // 初始化时设置 html lang 属性
  useEffect(() => {
    document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : 'en';
  }, [locale]);

  const t = useMemo(() => getLocale(locale), [locale]);

  const isZhCN = locale === 'zh-CN';
  const isEn = locale === 'en';

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
      isZhCN,
      isEn,
    }),
    [locale, setLocale, toggleLocale, t, isZhCN, isEn]
  );

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// 兼容旧版 useTranslation 导出
export const useTranslation = useI18n;
