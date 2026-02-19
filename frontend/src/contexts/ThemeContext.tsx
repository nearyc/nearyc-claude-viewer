import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { applyTheme, themes } from '../styles/themes';
import type { ThemeId } from '../styles/themes';

const STORAGE_KEY = 'claude-viewer-theme';

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId | ((prev: ThemeId) => ThemeId)) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isEyeCare: boolean;
  isLightEyeCare: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 从 localStorage 获取主题设置
const getStoredTheme = (): ThemeId | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === 'dark' || stored === 'eyeCare' || stored === 'lightEyeCare')) {
      return stored as ThemeId;
    }
  } catch {
    // 忽略 localStorage 错误
  }
  return null;
};

// 保存主题设置到 localStorage
const storeTheme = (theme: ThemeId): void => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // 忽略 localStorage 错误
  }
};

// 检测系统主题偏好
const getSystemTheme = (): ThemeId => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'dark'; // 默认深色主题
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    return getStoredTheme() || getSystemTheme();
  });

  // 应用主题
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeId | ((prev: ThemeId) => ThemeId)) => {
    setThemeState((prev) => {
      const resolvedTheme = typeof newTheme === 'function' ? newTheme(prev) : newTheme;
      storeTheme(resolvedTheme);
      return resolvedTheme;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      if (prev === 'dark') return 'eyeCare';
      if (prev === 'eyeCare') return 'lightEyeCare';
      return 'dark';
    });
  }, [setTheme]);

  const isDark = theme === 'dark';
  const isEyeCare = theme === 'eyeCare';
  const isLightEyeCare = theme === 'lightEyeCare';

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark,
      isEyeCare,
      isLightEyeCare,
    }),
    [theme, setTheme, toggleTheme, isDark, isEyeCare, isLightEyeCare]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// 保留旧版兼容
export const themeColors = {
  dark: {
    bg: {
      primary: 'bg-gray-950',
      secondary: 'bg-gray-900',
      tertiary: 'bg-gray-800',
      card: 'bg-gray-900/80',
      hover: 'hover:bg-gray-800',
    },
    text: {
      primary: 'text-gray-100',
      secondary: 'text-gray-300',
      tertiary: 'text-gray-400',
      muted: 'text-gray-500',
    },
    border: {
      primary: 'border-gray-800',
      secondary: 'border-gray-700',
      accent: 'border-gray-600',
    },
    scrollbar: {
      track: '#1e293b',
      thumb: '#475569',
      thumbHover: '#64748b',
    },
  },
};

export function useThemeColors() {
  return themeColors.dark;
}

export { themes, ThemeId };
