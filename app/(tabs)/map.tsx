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
import { useTheme } from '../../src/theme';

const coords = (course.coordinates as number[][]).map(([latitude, longitude]) => ({ latitude, longitude }));
const STYLES: { type: MapType; label: string }[] = [
  { type: 'standard', label: 'Terrain' },
  { type: 'hybrid', label: 'Hybrid' },
  { type: 'satellite', label: 'Satellite' },
];

const pinColor = (kind: string) => (kind === 'start' ? 'green' : kind === 'finish' ? 'red' : kind === 'cutoff' ? 'yellow' : 'orange');

export default function MapScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [hasLocation, setHasLocation] = useState(false);

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
        initialRegion={{
          latitude: (course.bounds.minLat + course.bounds.maxLat) / 2,
          longitude: (course.bounds.minLon + course.bounds.maxLon) / 2,
          latitudeDelta: 0.5,
          longitudeDelta: 0.4,
        }}
      >
        <Polyline coordinates={coords} strokeColor="#ffffff" strokeWidth={7} />
        <Polyline coordinates={coords} strokeColor={t.accent} strokeWidth={4} />
        {AID_STATIONS.map((st) => (
          <Marker
            key={st.id}
            coordinate={st.courseCoordinate}
            title={`${st.name} (mi ${st.mile})`}
            description={st.cutoff ? `Cutoff ${st.cutoff} · tap for details` : 'Tap for details'}
            pinColor={pinColor(st.kind)}
            onCalloutPress={() => router.push({ pathname: '/aid/[id]', params: { id: st.id } })}
          />
        ))}
      </MapView>

      <View style={[styles.floatingBtns, { top: insets.top + 12 }]}>
        <RoundButton icon="locate" label="My location" onPress={locate} />
        <RoundButton icon="scan" label="Fit course" onPress={fit} />
      </View>

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
        <View style={[styles.segment, { backgroundColor: t.primarySoft }]}>
          {STYLES.map((s) => {
            const on = s.type === mapType;
            return (
              <Pressable key={s.type} onPress={() => setMapType(s.type)} style={[styles.segBtn, on && { backgroundColor: t.card }]}>
                <Text style={[styles.segText, { color: on ? t.primary : t.muted }]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.hint, { color: t.muted }]}>Offline map downloads are coming soon.</Text>
      </View>
    </View>
  );
}

function RoundButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.round, { backgroundColor: t.card, borderColor: t.border }, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={22} color={t.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  floatingBtns: { position: 'absolute', right: 12, gap: 10 },
  round: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: 22, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  cardSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  gpx: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  gpxText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  segText: { fontSize: 13, fontWeight: '800' },
  hint: { fontSize: 12, marginTop: 10, textAlign: 'center' },
});
