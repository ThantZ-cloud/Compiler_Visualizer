import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** The resolved theme after applying system preference */
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function resolve(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('cv-theme') as Theme | null;
    return stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'dark';
  });

  const [resolvedTheme, setResolved] = useState<'light' | 'dark'>(() => resolve(theme));

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('cv-theme', t);
  }, []);

  // Apply data-theme attribute and listen for system changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');

    const apply = () => {
      const r = resolve(theme);
      setResolved(r);
      document.documentElement.setAttribute('data-theme', r);
    };

    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
