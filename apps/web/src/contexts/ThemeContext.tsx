"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark'); // Default to dark mode
  const [mounted, setMounted] = useState(false);

  // Resolve the saved theme and apply the document class in the same pass that
  // flips `mounted`, so the class is on <html> before any child renders.
  // The .dark class reselects the palette tokens in globals.css, which every
  // component styles through, so no component needs a dark: variant.
  useEffect(() => {
    const savedTheme = localStorage.getItem('figurdle-theme') as Theme;
    const initialTheme = savedTheme ?? 'dark';
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    setTheme(initialTheme);
    setMounted(true);
  }, []);

  // Persist and apply later theme changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('figurdle-theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      isDark: theme === 'dark'
    }}>
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