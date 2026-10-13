import { AID_STATIONS, AidStation } from './aidStations';
import course from './course.json';

export interface Pt {
  latitude: number;
  longitude: number;
}

// course.json stores GPX miles; the race's official miles are scaled to 100 total.
const SCALE = 100 / course.totalMiles;
const pts = (course.coordinates as number[][]).map(([latitude, longitude, mile]) => ({ latitude, longitude, mile: mile * SCALE }));

const slice = (from: number, to: number): Pt[] => pts.filter((p) => p.mile >= from - 0.05 && p.mile <= to + 0.05).map(({ latitude, longitude }) => ({ latitude, longitude }));

export interface StationRoute {
  prev: AidStation | null;
  station: AidStation;
  next: AidStation | null;
  before: Pt[]; // the stretch leading into the station
  after: Pt[]; // the stretch leading out of it
  all: Pt[];
}

export function stationRoute(id: string): StationRoute | null {
  const i = AID_STATIONS.findIndex((s) => s.id === id);
  if (i < 0) return null;
  const station = AID_STATIONS[i];
  const prev = i > 0 ? AID_STATIONS[i - 1] : null;
  const next = i < AID_STATIONS.length - 1 ? AID_STATIONS[i + 1] : null;
  const before = prev ? slice(prev.mile, station.mile) : [];
  const after = next ? slice(station.mile, next.mile) : [];
  const stops = [prev, station, next].filter((s): s is AidStation => !!s).map((s) => s.courseCoordinate);
  return { prev, station, next, before, after, all: [...before, ...after, ...stops] };
}
