import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';
export type ThemePreference = Theme | 'system';

interface ThemeContextType {
  /** The theme actually applied right now */
  theme: Theme;
  /** What the user chose (may be "system") */
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const systemTheme = (): Theme =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem('occupra_theme');
      if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    } catch (_) {}
    return 'dark';
  });
  const [system, setSystem] = useState<Theme>(systemTheme);

  // Follow OS changes while "system" is selected
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!mq) return;
    const onChange = () => setSystem(mq.matches ? 'light' : 'dark');
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const theme: Theme = preference === 'system' ? system : preference;

  useEffect(() => {
    try {
      localStorage.setItem('occupra_theme', preference);
    } catch (_) {}
  }, [preference]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light-mode', theme === 'light');
    root.classList.toggle('dark-mode', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setPreference(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
