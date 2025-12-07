import React, { createContext, useContext, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'pink' | 'yellow';

interface ThemeContextType {
  theme: Theme;
  accentColor: AccentColor;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', accentColor: 'yellow' });

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  theme: Theme;
  accentColor: AccentColor;
  children: ReactNode;
}

const accentColorMap: Record<AccentColor, string> = {
  purple: '#a855f7',
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f59e0b',
  red: '#ef4444',
  pink: '#ec4899',
  yellow: '#eab308',
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ theme, accentColor, children }) => {
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Apply accent color
  useEffect(() => {
    const root = document.documentElement;
    const color = accentColorMap[accentColor] || accentColorMap.yellow;
    root.style.setProperty('--sn-stylekit-info-color', color);
    root.style.setProperty('--sn-stylekit-accent-color', color);
    root.setAttribute('data-accent', accentColor);
  }, [accentColor]);

  return (
    <ThemeContext.Provider value={{ theme, accentColor }}>
      {children}
    </ThemeContext.Provider>
  );
};
