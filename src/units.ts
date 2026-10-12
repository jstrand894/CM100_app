import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type UnitSystem = 'imperial' | 'metric';
export const UNITS_KEY = 'cm100.units';

const KM_PER_MI = 1.609344;
const M_PER_FT = 0.3048;

let current: UnitSystem = 'imperial';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

AsyncStorage.getItem(UNITS_KEY)
  .then((v) => {
    if ((v === 'metric' || v === 'imperial') && v !== current) {
      current = v;
      emit();
    }
  })
  .catch(() => {});

export function setUnitSystem(u: UnitSystem) {
  if (u === current) return;
  current = u;
  emit();
  AsyncStorage.setItem(UNITS_KEY, u).catch(() => {});
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Source data is imperial (miles, feet, °F, mph). These convert for display.
export function makeUnits(system: UnitSystem) {
  const metric = system === 'metric';
  const distNum = (mi: number) => round1(metric ? mi * KM_PER_MI : mi);
  const elevNum = (ft: number) => Math.round(metric ? ft * M_PER_FT : ft);
  const tempNum = (f: number) => Math.round(metric ? ((f - 32) * 5) / 9 : f);
  const windNum = (mph: number) => Math.round(metric ? mph * KM_PER_MI : mph);
  const distUnit = metric ? 'km' : 'mi';
  const elevUnit = metric ? 'm' : 'ft';
  return {
    system,
    metric,
    distUnit,
    elevUnit,
    windUnit: metric ? 'km/h' : 'mph',
    distNum,
    /** "12.3 mi" / "19.8 km" */
    dist: (mi: number) => `${distNum(mi)} ${distUnit}`,
    elevNum,
    /** "5,800 ft" / "1,768 m" */
    elev: (ft: number) => `${elevNum(ft).toLocaleString()} ${elevUnit}`,
    /** Elevation without the unit, grouped. */
    elevPlain: (ft: number) => elevNum(ft).toLocaleString(),
    /** "72°" in either system; the unit letter is left off to match the existing look. */
    temp: (f: number) => `${tempNum(f)}°`,
    wind: (mph: number) => `${windNum(mph)} ${metric ? 'km/h' : 'mph'}`,
    /** Rewrites miles, feet, °F and mph inside a sentence when metric is chosen. */
    text: (str: string) => (metric ? metricText(str) : str),
    /** Climbing rate: "320 ft/mi" / "61 m/km" */
    grade: (ft: number, mi: number) => {
      const per = metric ? (ft * M_PER_FT) / (mi * KM_PER_MI) : ft / mi;
      return `${Math.round(per)} ${metric ? 'm/km' : 'ft/mi'}`;
    },
  };
}

export type Units = ReturnType<typeof makeUnits>;

// Prose (race tips, aid station notes, news) is written in miles and feet. In metric mode, rewrite the quantities in it.
const nearest = (n: number, step: number) => Math.round(n / step) * step;
const kmText = (mi: number) => {
  const km = mi * KM_PER_MI;
  return km < 10 ? String(round1(km)) : Math.round(km).toLocaleString();
};
export function metricText(text: string): string {
  return text
    .replace(/(\d+(?:\.\d+)?)\s?°F\b/g, (_m, f) => `${Math.round(((+f - 32) * 5) / 9)}°C`)
    .replace(/(\d+(?:\.\d+)?) min\/mile\b/g, (_m, n) => `${Math.round(+n / KM_PER_MI)} min/km`)
    .replace(/(\d+(?:\.\d+)?)\s?mph\b/g, (_m, n) => `${Math.round(+n * KM_PER_MI)} km/h`)
    .replace(/(\d+(?:\.\d+)?)k ft\b/g, (_m, n) => `${nearest(+n * 1000 * M_PER_FT, 10).toLocaleString()} m`)
    .replace(/(\d[\d,]*) (?:ft|feet|foot)\b/g, (_m, n) => {
      const m = +n.replace(/,/g, '') * M_PER_FT;
      return `${(m >= 500 ? nearest(m, 10) : Math.round(m)).toLocaleString()} m`;
    })
    .replace(/(\d+(?:\.\d+)?) (?:mi|miles?)\b(?!-)/g, (_m, n) => `${kmText(+n)} km`);
}

const cache: Partial<Record<UnitSystem, Units>> = {};
const unitsFor = (s: UnitSystem) => (cache[s] ??= makeUnits(s));

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const useUnits = (): Units => unitsFor(useSyncExternalStore(subscribe, () => current, () => current));
