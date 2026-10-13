import { useMemo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, G, Image as SvgImage, Polyline, Text as SvgText } from 'react-native-svg';
import { placeLabels } from '../data/labelPlacement';
import { TOPO_ATTRIBUTION, topoTileUrl } from '../data/topoTiles';
import { fitProject, shortStationName, stationRoute } from '../data/stationRoute';
import { stationColor } from '../stationStyle';
import { useTheme } from '../theme';
import { StationMapFrame } from './StationMapFrame';

// The web has no native map view, so the stretch of course is drawn directly on topo tiles.
const tileX = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z);
const tileY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};
const tileLon = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const tileLat = (y: number, z: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;

export function StationMap({ id }: { id: string }) {
  const route = stationRoute(id);
  if (!route) return null;
  return <StationMapFrame route={route} render={(expanded) => <Inner id={id} expanded={expanded} />} />;
}

function Inner({ id, expanded }: { id: string; expanded: boolean }) {
  const t = useTheme();
  const route = stationRoute(id)!;
  const [size, setSize] = useState({ W: 360, H: expanded ? 640 : 230 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ W: width, H: height });
  };

  const draw = useMemo(() => {
    const { W, H } = size;
    const fit = fitProject(route.all, W, H, expanded ? 70 : 34);
    const lonScale = Math.cos((route.station.courseCoordinate.latitude * Math.PI) / 180);
    const line = (pts: { latitude: number; longitude: number }[]) =>
      pts.map((p) => { const q = fit.project(p.latitude, p.longitude); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(' ');

    // Label sides: away from the trail and from each other.
    const trail = route.all.map((p) => fit.project(p.latitude, p.longitude));
    const stops = [route.prev, route.station, route.next].filter((s): s is NonNullable<typeof s> => !!s);
    const placed = placeLabels(
      stops.map((s) => {
        const p = fit.project(s.courseCoordinate.latitude, s.courseCoordinate.longitude);
        return { id: s.id, x: p.x, y: p.y, w: shortStationName(s.name).length * 7 + 8, h: 18 };
      }),
      trail,
      { W, H },
    );

    // Topo tiles covering the visible area.
    const tl = fit.unproject(0, 0);
    const br = fit.unproject(W, H);
    const visLon = Math.max(br.longitude - tl.longitude, 0.0005);
    let z = Math.min(Math.max(Math.ceil(Math.log2((360 * (W / 256)) / visLon)), 9), 15);
    let tiles: { key: string; x: number; y: number; w: number; h: number; url: string }[] = [];
    for (; z >= 9; z--) {
      const x0 = tileX(tl.longitude, z), x1 = tileX(br.longitude, z), y0 = tileY(tl.latitude, z), y1 = tileY(br.latitude, z);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > 30) continue;
      tiles = [];
      for (let tx = x0; tx <= x1; tx++)
        for (let ty = y0; ty <= y1; ty++) {
          const a = fit.project(tileLat(ty, z), tileLon(tx, z));
          const b = fit.project(tileLat(ty + 1, z), tileLon(tx + 1, z));
          tiles.push({ key: `${z}/${tx}/${ty}`, x: a.x, y: a.y, w: b.x - a.x + 0.6, h: b.y - a.y + 0.6, url: topoTileUrl(z, tx, ty) });
        }
      break;
    }
    return { W, H, project: fit.project, before: line(route.before), after: line(route.after), placed, tiles, lonScale };
  }, [route, size, expanded]);

  return (
    <View style={{ flex: 1, backgroundColor: '#eef1ea' }} onLayout={onLayout}>
      <Svg width={size.W} height={size.H} viewBox={`0 0 ${size.W} ${size.H}`} accessibilityLabel="Route around this aid station on a topo map">
        {draw.tiles.map((tl) => (
          <SvgImage key={tl.key} x={tl.x} y={tl.y} width={tl.w} height={tl.h} href={tl.url} preserveAspectRatio="none" />
        ))}
        <Polyline points={draw.before} fill="none" stroke="#ffffff" strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
        <Polyline points={draw.after} fill="none" stroke="#ffffff" strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
        {route.before.length > 1 && <Polyline points={draw.before} fill="none" stroke={t.primary} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />}
        {route.after.length > 1 && <Polyline points={draw.after} fill="none" stroke={t.accent} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />}
        {[route.prev, route.station, route.next].map((s) => {
          if (!s) return null;
          const p = draw.project(s.courseCoordinate.latitude, s.courseCoordinate.longitude);
          const here = s.id === route.station.id;
          const side = draw.placed[s.id] ?? 'right';
          const gap = (here ? 13 : 10) + 5;
          const lx = side === 'right' ? p.x + gap : side === 'left' ? p.x - gap : p.x;
          const ly = side === 'above' ? p.y - gap - 3 : side === 'below' ? p.y + gap + 11 : p.y + 4.5;
          const anchor = side === 'right' ? 'start' : side === 'left' ? 'end' : 'middle';
          return (
            <G key={s.id}>
              <Circle cx={p.x} cy={p.y} r={here ? 13 : 10} fill={stationColor(s, t)} stroke="#ffffff" strokeWidth={2.5} />
              <SvgText x={p.x} y={p.y + 3.5} fontSize={here ? 10 : 8.5} fontWeight="800" fontFamily="system-ui, sans-serif" fill="#ffffff" textAnchor="middle">
                {s.code}
              </SvgText>
              {[true, false].map((halo) => (
                <SvgText
                  key={String(halo)}
                  x={lx}
                  y={ly}
                  fontSize={here ? 13 : 11.5}
                  fontWeight="800"
                  fontFamily="system-ui, sans-serif"
                  textAnchor={anchor}
                  fill={halo ? '#ffffff' : '#1c2b36'}
                  stroke={halo ? '#ffffff' : undefined}
                  strokeWidth={halo ? 4 : undefined}
                  strokeLinejoin="round"
                >
                  {shortStationName(s.name)}
                </SvgText>
              ))}
            </G>
          );
        })}
        <SvgText x={size.W - 6} y={size.H - 6} fontSize={9} fontFamily="system-ui, sans-serif" fill="#3b4a54" textAnchor="end">
          {TOPO_ATTRIBUTION}
        </SvgText>
      </Svg>
    </View>
  );
}
