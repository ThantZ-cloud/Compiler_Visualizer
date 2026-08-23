import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolve(theme: Theme): 'light' | 'dark' {
  return theme;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('cv-theme') as Theme | null;
    return stored && ['light', 'dark'].includes(stored) ? stored : 'dark';
  });

  const [resolvedTheme, setResolved] = useState<'light' | 'dark'>(() => resolve(theme));

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('cv-theme', t);
  }, []);

  // Apply data-theme attribute and listen for system changes
  useEffect(() => {
    const r = resolve(theme);
    setResolved(r);
    document.documentElement.setAttribute('data-theme', r);
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
