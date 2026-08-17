import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, user, updateSettings } = useAuth();
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  // Sync from user settings when available
  useEffect(() => {
    if (settings?.theme) {
      setThemeState(settings.theme);
    } else if (!user) {
      // Pre-auth: check localStorage or system preference
      const stored = localStorage.getItem('theme') as Theme | null;
      const sys = (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') as Theme;
      setThemeState(stored ?? sys);
    }
  }, [settings?.theme, user]);

  // Resolve system theme + listen for OS changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const compute = () => {
      if (theme === 'system') {
        const r = mq.matches ? 'dark' : 'light';
        setResolved(r);
        applyTheme(r);
      } else {
        setResolved(theme);
        applyTheme(theme);
      }
    };
    compute();
    mq.addEventListener('change', compute);
    return () => mq.removeEventListener('change', compute);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('theme', t);
    if (user && settings) {
      updateSettings({ theme: t }).catch(() => {});
    }
  }, [user, settings, updateSettings]);

  const toggle = useCallback(() => {
    setTheme(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
