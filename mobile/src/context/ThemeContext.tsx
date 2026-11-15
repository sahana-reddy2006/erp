import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  danger: string;
  warning: string;
}

const LIGHT_COLORS: ThemeColors = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  accent: '#047857',
  accentSoft: '#ECFDF5',
  danger: '#DC2626',
  warning: '#D97706',
};

const DARK_COLORS: ThemeColors = {
  bg: '#020617',
  surface: '#0F172A',
  surfaceAlt: '#1E293B',
  border: '#1E293B',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  accent: '#10B981',
  accentSoft: '#064E3B',
  danger: '#EF4444',
  warning: '#F59E0B',
};

interface ThemeContextValue {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  setMode: (mode: 'light' | 'dark') => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<'light' | 'dark'>(system === 'dark' ? 'dark' : 'light');

  const toggleMode = () => setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider
      value={{
        mode,
        colors: mode === 'dark' ? DARK_COLORS : LIGHT_COLORS,
        setMode,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
