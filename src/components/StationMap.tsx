import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import MapView, { MapType, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { placeLabels, Side } from '../data/labelPlacement';
import { fitProject, shortStationName, stationRoute } from '../data/stationRoute';
import { stationColor } from '../stationStyle';
import { useTheme } from '../theme';
import { StationMapFrame } from './StationMapFrame';


// Compass bearing from one point to another, so the 3D view can look along the trail.
const bearing = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const rad = Math.PI / 180;
  const y = Math.sin((b.longitude - a.longitude) * rad) * Math.cos(b.latitude * rad);
  const x = Math.cos(a.latitude * rad) * Math.sin(b.latitude * rad) - Math.sin(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.cos((b.longitude - a.longitude) * rad);
  return (Math.atan2(y, x) / rad + 360) % 360;
};

/** The stretch of course into and out of one aid station, on a real map. */
export function StationMap({ id }: { id: string }) {
  const route = stationRoute(id);
  if (!route) return null;
  return <StationMapFrame route={route} render={(expanded) => <Inner expanded={expanded} id={id} />} />;
}

function Inner({ id, expanded }: { id: string; expanded: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<MapView>(null);
  const route = stationRoute(id)!;
  const [threeD, setThreeD] = useState(false);
  const win = useWindowDimensions();

  // Which side of each point its name goes on, chosen so the names stay off the trail.
  const sides = (() => {
    const W = expanded ? win.width : win.width - 32;
    const H = expanded ? win.height - 220 : 230;
    const fitted = fitProject(route.all, W, H, expanded ? 70 : 34);
    const trail = route.all.map((p) => fitted.project(p.latitude, p.longitude));
    const stops = [route.prev, route.station, route.next].filter((s): s is NonNullable<typeof s> => !!s);
    return placeLabels(
      stops.map((s) => {
        const p = fitted.project(s.courseCoordinate.latitude, s.courseCoordinate.longitude);
        return { id: s.id, x: p.x, y: p.y, w: shortStationName(s.name).length * 7 + 18, h: 22 };
      }),
      trail,
      { W, H },
    );
  })();
  // The station dots and names are drawn by this app, on top of the map, at the screen position the map reports for each
  // coordinate. (Custom views inside map markers land in different places on iOS and Android.)
  const stops = [route.prev, route.station, route.next].filter((s): s is NonNullable<typeof s> => !!s);
  const [screenPts, setScreenPts] = useState<Record<string, { x: number; y: number }>>({});
  const updatePts = async () => {
    const map = ref.current;
    if (!map) return;
    try {
      const entries = await Promise.all(stops.map(async (st) => [st.id, await map.pointForCoordinate(st.courseCoordinate)] as const));
      setScreenPts(Object.fromEntries(entries));
    } catch {}
  };
  const fit = () =>
    ref.current?.fitToCoordinates(route.all, { edgePadding: { top: expanded ? 100 : 28, right: 36, bottom: expanded ? 110 : 28, left: 36 }, animated: false });

  // The aid station screen switches stations in place, so refit the camera (and redraw the pins) whenever the station changes.
  const mapReady = useRef(false);
  useEffect(() => {
    setThreeD(false);
    if (mapReady.current) ref.current?.animateCamera({ pitch: 0, heading: 0 }, { duration: 0 });
    const refit = setTimeout(() => mapReady.current && fit(), 80);
    const settle = setTimeout(updatePts, 400);
    return () => {
      clearTimeout(refit);
      clearTimeout(settle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggle3D = () => {
    const on = !threeD;
    setThreeD(on);
    if (on) {
      const ahead = route.next ? route.next.courseCoordinate : route.prev ? route.prev.courseCoordinate : route.station.courseCoordinate;
      ref.current?.animateCamera({ center: route.station.courseCoordinate, pitch: 65, heading: bearing(route.station.courseCoordinate, ahead), zoom: 12.5, altitude: 14000 }, { duration: 900 });
    } else {
      ref.current?.animateCamera({ pitch: 0, heading: 0 }, { duration: 600 });
      setTimeout(fit, 650);
    }
  };
  // Apple Maps' flyover imagery shows real terrain in 3D; Google's terrain layer does on Android.
  const mapType: MapType = threeD ? (Platform.OS === 'ios' ? 'hybridFlyover' : 'terrain') : 'standard';

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={ref}
        style={{ flex: 1 }}
        mapType={mapType}
        scrollEnabled={expanded}
        zoomEnabled={expanded}
        rotateEnabled={expanded}
        pitchEnabled={expanded}
        toolbarEnabled={false}
        showsCompass={false}
        onMapReady={() => {
          mapReady.current = true;
          setTimeout(fit, 250);
          setTimeout(updatePts, 500);
        }}
        onRegionChangeComplete={updatePts}
        onRegionChange={expanded ? updatePts : undefined}
        initialRegion={{ ...route.station.courseCoordinate, latitudeDelta: 0.2, longitudeDelta: 0.2 }}
      >
        {route.before.length > 1 && <Polyline coordinates={route.before} strokeColor="#ffffff" strokeWidth={7} zIndex={1} />}
        {route.after.length > 1 && <Polyline coordinates={route.after} strokeColor="#ffffff" strokeWidth={7} zIndex={1} />}
        {route.before.length > 1 && <Polyline coordinates={route.before} strokeColor={t.primary} strokeWidth={4} zIndex={2} />}
        {route.after.length > 1 && <Polyline coordinates={route.after} strokeColor={t.accent} strokeWidth={4} zIndex={2} />}
      </MapView>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {stops.map((st) => {
          const pt = screenPts[st.id];
          if (!pt) return null;
          const here = st.id === route.station.id;
          const side: Side = sides[st.id] ?? 'above';
          const d = here ? 18 : 14;
          const color = stationColor(st, t);
          const gap = d / 2 + 4;
          const labelPos =
            side === 'right'
              ? { left: gap, top: -12 }
              : side === 'left'
                ? { right: gap, top: -12 }
                : side === 'above'
                  ? { left: -100, width: 200, bottom: gap, alignItems: 'center' as const }
                  : { left: -100, width: 200, top: gap, alignItems: 'center' as const };
          return (
            <View key={st.id} style={[styles.anchor, { left: pt.x, top: pt.y, zIndex: here ? 2 : 1 }]}>
              <View style={[styles.dot, { backgroundColor: color, width: d, height: d, left: -d / 2, top: -d / 2 }]} />
              <View style={[styles.labelWrap, labelPos]}>
                <View style={[styles.label, { backgroundColor: here ? color : '#ffffff' }]}>
                  <Text style={[styles.labelText, { color: here ? '#ffffff' : '#1c2b36' }]} numberOfLines={1}>
                    {shortStationName(st.name)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
      {expanded && (
        <Pressable onPress={toggle3D} style={[styles.threeD, { bottom: insets.bottom + 84, backgroundColor: threeD ? t.accent : 'rgba(11,74,107,0.92)' }]} accessibilityRole="button" accessibilityState={{ selected: threeD }} accessibilityLabel="Toggle 3D terrain view">
          <Ionicons name="cube-outline" size={18} color="#ffffff" />
          <Text style={styles.threeDText}>{threeD ? 'Flat map' : '3D terrain'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', width: 0, height: 0 },
  labelWrap: { position: 'absolute' },
  label: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, maxWidth: 150, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },
  labelText: { fontSize: 12, fontWeight: '800' },
  dot: { position: 'absolute', borderRadius: 9, borderWidth: 2.5, borderColor: '#ffffff' },
  threeD: { position: 'absolute', left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: 20 },
  threeDText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
