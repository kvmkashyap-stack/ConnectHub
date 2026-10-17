'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  darkStyle: 'twitter', // 'twitter' | 'instagram' | 'navy'
  lightStyle: 'soft', // 'soft' | 'warm' | 'sky'
  accent: 'blue', // 'blue' | 'purple' | 'pink' | 'mint' | 'orange'
  fontSize: 'medium', // 'small' | 'medium' | 'large'
  reducedMotion: false,
  highContrast: false,
  setTheme: () => {},
  setDarkStyle: () => {},
  setLightStyle: () => {},
  setAccent: () => {},
  setFontSize: () => {},
  setReducedMotion: () => {},
  setHighContrast: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');
  const [darkStyle, setDarkStyleState] = useState('twitter');
  const [lightStyle, setLightStyleState] = useState('soft');
  const [accent, setAccentState] = useState('blue');
  const [fontSize, setFontSizeState] = useState('medium');
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [highContrast, setHighContrastState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('connecthub_theme') || 'dark';
      const savedDarkStyle = localStorage.getItem('connecthub_dark_style') || 'twitter';
      const savedLightStyle = localStorage.getItem('connecthub_light_style') || 'soft';
      const savedAccent = localStorage.getItem('connecthub_accent') || 'blue';
      const savedFontSize = localStorage.getItem('connecthub_font_size') || 'medium';
      const savedMotion = localStorage.getItem('connecthub_reduced_motion') === 'true';
      const savedContrast = localStorage.getItem('connecthub_high_contrast') === 'true';

      setThemeState(savedTheme);
      setDarkStyleState(savedDarkStyle);
      setLightStyleState(savedLightStyle);
      setAccentState(savedAccent);
      setFontSizeState(savedFontSize);
      setReducedMotionState(savedMotion);
      setHighContrastState(savedContrast);
    } catch (e) {
      console.warn('Storage not accessible:', e);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;

    // Resolve system theme if selected
    let effectiveTheme = theme;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = prefersDark ? 'dark' : 'light';
    }

    root.setAttribute('data-theme', effectiveTheme);
    root.setAttribute('data-dark-style', darkStyle);
    root.setAttribute('data-light-style', lightStyle);
    root.setAttribute('data-accent', accent);
    root.setAttribute('data-font', fontSize);
    root.setAttribute('data-motion', reducedMotion ? 'reduced' : 'normal');
    root.setAttribute('data-contrast', highContrast ? 'high' : 'normal');

    try {
      localStorage.setItem('connecthub_theme', theme);
      localStorage.setItem('connecthub_dark_style', darkStyle);
      localStorage.setItem('connecthub_light_style', lightStyle);
      localStorage.setItem('connecthub_accent', accent);
      localStorage.setItem('connecthub_font_size', fontSize);
      localStorage.setItem('connecthub_reduced_motion', String(reducedMotion));
      localStorage.setItem('connecthub_high_contrast', String(highContrast));
    } catch (e) {
      console.warn('Could not save theme:', e);
    }
  }, [theme, darkStyle, lightStyle, accent, fontSize, reducedMotion, highContrast, mounted]);

  const setTheme = (t) => setThemeState(t);
  const setDarkStyle = (s) => setDarkStyleState(s);
  const setLightStyle = (s) => setLightStyleState(s);
  const setAccent = (a) => setAccentState(a);
  const setFontSize = (f) => setFontSizeState(f);
  const setReducedMotion = (m) => setReducedMotionState(m);
  const setHighContrast = (c) => setHighContrastState(c);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        darkStyle,
        lightStyle,
        accent,
        fontSize,
        reducedMotion,
        highContrast,
        setTheme,
        setDarkStyle,
        setLightStyle,
        setAccent,
        setFontSize,
        setReducedMotion,
        setHighContrast,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
