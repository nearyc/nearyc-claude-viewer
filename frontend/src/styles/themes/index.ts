import { darkTheme } from './dark';
import { eyeCareTheme } from './eyeCare';
import { lightEyeCareTheme } from './lightEyeCare';

export const themes = {
  dark: darkTheme,
  eyeCare: eyeCareTheme,
  lightEyeCare: lightEyeCareTheme,
};

export type ThemeId = keyof typeof themes;

export function getThemeCssVars(themeId: ThemeId): Record<string, string> {
  return themes[themeId].cssVars;
}

export function applyTheme(themeId: ThemeId): void {
  const root = document.documentElement;
  const cssVars = getThemeCssVars(themeId);

  Object.entries(cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.setAttribute('data-theme', themeId);
}

export { darkTheme, eyeCareTheme, lightEyeCareTheme };
