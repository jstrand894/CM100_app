import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemePref = 'system' | 'light' | 'dark';
export const THEME_KEY = 'cm100.theme';

// Storage keys owned by other screens, listed here so Settings can reset them.
export const PLANNER_KEYS = ['cm100.liveLogs'];
export const GOAL_KEYS = ['cm100.goalMinutes'];
export const GEAR_KEYS = ['cm100.gear.v1'];
export const CACHE_KEYS = ['cm100.news.cache', 'cm100.weather.v1'];

// react-native-web has no setColorScheme, so there the phone's own setting always applies.
export const applyTheme = (pref: ThemePref) => Appearance.setColorScheme?.(pref === 'system' ? 'unspecified' : pref);

export async function loadThemePref(): Promise<ThemePref> {
  try {
    const v = await AsyncStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}
