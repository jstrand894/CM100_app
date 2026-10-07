import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { MapType, Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AID_STATIONS } from '../../src/data/aidStations';
import course from '../../src/data/course.json';
import { stationColor } from '../../src/stationStyle';
import { useTheme } from '../../src/theme';

const coords = (course.coordinates as number[][]).map(([latitude, longitude]) => ({ latitude, longitude }));
const STYLES: { type: MapType; label: string; swatch: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'standard', label: 'Terrain', swatch: '#6aaa64', icon: 'trail-sign' },
  { type: 'hybrid', label: 'Hybrid', swatch: '#3d5a47', icon: 'globe' },
  { type: 'satellite', label: 'Satellite', swatch: '#27402f', icon: 'earth' },
];

// Zoomed out: two-letter code. Zoomed in: code plus mile marker.
const NEAR_DELTA = 0.22;

function StationPin({ code, mile, color, near, small }: { code: string; mile: number; color: string; near: boolean; small?: boolean }) {
  return (
    <View style={styles.pinWrap}>
      <View style={[styles.pin, small && styles.pinSmall, near && styles.pinNear, { backgroundColor: color }]}>
        <Text style={styles.pinText}>{code}</Text>
        {near && <Text style={styles.pinMile}>{`${Math.round(mile * 10) / 10} mi`}</Text>}
      </View>
      <View style={[styles.pinTip, { borderTopColor: color }]} />
    </View>
  );
}

export default function MapScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [hasLocation, setHasLocation] = useState(false);
  // Custom marker views are snapshotted by the native map, so keep tracking on until they have drawn.
  const [pinsTracking, setPinsTracking] = useState(true);
  const [near, setNear] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [showStations, setShowStations] = useState(true);
  useEffect(() => {
    setPinsTracking(true);
    const id = setTimeout(() => setPinsTracking(false), 1200);
    return () => clearTimeout(id);
  }, [near]);

  const fit = () =>
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 60, right: 40, bottom: 260, left: 40 },
      animated: true,
    });

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then((r) => setHasLocation(r.granted));
  }, []);

  const locate = async () => {
    try {
      const p = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion({ latitude: p.coords.latitude, longitude: p.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
    } catch {
      Alert.alert('Location unavailable', 'Check that location access is allowed for this app.');
    }
  };

  const gpx = useMemo(() => Asset.fromModule(require('../../assets/data/CM100.gpx')), []);
  const shareGpx = async () => {
    try {
      await gpx.downloadAsync();
      if (!gpx.localUri) throw new Error('GPX file unavailable');
      await Sharing.shareAsync(gpx.localUri, { mimeType: 'application/gpx+xml', UTI: 'com.topografix.gpx' });
    } catch (e) {
      Alert.alert('Could not share GPX', String(e));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapType={mapType}
        showsUserLocation={hasLocation}
        showsCompass={false}
        showsScale
        onMapReady={() => setTimeout(fit, 400)}
        onRegionChangeComplete={(r) => setNear(r.latitudeDelta < NEAR_DELTA)}
        initialRegion={{
          latitude: (course.bounds.minLat + course.bounds.maxLat) / 2,
          longitude: (course.bounds.minLon + course.bounds.maxLon) / 2,
          latitudeDelta: 0.5,
          longitudeDelta: 0.4,
        }}
      >
        <Polyline coordinates={coords} strokeColor="#ffffff" strokeWidth={7} />
        <Polyline coordinates={coords} strokeColor={t.accent} strokeWidth={4} />
        {showStations && AID_STATIONS.map((st) => (
          <Marker
            key={st.id}
            coordinate={st.courseCoordinate}
            title={`${st.name} (mi ${st.mile})`}
            description={st.cutoff ? `Cutoff ${st.cutoff} · tap for details` : 'Tap for details'}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={pinsTracking}
            onCalloutPress={() => router.push({ pathname: '/aid/[id]', params: { id: st.id } })}
          >
            <StationPin code={st.code} mile={st.mile} color={stationColor(st, t)} near={near} small={st.kind === 'cutoff'} />
          </Marker>
        ))}
      </MapView>

      <View style={[styles.floatingBtns, { top: insets.top + 76 }]}>
        <RoundButton icon="layers" label="Map layers" onPress={() => setLayersOpen((v) => !v)} active={layersOpen} />
        <RoundButton icon="locate" label="My location" onPress={locate} />
        <RoundButton icon="scan" label="Fit course" onPress={fit} />
      </View>

      {layersOpen && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLayersOpen(false)} accessibilityLabel="Close layers" />
          <View style={[styles.layers, { top: insets.top + 76, backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[styles.layersTitle, { color: t.muted }]}>MAP TYPE</Text>
            <View style={styles.styleRow}>
              {STYLES.map((o) => {
                const on = o.type === mapType;
                return (
                  <Pressable key={o.type} onPress={() => setMapType(o.type)} style={styles.styleOpt}>
                    <View style={[styles.swatch, { backgroundColor: o.swatch, borderColor: on ? t.primary : t.border, borderWidth: on ? 3 : 1 }]}>
                      <Ionicons name={o.icon} size={22} color="#ffffff" />
                    </View>
                    <Text style={[styles.styleLabel, { color: on ? t.primary : t.text, fontWeight: on ? '800' : '600' }]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={[styles.sep, { backgroundColor: t.border }]} />
            <Text style={[styles.layersTitle, { color: t.muted }]}>SHOW ON MAP</Text>
            <Pressable onPress={() => setShowStations((v) => !v)} style={styles.toggleRow}>
              <Ionicons name="location" size={18} color={t.primary} />
              <Text style={[styles.toggleText, { color: t.text }]}>Aid stations</Text>
              <Ionicons name={showStations ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={showStations ? t.primary : t.muted} />
            </Pressable>
          </View>
        </>
      )}

      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: t.text }]}>Crazy Mountain 100</Text>
            <Text style={[styles.cardSub, { color: t.muted }]}>{course.totalMiles} mi · Wilsall to Lennep</Text>
          </View>
          <Pressable onPress={shareGpx} style={[styles.gpx, { backgroundColor: t.primary }]}>
            <Ionicons name="download-outline" size={16} color="#ffffff" />
            <Text style={styles.gpxText}>GPX</Text>
          </Pressable>
        </View>
        <Text style={[styles.hint, { color: t.muted }]}>Offline map downloads are coming soon.</Text>
      </View>
    </View>
  );
}

function RoundButton({ icon, label, onPress, active }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.round, { backgroundColor: active ? t.primary : t.card, borderColor: t.border }, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={22} color={active ? '#ffffff' : t.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pinWrap: { alignItems: 'center' },
  pin: { minWidth: 36, height: 36, borderRadius: 18, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  pinSmall: { minWidth: 30, height: 30, borderRadius: 15 },
  pinNear: { height: 44, borderRadius: 16, paddingHorizontal: 9 },
  pinMile: { color: 'rgba(255,255,255,0.92)', fontSize: 10, fontWeight: '800', marginTop: -1 },
  pinText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  pinTip: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -2 },
  layers: { position: 'absolute', right: 68, width: 250, borderRadius: 18, borderWidth: 1, padding: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  layersTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.7, marginBottom: 10 },
  styleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  styleOpt: { alignItems: 'center', width: 68 },
  swatch: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  styleLabel: { fontSize: 12, marginTop: 6 },
  sep: { height: 1, marginVertical: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleText: { flex: 1, fontSize: 15, fontWeight: '700' },
  floatingBtns: { position: 'absolute', right: 12, gap: 10 },
  round: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: 22, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  cardSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  gpx: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  gpxText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  hint: { fontSize: 12, marginTop: 8, textAlign: 'center' },
});
