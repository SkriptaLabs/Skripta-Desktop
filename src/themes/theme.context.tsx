import { createContext, useContext, createSignal, createEffect, ParentComponent } from 'solid-js';
import type { ThemeMode } from './theme.types';
import { THEME_STORAGE_KEY } from './theme.types';

// Import all theme CSS files
import './light.css';
import './dark.css';
import './high-contrast.css';
import './deuteranopia.css';
import './protanopia.css';
import './tritanopia.css';

interface ThemeContextType {
  theme: () => ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>();

export const ThemeProvider: ParentComponent = (props) => {
  // Get initial theme from localStorage or default to system preference
  const getInitialTheme = (): ThemeMode => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isValidTheme(stored)) {
      return stored as ThemeMode;
    }
    // Default to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const [theme, setThemeSignal] = createSignal<ThemeMode>(getInitialTheme());

  const setTheme = (newTheme: ThemeMode) => {
    setThemeSignal(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  // Apply theme to document
  createEffect(() => {
    const currentTheme = theme();
    document.documentElement.setAttribute('data-theme', currentTheme);
  });

  const value: ThemeContextType = {
    theme,
    setTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {props.children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

function isValidTheme(value: string): boolean {
  return ['light', 'dark', 'high-contrast', 'deuteranopia', 'protanopia', 'tritanopia'].includes(value);
}
