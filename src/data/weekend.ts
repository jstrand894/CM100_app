import { RACE } from './race';

// Set to an ISO string to preview race-weekend mode on the Home screen. Must be null when shipping.
const DEBUG_NOW_ISO: string | null = null;
export const nowMs = () => (DEBUG_NOW_ISO ? new Date(DEBUG_NOW_ISO).getTime() : Date.now());

export const START_MS = new Date(RACE.startIso).getTime();
const MIN = 60000;
const HOUR = 60 * MIN;
export const CUTOFF_MS = START_MS + 36 * HOUR;
export const WEEK_MS = 7 * 24 * HOUR;

export interface WeekendEvent {
  title: string;
  place: string;
  /** Day and time as the race publishes it, in Mountain Time, e.g. "Thu 3:00 PM". */
  label: string;
  at: number;
}

// Times are from the 2025 race guide (see src/data/info.ts) and are offsets from the start time, so they follow RACE.startIso.
// Confirm against the race website each year.
const rel = (minutes: number) => START_MS + minutes * MIN;
export const WEEKEND_EVENTS: WeekendEvent[] = [
  { title: 'Start-line camping opens', place: 'Westling Ranch', label: 'Thu 12:00 PM', at: rel(-18 * 60) },
  { title: 'Packet pickup and drop bags', place: 'Berg Ranch (finish)', label: 'Thu 3:00 PM', at: rel(-15 * 60) },
  { title: 'Race briefing', place: 'Berg Ranch (finish)', label: 'Thu 6:00 PM', at: rel(-12 * 60) },
  { title: 'Shuttle to the start', place: 'Berg Ranch (finish)', label: 'Fri 4:10 AM', at: rel(-110) },
  { title: 'Runner check-in', place: 'Westling Ranch', label: 'Fri 5:00 AM', at: rel(-60) },
  { title: 'Race briefing', place: 'Westling Ranch', label: 'Fri 5:45 AM', at: rel(-15) },
  { title: 'Race start', place: 'Westling Ranch', label: 'Fri 6:00 AM', at: rel(0) },
  { title: 'Post-race food', place: 'Berg Ranch (finish)', label: 'Sat 4:00 PM', at: rel(34 * 60) },
  { title: 'Golden Hour at the finish', place: 'Berg Ranch (finish)', label: 'Sat 5:00 PM', at: rel(35 * 60) },
  { title: 'Finish line closes', place: 'Berg Ranch (finish)', label: 'Sat 6:00 PM', at: rel(36 * 60) },
  { title: 'Awards ceremony', place: 'Berg Ranch (finish)', label: 'Sat 6:15 PM', at: rel(36 * 60 + 15) },
  { title: 'Be on your way', place: 'Berg Ranch (finish)', label: 'Sun 10:00 AM', at: rel(52 * 60) },
];

export type Phase = 'far' | 'week' | 'racing' | 'after' | 'done';

export function phaseAt(now: number): Phase {
  if (now < START_MS - WEEK_MS) return 'far';
  if (now < START_MS) return 'week';
  if (now < CUTOFF_MS) return 'racing';
  if (now < WEEKEND_EVENTS[WEEKEND_EVENTS.length - 1].at) return 'after';
  return 'done';
}

/** Next events that have not started yet, soonest first. */
export function upcoming(now: number, count: number): WeekendEvent[] {
  return WEEKEND_EVENTS.filter((e) => e.at > now).slice(0, count);
}

export function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** "3h 12m", "12m 05s" or "2d 4h" for a duration in ms. */
export function shortDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${pad2(m)}m`;
  return `${m}m ${pad2(s)}s`;
}

/** "26:14:09" for a duration in ms. */
export function clockDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 3600)}:${pad2(Math.floor((total % 3600) / 60))}:${pad2(total % 60)}`;
}
