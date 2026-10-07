// Pace model built from finisher split tables in the 2025 crew planning sheet (arrival times at each
// station for 27 to 34 hour finishes, measured from the 6:00 AM start). Goal times between curves are
// interpolated; goal times outside 27-34 h scale the nearest curve. This is an estimate, not a prediction.
export const START_HOUR = 6; // 6:00 AM Friday

// Elapsed hours from the start to each station, one array per curve, in STATION_ORDER.
export const STATION_ORDER = ["porcupine", "ibex", "cow-camp-1", "half-moon", "conical-pass", "cow-camp-2", "sunlight", "crandall", "forest-lake", "honey-trail", "huntin-camp", "finish"] as const;

export const CURVES: { finishHours: number; elapsed: number[] }[] = [
  { finishHours: 27.0, elapsed: [1.25, 4.083, 7.25, 10.2, 12.267, 13.517, 16.183, 18.35, 21.017, 23.933, 25.583, 27.0] },
  { finishHours: 28.567, elapsed: [1.317, 4.5, 7.833, 10.967, 13.167, 14.483, 17.6, 19.867, 22.667, 25.333, 27.083, 28.567] },
  { finishHours: 30.05, elapsed: [1.4, 4.767, 8.283, 11.583, 13.9, 15.283, 18.8, 21.2, 24.067, 26.65, 28.5, 30.05] },
  { finishHours: 31.583, elapsed: [1.467, 5.017, 8.733, 12.217, 14.65, 16.317, 20.05, 22.583, 25.267, 28.0, 29.95, 31.583] },
  { finishHours: 32.1, elapsed: [1.5, 5.117, 8.9, 12.45, 14.933, 16.7, 20.5, 23.067, 25.683, 28.45, 30.433, 32.1] },
  { finishHours: 34.0, elapsed: [1.617, 5.467, 9.5, 13.283, 16.117, 17.967, 22.017, 24.517, 27.15, 30.117, 32.233, 34.0] },
];

// Race cutoffs as elapsed hours from the 6:00 AM start.
export const CUTOFF_HOURS: Record<string, number> = {
  ibex: 7,
  'half-moon': 15.75,
  'conical-pass': 18.75,
  sunlight: 23.5,
  crandall: 25.75,
  'forest-lake': 28.25,
  'huntin-camp': 34.75,
  finish: 36,
};

// Typical drive minutes from the previous crew-accessible stop (from the 2025 crew sheet).
// 'approx' means derived rather than listed directly.
export const CREW_DRIVE: { id: string; fromId: string; minutes: number; approx?: boolean; hikeMinutes?: number }[] = [
  { id: 'ibex', fromId: 'start', minutes: 60 },
  { id: 'half-moon', fromId: 'ibex', minutes: 127 },
  { id: 'sunlight', fromId: 'half-moon', minutes: 136, hikeMinutes: 15 },
  { id: 'crandall', fromId: 'sunlight', minutes: 16, hikeMinutes: 15 },
  { id: 'forest-lake', fromId: 'crandall', minutes: 135 },
  { id: 'finish', fromId: 'forest-lake', minutes: 87, approx: true },
];

export const AID_STOP_MINUTES = 10; // time your runner spends at a crewed station

export function elapsedHours(goalHours: number): Record<string, number> {
  const curves = CURVES;
  let result: number[];
  if (goalHours <= curves[0].finishHours) {
    const k = goalHours / curves[0].finishHours;
    result = curves[0].elapsed.map((e) => e * k);
  } else if (goalHours >= curves[curves.length - 1].finishHours) {
    const last = curves[curves.length - 1];
    const k = goalHours / last.finishHours;
    result = last.elapsed.map((e) => e * k);
  } else {
    let i = 0;
    while (goalHours > curves[i + 1].finishHours) i++;
    const a = curves[i], b = curves[i + 1];
    const w = (goalHours - a.finishHours) / (b.finishHours - a.finishHours);
    result = a.elapsed.map((e, j) => e + (b.elapsed[j] - e) * w);
  }
  // Pin the finish exactly to the goal time.
  const out: Record<string, number> = { start: 0 };
  STATION_ORDER.forEach((id, j) => (out[id] = result[j]));
  out.finish = goalHours;
  return out;
}

export function clockLabel(elapsedHrs: number): string {
  const total = START_HOUR * 60 + Math.round(elapsedHrs * 60);
  const dayIdx = Math.floor(total / 1440);
  const m = ((total % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60), mm = m % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const day = ['Fri', 'Sat', 'Sun'][dayIdx] ?? '';
  return `${day} ${h12}:${String(mm).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

export function durationLabel(hrs: number): string {
  const total = Math.round(Math.abs(hrs) * 60);
  const h = Math.floor(total / 60), m = total % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

// Finds the finish time (hours) whose model has the runner at `stationId` after `elapsed` hours.
// Used by live mode: log when a runner really reached a station, get the pace-implied finish.
export function impliedFinishHours(stationId: string, elapsed: number): number {
  let lo = 12, hi = 60;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if ((elapsedHours(mid)[stationId] ?? 0) < elapsed) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
