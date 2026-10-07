import { AidStation } from './data/aidStations';
import { Theme } from './theme';

// One color language for stations everywhere: start/finish green, cutoff-only and hike-in amber,
// no crew access red, everything else blue.
export const stationColor = (s: AidStation, t: Theme) =>
  s.kind === 'start' || s.kind === 'finish'
    ? t.green
    : s.kind === 'cutoff'
      ? t.amber
      : s.crewAccess === 'no'
        ? t.red
        : s.crewAccess === 'hike-in'
          ? t.amber
          : t.primary;
