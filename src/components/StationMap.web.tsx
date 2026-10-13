import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Polyline, Text as SvgText } from 'react-native-svg';
import { stationRoute } from '../data/stationRoute';
import { stationColor } from '../stationStyle';
import { useTheme } from '../theme';
import { StationMapFrame } from './StationMapFrame';

// The web has no native map view, so the stretch of course is drawn directly, scaled to fit.
export function StationMap({ id }: { id: string }) {
  const route = stationRoute(id);
  if (!route) return null;
  return <StationMapFrame route={route} render={(expanded) => <Inner id={id} expanded={expanded} />} />;
}

function Inner({ id, expanded }: { id: string; expanded: boolean }) {
  const t = useTheme();
  const route = stationRoute(id)!;
  const draw = useMemo(() => {
    const lats = route.all.map((p) => p.latitude);
    const lons = route.all.map((p) => p.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const lonScale = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
    const w = Math.max((maxLon - minLon) * lonScale, 0.002);
    const h = Math.max(maxLat - minLat, 0.002);
    const W = 360;
    const H = Math.round(W * (h / w));
    const pad = 36;
    const project = (lat: number, lon: number) => ({
      x: pad + (((lon - minLon) * lonScale) / w) * (W - pad * 2),
      y: pad + ((maxLat - lat) / h) * (H - pad * 2),
    });
    const line = (pts: { latitude: number; longitude: number }[]) =>
      pts.map((p) => { const q = project(p.latitude, p.longitude); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(' ');
    return { W, H, project, before: line(route.before), after: line(route.after) };
  }, [route]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
      <Svg viewBox={`0 0 ${draw.W} ${draw.H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: expanded ? undefined : 460 }} accessibilityLabel="Route around this aid station">
        {route.before && <Polyline points={draw.before} fill="none" stroke="#ffffff" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />}
        {route.after && <Polyline points={draw.after} fill="none" stroke="#ffffff" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />}
        {route.before.length > 1 && <Polyline points={draw.before} fill="none" stroke={t.primary} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />}
        {route.after.length > 1 && <Polyline points={draw.after} fill="none" stroke={t.accent} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />}
        {[route.prev, route.station, route.next].map((s) => {
          if (!s) return null;
          const p = draw.project(s.courseCoordinate.latitude, s.courseCoordinate.longitude);
          const here = s.id === route.station.id;
          return (
            <G key={s.id}>
              <Circle cx={p.x} cy={p.y} r={here ? 13 : 10} fill={stationColor(s, t)} stroke="#ffffff" strokeWidth={2.5} />
              <SvgText x={p.x} y={p.y + 3.5} fontSize={here ? 10 : 8.5} fontWeight="800" fontFamily="system-ui, sans-serif" fill="#ffffff" textAnchor="middle">
                {s.code}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
