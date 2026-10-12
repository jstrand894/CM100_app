import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

// The race's start list, published as public/entrants.json next to the web app (see docs/ENTRANTS_GUIDE.md).
// Fetched once per launch and cached, so the lookup still works without signal.
export const ENTRANTS_URL = 'https://jstrand894.github.io/CM100_app/entrants.json';
const CACHE_KEY = 'cm100.entrants.cache';

export interface Entrant {
  bib: string;
  name: string;
  city: string;
}

// Only used while developing, so the lookup can be seen before the real list exists.
const SAMPLE: Entrant[] = [
  { bib: '101', name: 'Sam Rivera', city: 'Bozeman, MT' },
  { bib: '102', name: 'Alex Chen', city: 'Denver, CO' },
  { bib: '103', name: 'Jordan Lee', city: 'Missoula, MT' },
  { bib: '117', name: 'Taylor Brooks', city: 'Boise, ID' },
];

export function parseEntrants(json: unknown): Entrant[] {
  const list = Array.isArray(json) ? json : (json as { entrants?: unknown })?.entrants;
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && typeof e.name === 'string' && e.name.trim() !== '')
    .map((e) => ({ bib: String(e.bib ?? '').trim(), name: String(e.name).trim(), city: String(e.city ?? '').trim() }));
}

export function searchEntrants(list: Entrant[], query: string, limit = 25): Entrant[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  return list
    .filter((e) => (e.bib !== '' && e.bib.toLowerCase().startsWith(q)) || words.every((w) => e.name.toLowerCase().includes(w)))
    .slice(0, limit);
}

let entrants: Entrant[] = [];
let started = false;
const listeners = new Set<() => void>();
const set = (next: Entrant[]) => {
  entrants = next;
  listeners.forEach((l) => l());
};

async function load() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) set(JSON.parse(raw));
  } catch {}
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(`${ENTRANTS_URL}?t=${Date.now()}`, { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const next = parseEntrants(await res.json());
    set(next);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
  } catch {
    if (__DEV__ && entrants.length === 0) set(SAMPLE);
  }
}

export function useEntrants(): Entrant[] {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    if (!started) {
      started = true;
      load();
    }
    return () => {
      listeners.delete(l);
    };
  }, []);
  return entrants;
}
