import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { MapType, Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { stationRoute } from '../data/stationRoute';
import { stationColor } from '../stationStyle';
import { useTheme } from '../theme';
import { StationMapFrame } from './StationMapFrame';

const shortName = (name: string) => name.replace(/^(Start|Finish): /, '').replace(/ \((1st|2nd) visit\)/, '');

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
  // Custom pins need a moment to draw before they stop being re-rendered every frame.
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setTracking(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const fit = () =>
    ref.current?.fitToCoordinates(route.all, { edgePadding: { top: expanded ? 120 : 50, right: 50, bottom: expanded ? 120 : 50, left: 50 }, animated: false });

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
        onMapReady={() => setTimeout(fit, 250)}
        initialRegion={{ ...route.station.courseCoordinate, latitudeDelta: 0.2, longitudeDelta: 0.2 }}
      >
        {route.before.length > 1 && <Polyline coordinates={route.before} strokeColor="#ffffff" strokeWidth={7} />}
        {route.after.length > 1 && <Polyline coordinates={route.after} strokeColor="#ffffff" strokeWidth={7} />}
        {route.before.length > 1 && <Polyline coordinates={route.before} strokeColor={t.primary} strokeWidth={4} />}
        {route.after.length > 1 && <Polyline coordinates={route.after} strokeColor={t.accent} strokeWidth={4} />}
        {[route.prev, route.station, route.next].map((s) => {
          if (!s) return null;
          const here = s.id === route.station.id;
          return (
            <Marker key={s.id} coordinate={s.courseCoordinate} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={tracking} zIndex={here ? 2 : 1}>
              <View style={styles.pin}>
                <View style={[styles.label, { backgroundColor: here ? stationColor(s, t) : '#ffffff' }]}>
                  <Text style={[styles.labelText, { color: here ? '#ffffff' : '#1c2b36' }]} numberOfLines={1}>
                    {shortName(s.name)}
                  </Text>
                </View>
                <View style={[styles.dot, { backgroundColor: stationColor(s, t), width: here ? 18 : 14, height: here ? 18 : 14 }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>
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
  pin: { alignItems: 'center' },
  label: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 3, maxWidth: 150, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },
  labelText: { fontSize: 12, fontWeight: '800' },
  dot: { borderRadius: 9, borderWidth: 2.5, borderColor: '#ffffff' },
  threeD: { position: 'absolute', left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: 20 },
  threeDText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
