import { useColorScheme } from 'react-native';

const light = {
  bg: '#f6f4ef',
  card: '#ffffff',
  text: '#1d2a22',
  muted: '#6a7469',
  border: '#e0ddd3',
  accent: '#c2410c',
  accentText: '#ffffff',
  green: '#2f6b4f',
  amber: '#b7791f',
  red: '#b91c1c',
};

const dark: typeof light = {
  bg: '#12171a',
  card: '#1b2226',
  text: '#eef1ee',
  muted: '#98a39a',
  border: '#2a3338',
  accent: '#f97316',
  accentText: '#1a1006',
  green: '#6fcf97',
  amber: '#f5c15c',
  red: '#f87171',
};

export type Theme = typeof light;
export const useTheme = (): Theme => (useColorScheme() === 'dark' ? dark : light);
