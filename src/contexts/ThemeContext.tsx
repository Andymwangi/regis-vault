// contexts/ThemeContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  fontSize: number;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with defaults or stored values
  const [theme, setThemeState] = useState<Theme>('system');
  const [fontSize, setFontSizeState] = useState(16);

  // Load saved settings on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    const savedFontSize = localStorage.getItem('fontSize');
    
    if (savedTheme) {
      setThemeState(savedTheme);
    }
    
    if (savedFontSize) {
      setFontSizeState(parseInt(savedFontSize, 10));
    }
  }, []);

  // Apply theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Add transitioning class for smooth theme changes
    root.classList.add('transitioning-theme');
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      // For system theme, don't add any class, let the media query handle it
      localStorage.setItem('theme', 'system');
    } else {
      // For explicit theme choice, add the appropriate class
      root.classList.add(theme);
      localStorage.setItem('theme', theme);
    }
    
    // Remove transition class after animation completes
    setTimeout(() => {
      root.classList.remove('transitioning-theme');
    }, 300);
  }, [theme]);

  // Apply font size changes
  useEffect(() => {
    // Set the base font size on the root element
    document.documentElement.style.fontSize = `${fontSize}px`;
    
    // Also set a CSS variable for scaling other elements
    document.documentElement.style.setProperty('--font-scale', (fontSize / 16).toString());
    
    localStorage.setItem('fontSize', fontSize.toString());
  }, [fontSize]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setFontSize = (size: number) => {
    setFontSizeState(size);
  };

  return (
    <ThemeContext.Provider value={{ theme, fontSize, setTheme, setFontSize }}>
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