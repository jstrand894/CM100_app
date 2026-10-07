import { useColorScheme } from 'react-native';

// Brand colors sampled from the race logo: deep mountain blue and burnt orange.
const light = {
  bg: '#f3f5f7',
  card: '#ffffff',
  text: '#13222c',
  muted: '#5f6f7a',
  border: '#e1e6ea',
  primary: '#0e5479',
  primarySoft: '#e3eef5',
  accent: '#e0661a',
  accentSoft: '#fdeadc',
  accentText: '#ffffff',
  green: '#2f6b4f',
  amber: '#b7791f',
  red: '#b91c1c',
};

const dark: typeof light = {
  bg: '#0d1418',
  card: '#162026',
  text: '#eef3f6',
  muted: '#93a4af',
  border: '#24313a',
  primary: '#63b4e0',
  primarySoft: '#173544',
  accent: '#f58a3c',
  accentSoft: '#3a2616',
  accentText: '#1a1006',
  green: '#6fcf97',
  amber: '#f5c15c',
  red: '#f87171',
};

export type Theme = typeof light;
export const useTheme = (): Theme => (useColorScheme() === 'dark' ? dark : light);

// Logo and hero stay the same in both modes.
export const BRAND_BLUE = '#0b4a6b';
