import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'dark';

interface ThemeContextType {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState<Theme>('dark');

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme }}>
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

// Theme color configurations
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

// Hook to get current theme colors
export function useThemeColors() {
  return themeColors.dark;
}
