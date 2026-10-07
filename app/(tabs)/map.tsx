import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { MapType, Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import course from '../../src/data/course.json';
import { useTheme } from '../../src/theme';

const coords = (course.coordinates as number[][]).map(([latitude, longitude]) => ({ latitude, longitude }));
const MAP_TYPES: MapType[] = ['standard', 'hybrid', 'satellite'];

function Fab({ icon, onPress, label }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, { backgroundColor: t.card, borderColor: t.border }, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={22} color={t.text} />
    </Pressable>
  );
}

export default function MapScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [hasLocation, setHasLocation] = useState(false);

  const fit = () =>
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 40, bottom: 120, left: 40 },
      animated: true,
    });

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then((r) => setHasLocation(r.granted));
  }, []);

  const sharedGpx = useMemo(() => Asset.fromModule(require('../../assets/data/CM100.gpx')), []);
  const shareGpx = async () => {
    try {
      await sharedGpx.downloadAsync();
      if (!sharedGpx.localUri) throw new Error('GPX file unavailable');
      await Sharing.shareAsync(sharedGpx.localUri, { mimeType: 'application/gpx+xml', UTI: 'com.topografix.gpx' });
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
        showsCompass
        showsScale
        onMapReady={fit}
        initialRegion={{
          latitude: (course.bounds.minLat + course.bounds.maxLat) / 2,
          longitude: (course.bounds.minLon + course.bounds.maxLon) / 2,
          latitudeDelta: 0.5,
          longitudeDelta: 0.4,
        }}
      >
        <Polyline coordinates={coords} strokeColor={t.accent} strokeWidth={4} />
        <Marker coordinate={coords[0]} title="Start" description="Westling Ranch, Wilsall" pinColor="green" />
        <Marker coordinate={coords[coords.length - 1]} title="Finish" description="Berg Ranch, Lennep" pinColor="red" />
      </MapView>

      <View style={[styles.bar, { top: insets.top + 12 }]}>
        <Fab label="Fit course" icon="scan" onPress={fit} />
        <Fab
          label="Change map style"
          icon="layers"
          onPress={() => setMapType(MAP_TYPES[(MAP_TYPES.indexOf(mapType) + 1) % MAP_TYPES.length])}
        />
        <Fab label="Share GPX" icon="download" onPress={shareGpx} />
      </View>

      <View style={[styles.pill, { backgroundColor: t.card, borderColor: t.border }]}>
        <Text style={{ color: t.text, fontWeight: '700' }}>{course.totalMiles} mi</Text>
        <Text style={{ color: t.muted, fontSize: 12 }}> · {mapType} map · offline maps coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', right: 12, gap: 10 },
  fab: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pill: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
});
