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

/**
 * Live projection from every time logged so far.
 *
 * The finisher curves already carry the course's shape (climbs are slow legs, descents fast ones), so a runner is
 * always compared leg by leg against a curve, never extrapolated at one flat pace. Steps:
 *  1. Fit the curve (finish time) that best matches all logged splits. Recent splits count more, since fade shows up late.
 *  2. Early on, lean on the runner's goal: a fast first leg says little about the other 90 miles. The fit takes over
 *     as more of the race is behind them.
 *  3. Anchor to the logged times: stations between logged ones are interpolated along the curve's leg shape, and
 *     stations ahead continue from the last logged time using the curve's remaining legs.
 */
export interface Projection {
  finishHours: number;
  /** Elapsed hours at every station (including logged ones, which equal what was logged). */
  elapsed: Record<string, number>;
}

const FIT_MIN = 20, FIT_MAX = 45, FIT_STEP = 0.02;
const GOAL_BLEND_UNTIL = 0.45; // share of the race behind the runner at which the logged pace is fully trusted
const RECENCY_HALF_LIFE = 2; // a logged point this many logged points back counts half as much

export function projectFromLogs(logged: Record<string, number>, goalHours: number): Projection {
  const ids = ['start', ...STATION_ORDER];
  const pts = ids.slice(1).filter((id) => logged[id] != null).map((id) => ({ id, e: logged[id] }));
  if (pts.length === 0) {
    const base = elapsedHours(goalHours);
    return { finishHours: goalHours, elapsed: base };
  }

  // 1. Weighted fit of the finish time to all logged points (relative error, newest weighted most).
  let best = goalHours, bestLoss = Infinity;
  for (let F = FIT_MIN; F <= FIT_MAX; F += FIT_STEP) {
    const b = elapsedHours(F);
    let loss = 0;
    pts.forEach((p, k) => {
      const w = Math.pow(0.5, (pts.length - 1 - k) / RECENCY_HALF_LIFE);
      const r = (p.e - b[p.id]) / b[p.id];
      loss += w * r * r;
    });
    if (loss < bestLoss) {
      bestLoss = loss;
      best = F;
    }
  }

  // 2. Blend with the goal while little of the race has been run.
  const last = pts[pts.length - 1];
  const progress = elapsedHours(best)[last.id] / best;
  const trust = Math.min(1, Math.pow(progress / GOAL_BLEND_UNTIL, 1.5)); // eases in: little weight early, most by halfway
  const F = goalHours + (best - goalHours) * trust;
  const b = elapsedHours(F);

  // 3. Anchor to the logged times along the curve's leg shape.
  const anchors = [{ id: 'start', e: 0 }, ...pts];
  const out: Record<string, number> = { start: 0 };
  let a = 0; // index of the anchor at or before the current station
  ids.forEach((id, idx) => {
    if (idx === 0) return;
    while (a + 1 < anchors.length && ids.indexOf(anchors[a + 1].id) <= idx) a++;
    const lo = anchors[a];
    const hi = anchors[a + 1];
    if (hi) {
      const span = b[hi.id] - b[lo.id];
      out[id] = span > 0 ? lo.e + ((b[id] - b[lo.id]) * (hi.e - lo.e)) / span : lo.e;
    } else {
      out[id] = lo.e + (b[id] - b[lo.id]);
    }
  });
  return { finishHours: out.finish, elapsed: out };
}

/**
 * Crew timing for one crewed station: when to leave the previous crew stop, and how much cushion that leaves.
 * `elapsed` is hours from the start at every station (a projection, or the plan for a goal time).
 * `slackMin` below zero means crew cannot make it even leaving the moment the runner does.
 */
export function crewLeg(id: string, elapsed: Record<string, number>) {
  const cd = CREW_DRIVE.find((d) => d.id === id);
  if (!cd) return null;
  const hike = (x: string) => CREW_DRIVE.find((d) => d.id === x)?.hikeMinutes ?? 0;
  const arrive = elapsed[id] * 60 - hike(id);
  const leave = elapsed[cd.fromId] * 60 + (cd.fromId === 'start' ? 0 : AID_STOP_MINUTES) + hike(cd.fromId);
  const slackMin = arrive - leave - cd.minutes;
  return { fromId: cd.fromId, driveMinutes: cd.minutes, approx: !!cd.approx, slackMin, leaveByMin: leave + slackMin };
}
