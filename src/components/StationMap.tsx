import { useRef } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { stationRoute } from '../data/stationRoute';
import { stationColor } from '../stationStyle';
import { useTheme } from '../theme';
import { StationMapFrame } from './StationMapFrame';

/** The stretch of course into and out of one aid station, on a real map. */
export function StationMap({ id }: { id: string }) {
  const t = useTheme();
  const route = stationRoute(id);
  if (!route) return null;
  return <StationMapFrame route={route} render={(expanded) => <Inner expanded={expanded} id={id} />} />;
}

function Inner({ id, expanded }: { id: string; expanded: boolean }) {
  const t = useTheme();
  const ref = useRef<MapView>(null);
  const route = stationRoute(id)!;
  const fit = () =>
    ref.current?.fitToCoordinates(route.all, { edgePadding: { top: expanded ? 110 : 40, right: 40, bottom: expanded ? 110 : 40, left: 40 }, animated: false });
  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={ref}
        style={{ flex: 1 }}
        mapType="standard"
        scrollEnabled={expanded}
        zoomEnabled={expanded}
        rotateEnabled={expanded}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsCompass={false}
        onMapReady={() => setTimeout(fit, 250)}
        initialRegion={{ ...route.station.courseCoordinate, latitudeDelta: 0.2, longitudeDelta: 0.2 }}
      >
        {route.before.length > 1 && <Polyline coordinates={route.before} strokeColor="#ffffff" strokeWidth={7} />}
        {route.after.length > 1 && <Polyline coordinates={route.after} strokeColor="#ffffff" strokeWidth={7} />}
        {route.before.length > 1 && <Polyline coordinates={route.before} strokeColor={t.primary} strokeWidth={4} />}
        {route.after.length > 1 && <Polyline coordinates={route.after} strokeColor={t.accent} strokeWidth={4} />}
        {[route.prev, route.station, route.next].map(
          (s) => s && <Marker key={s.id} coordinate={s.courseCoordinate} title={s.name} pinColor={s.id === route.station.id ? stationColor(s, t) : undefined} opacity={s.id === route.station.id ? 1 : 0.8} />,
        )}
      </MapView>
    </View>
  );
}
