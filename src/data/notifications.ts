import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

// Announcements live in public/notifications.json, which GitHub Pages serves next to the web app.
// Edit that file and merge to main: every phone picks it up next time it opens the app. No app update needed.
export const NOTIFICATIONS_URL = 'https://jstrand894.github.io/CM100_app/notifications.json';

export const CACHE_KEY = 'cm100.notifications.cache';
const READ_KEY = 'cm100.notifications.read';

export interface Notice {
  id: string;
  date: string; // yyyy-mm-dd
  title: string;
  body: string;
  link: string;
  urgent: boolean;
}

// Always present, so there is something in the inbox before the first download and while offline.
export const WELCOME: Notice = {
  id: 'welcome',
  date: '2026-01-01',
  title: 'Welcome to the CM100 Companion',
  body:
    'Course, aid stations, pace planner, gear list, weather and race news, all in one place.\n\n' +
    'Before you head out of signal: tap "Get ready for offline" on the Home tab while you have service. ' +
    'It saves the latest news, weather and announcements to your phone. The course, schedule, gear list and planner always work offline.',
  link: '',
  urgent: false,
};

type State = { remote: Notice[]; read: string[]; updatedAt: number | null; refreshing: boolean; failed: boolean; ready: boolean };
let state: State = { remote: [], read: [], updatedAt: null, refreshing: false, failed: false, ready: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let started = false;
async function load() {
  try {
    const [cache, read] = await Promise.all([AsyncStorage.getItem(CACHE_KEY), AsyncStorage.getItem(READ_KEY)]);
    const c = cache ? JSON.parse(cache) : null;
    set({ remote: c?.items ?? [], updatedAt: c?.at ?? null, read: read ? JSON.parse(read) : [], ready: true });
  } catch {
    set({ ready: true });
  }
}

export function parseNotices(json: unknown): Notice[] {
  const list = Array.isArray(json) ? json : (json as { notifications?: unknown })?.notifications;
  if (!Array.isArray(list)) return [];
  return list
    .filter((n) => n && typeof n.id === 'string' && typeof n.title === 'string' && n.show !== false)
    .map((n) => ({
      id: n.id,
      date: String(n.date ?? ''),
      title: n.title,
      body: String(n.body ?? ''),
      link: String(n.link ?? ''),
      urgent: n.urgent === true,
    }));
}

export async function refreshNotifications(): Promise<boolean> {
  set({ refreshing: true, failed: false });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(`${NOTIFICATIONS_URL}?t=${Date.now()}`, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = parseNotices(await res.json());
    const at = Date.now();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ items, at })).catch(() => {});
    set({ remote: items, updatedAt: at, refreshing: false });
    return true;
  } catch {
    set({ refreshing: false, failed: true }); // keep showing whatever is cached
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function markRead(ids: string[]) {
  const next = Array.from(new Set([...state.read, ...ids]));
  if (next.length === state.read.length) return;
  set({ read: next });
  AsyncStorage.setItem(READ_KEY, JSON.stringify(next)).catch(() => {});
}

export function useNotifications() {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    if (!started) {
      started = true;
      load().then(refreshNotifications);
    }
    return () => {
      listeners.delete(l);
    };
  }, []);

  const items = [...state.remote, WELCOME].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const unread = items.filter((n) => !state.read.includes(n.id)).length;
  const isRead = useCallback((id: string) => state.read.includes(id), [state.read]);
  return { items, unread, isRead, ...state, refresh: refreshNotifications, markRead };
}
