import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

// The Pace tab can follow more than one runner. The first runner keeps the original storage keys, so
// anyone who already logged times keeps them; extra runners get keys with their id on the end.
export interface Runner {
  id: string;
  name: string;
  bib: string;
}

const RUNNERS_KEY = 'cm100.runners.v1';
const MAIN_ID = 'me';
const LEGACY = { goal: 'cm100.goalMinutes', logs: 'cm100.liveLogs' };
export const MAX_RUNNERS = 8;

export const DEFAULT_RUNNER: Runner = { id: MAIN_ID, name: 'My runner', bib: '' };

export const goalKey = (id: string) => (id === MAIN_ID ? LEGACY.goal : `${LEGACY.goal}.${id}`);
export const logsKey = (id: string) => (id === MAIN_ID ? LEGACY.logs : `${LEGACY.logs}.${id}`);

export type Role = 'runner' | 'crew';

interface Saved {
  list: Runner[];
  active: string;
  role: Role | null; // chosen during first-run setup
}

const initial: Saved = { list: [DEFAULT_RUNNER], active: MAIN_ID, role: null };
let state: Saved = initial;
let loaded = false;
const listeners = new Set<() => void>();
const publish = (next: Saved) => {
  state = next;
  listeners.forEach((l) => l());
  AsyncStorage.setItem(RUNNERS_KEY, JSON.stringify(next)).catch(() => {});
};

async function read(): Promise<Saved> {
  try {
    const raw = await AsyncStorage.getItem(RUNNERS_KEY);
    const s = raw ? (JSON.parse(raw) as Partial<Saved>) : null;
    if (s?.list?.length) {
      return { list: s.list, active: s.list.some((r) => r.id === s.active) ? (s.active as string) : s.list[0].id, role: s.role ?? null };
    }
  } catch {}
  return initial;
}

/** Every storage key that holds runner data, for Settings resets. */
export async function allRunnerKeys(kind: 'goal' | 'logs'): Promise<string[]> {
  const { list } = await read();
  return list.map((r) => (kind === 'goal' ? goalKey(r.id) : logsKey(r.id)));
}

export function useRunners() {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    if (!loaded) {
      loaded = true;
      read().then((s) => {
        state = s;
        listeners.forEach((fn) => fn());
      });
    }
    return () => {
      listeners.delete(l);
    };
  }, []);

  const reload = useCallback(() => {
    read().then((s) => {
      state = s;
      listeners.forEach((fn) => fn());
    });
  }, []);

  const setActive = (id: string) => publish({ ...state, active: id });
  const add = (name: string, bib: string): string => {
    const id = `r${Date.now().toString(36)}`;
    publish({ ...state, list: [...state.list, { id, name: name.trim() || `Runner ${state.list.length + 1}`, bib: bib.trim() }], active: id });
    return id;
  };
  const update = (id: string, name: string, bib: string) =>
    publish({ ...state, list: state.list.map((r) => (r.id === id ? { ...r, name: name.trim() || r.name, bib: bib.trim() } : r)) });
  const remove = (id: string) => {
    if (state.list.length < 2) return;
    AsyncStorage.multiRemove([goalKey(id), logsKey(id)]).catch(() => {});
    const list = state.list.filter((r) => r.id !== id);
    publish({ ...state, list, active: state.active === id ? list[0].id : state.active });
  };
  const setRole = (role: Role) => publish({ ...state, role });

  const active = state.list.find((r) => r.id === state.active) ?? state.list[0];
  return { runners: state.list, active, role: state.role, setActive, add, update, remove, setRole, reload };
}
