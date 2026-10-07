import elevation from './elevation.json';

// Elevation (ft) at a race-official mile (0 to 100), from the USGS-derived profile.
const SCALE = 100 / elevation.gpxMiles;
const PROFILE = (elevation.profile as number[][]).map(([mi, ft]) => ({ mile: mi * SCALE, ft }));

export function elevationAtMile(mile: number): number {
  let lo = 0;
  while (lo < PROFILE.length - 2 && PROFILE[lo + 1].mile < mile) lo++;
  const a = PROFILE[lo], b = PROFILE[lo + 1];
  const w = b.mile === a.mile ? 0 : Math.min(Math.max((mile - a.mile) / (b.mile - a.mile), 0), 1);
  return a.ft + (b.ft - a.ft) * w;
}

export const COURSE_STATS = {
  highFt: elevation.maxFt,
  lowFt: elevation.minFt,
};
