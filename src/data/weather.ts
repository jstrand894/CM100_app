import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { nowMs, START_MS } from './weekend';

// Forecasts and history come from Open-Meteo (free, no key). Temperatures are adjusted to the elevation we pass in.
// The race is Friday and Saturday, so these are the two days that matter.
export interface WeatherSpot {
  id: 'start' | 'high';
  label: string;
  detail: string;
  lat: number;
  lon: number;
  ft: number;
}

export const SPOTS: WeatherSpot[] = [
  { id: 'start', label: 'Start', detail: 'Westling Ranch · 5,800 ft', lat: 46.12057, lon: -110.52195, ft: 5816 },
  { id: 'high', label: 'High country', detail: 'Mile 50 · 10,000 ft', lat: 46.0502, lon: -110.33309, ft: 10003 },
];

// Race day and the day after, as calendar dates in Mountain Time. The race starts at 6 AM, so the UTC date matches.
const startDate = new Date(START_MS);
const pad = (n: number) => String(n).padStart(2, '0');
const mmdd = (d: Date) => `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const dayAfter = new Date(START_MS + 86400000);
export const RACE_MMDD = [mmdd(startDate), mmdd(dayAfter)];
export const RACE_DATES = [`${startDate.getUTCFullYear()}-${RACE_MMDD[0]}`, `${dayAfter.getUTCFullYear()}-${RACE_MMDD[1]}`];
export const FORECAST_WINDOW_DAYS = 13; // Open-Meteo forecasts reach about 16 days out; leave room for Saturday

export interface DayForecast {
  date: string;
  high: number;
  low: number;
  rainChance: number | null;
  windMax: number;
  code: number;
}
export type Forecast = Record<WeatherSpot['id'], DayForecast[]>;

export interface Typical {
  years: string;
  high: number;
  low: number;
  windMax: number;
  wetDays: number;
  totalDays: number;
}
export type History = Record<WeatherSpot['id'], Typical>;

const CACHE_KEY = 'cm100.weather.v1';
const FORECAST_TTL = 60 * 60 * 1000;
const HISTORY_TTL = 30 * 24 * 60 * 60 * 1000;

const meters = (ft: number) => Math.round(ft * 0.3048);
const common = 'temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FDenver';

async function getJson(url: string): Promise<any> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchForecast(spot: WeatherSpot): Promise<DayForecast[]> {
  const daily = 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code';
  const j = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${spot.lat}&longitude=${spot.lon}&elevation=${meters(spot.ft)}` +
      `&daily=${daily}&${common}&start_date=${RACE_DATES[0]}&end_date=${RACE_DATES[1]}`,
  );
  const d = j.daily;
  return (d.time as string[]).map((date, i) => ({
    date,
    high: Math.round(d.temperature_2m_max[i]),
    low: Math.round(d.temperature_2m_min[i]),
    rainChance: d.precipitation_probability_max?.[i] ?? null,
    windMax: Math.round(d.wind_speed_10m_max[i]),
    code: d.weather_code[i],
  }));
}

// Average of the last five years on the race's two dates, so there is something useful long before a forecast exists.
async function fetchHistory(spot: WeatherSpot): Promise<Typical> {
  const endYear = new Date(nowMs()).getFullYear() - 1;
  const firstYear = endYear - 4;
  const j = await getJson(
    `https://archive-api.open-meteo.com/v1/archive?latitude=${spot.lat}&longitude=${spot.lon}&elevation=${meters(spot.ft)}` +
      `&start_date=${firstYear}-${RACE_MMDD[0]}&end_date=${endYear}-${RACE_MMDD[1]}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&precipitation_unit=inch&${common}`,
  );
  const d = j.daily;
  const rows: { hi: number; lo: number; rain: number; wind: number }[] = [];
  (d.time as string[]).forEach((date, i) => {
    if (!RACE_MMDD.includes(date.slice(5))) return;
    if (d.temperature_2m_max[i] == null) return;
    rows.push({ hi: d.temperature_2m_max[i], lo: d.temperature_2m_min[i], rain: d.precipitation_sum[i] ?? 0, wind: d.wind_speed_10m_max[i] });
  });
  const avg = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0) / Math.max(rows.length, 1);
  return {
    years: `${firstYear}–${endYear}`,
    high: Math.round(avg((r) => r.hi)),
    low: Math.round(avg((r) => r.lo)),
    windMax: Math.round(avg((r) => r.wind)),
    wetDays: rows.filter((r) => r.rain >= 0.04).length,
    totalDays: rows.length,
  };
}

/** WMO weather code to a short label and icon. */
export function describeCode(code: number): { label: string; icon: keyof typeof Ionicons.glyphMap } {
  if (code === 0) return { label: 'Clear', icon: 'sunny' };
  if (code <= 2) return { label: 'Partly cloudy', icon: 'partly-sunny' };
  if (code === 3) return { label: 'Overcast', icon: 'cloudy' };
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'cloud' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: 'rainy' };
  if (code >= 61 && code <= 67) return { label: 'Rain', icon: 'rainy' };
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: 'snow' };
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: 'rainy' };
  if (code === 85 || code === 86) return { label: 'Snow showers', icon: 'snow' };
  if (code >= 95) return { label: 'Thunderstorms', icon: 'thunderstorm' };
  return { label: 'Mixed', icon: 'partly-sunny' };
}

interface Cache {
  forecast?: { data: Forecast; at: number };
  history?: { data: History; at: number };
}

export function useWeather() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);

  const daysToRace = Math.ceil((START_MS - nowMs()) / 86400000);
  const forecastOpen = daysToRace <= FORECAST_WINDOW_DAYS && daysToRace > -2;

  const load = useCallback(
    async (force: boolean) => {
      let cache: Cache = {};
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) cache = JSON.parse(raw);
      } catch {}
      // A forecast saved for a different year's race dates is no use.
      if (cache.forecast && cache.forecast.data.start?.[0]?.date !== RACE_DATES[0]) delete cache.forecast;
      if (mounted.current) {
        if (cache.forecast) setForecast(cache.forecast.data);
        if (cache.history) setHistory(cache.history.data);
        setUpdatedAt(Math.max(cache.forecast?.at ?? 0, cache.history?.at ?? 0) || null);
      }

      const now = Date.now();
      const needForecast = forecastOpen && (force || !cache.forecast || now - cache.forecast.at > FORECAST_TTL);
      const needHistory = force || !cache.history || now - cache.history.at > HISTORY_TTL;
      if (!needForecast && !needHistory) return;

      if (mounted.current) {
        setLoading(true);
        setFailed(false);
      }
      // Fetch each piece on its own so one failing does not block the other.
      const next: Cache = { ...cache };
      let anyFailed = false;
      if (needForecast) {
        try {
          const [start, high] = await Promise.all(SPOTS.map(fetchForecast));
          next.forecast = { data: { start, high }, at: now };
        } catch {
          anyFailed = true;
        }
      }
      if (needHistory) {
        try {
          const [start, high] = await Promise.all(SPOTS.map(fetchHistory));
          next.history = { data: { start, high }, at: now };
        } catch {
          anyFailed = true;
        }
      }
      if (next.forecast !== cache.forecast || next.history !== cache.history) {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
      }
      if (mounted.current) {
        setForecast(next.forecast?.data ?? null);
        setHistory(next.history?.data ?? null);
        if (!anyFailed) setUpdatedAt(now);
        setFailed(anyFailed); // keep whatever is cached
        setLoading(false);
      }
    },
    [forecastOpen],
  );

  useEffect(() => {
    mounted.current = true;
    load(false);
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);
  return { forecast, history, forecastOpen, daysToRace, updatedAt, loading, failed, refresh };
}
