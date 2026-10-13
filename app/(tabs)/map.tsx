import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { MapType, Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OfflineNotice } from '../../src/components/ui';
import { useOnline } from '../../src/data/online';
import { AID_STATIONS } from '../../src/data/aidStations';
import course from '../../src/data/course.json';
import { RACE } from '../../src/data/race';
import { stationColor } from '../../src/stationStyle';
import { useTheme } from '../../src/theme';
import { useUnits } from '../../src/units';
import { TAB_BAR_CLEARANCE } from '../../src/tabBar';

const coords = (course.coordinates as number[][]).map(([latitude, longitude]) => ({ latitude, longitude }));
const STYLES: { type: MapType; label: string; swatch: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { type: 'standard', label: 'Terrain', swatch: '#6aaa64', icon: 'terrain' },
  { type: 'hybrid', label: 'Hybrid', swatch: '#3d5a47', icon: 'layers-triple' },
  { type: 'satellite', label: 'Satellite', swatch: '#27402f', icon: 'satellite-variant' },
];

const SHEET_EXTRA = 170; // height of the live tracking section when pulled up
const PEEK_H = 58; // visible height of the minimized sheet

// Zoomed out: two-letter code. Zoomed in: code plus mile marker.
const NEAR_DELTA = 0.22;

// Station marker. Zoomed out it is a compact badge with the station code; zoomed in it becomes a white label with the
// name and mile next to the badge. Both sit on a small pointer so the point is clear.
function StationPin({ code, name, mile, color, near, small }: { code: string; name: string; mile: number; color: string; near: boolean; small?: boolean }) {
  const u = useUnits();
  const badge = (
    <View style={[styles.badge, small && styles.badgeSmall, { backgroundColor: color }]}>
      <Text style={[styles.badgeText, small && { fontSize: 10 }]}>{code}</Text>
    </View>
  );
  return (
    <View style={styles.pinWrap}>
      {near ? (
        <View style={styles.label}>
          {badge}
          <View style={styles.labelBody}>
            <Text style={styles.labelName} numberOfLines={1}>{name}</Text>
            <Text style={styles.labelMile}>{u.dist(Math.round(mile * 10) / 10)}</Text>
          </View>
        </View>
      ) : (
        badge
      )}
      <View style={[styles.pointer, { borderTopColor: near ? '#ffffff' : color }]} />
    </View>
  );
}

export default function MapScreen() {
  const t = useTheme();
  const u = useUnits();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const online = useOnline();
  // The no-service banner can be dismissed; it comes back the next time service drops.
  const [noticeHidden, setNoticeHidden] = useState(false);
  useEffect(() => {
    if (online) setNoticeHidden(false);
  }, [online]);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [hasLocation, setHasLocation] = useState(false);
  // Custom marker views are snapshotted by the native map, so keep tracking on until they have drawn.
  const [pinsTracking, setPinsTracking] = useState(true);
  const [near, setNear] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [showStations, setShowStations] = useState(true);

  // Bottom sheet with three positions: -1 minimized (peek), 0 default, 1 pulled up to show live tracking.
  const { tracking } = useLocalSearchParams<{ tracking?: string }>();
  const sheet = useRef(new Animated.Value(0)).current;
  const level = useRef(0);
  const [hideDist, setHideDist] = useState(110);
  const hideRef = useRef(110);
  const sheetVal = useRef(0);
  const [mini, setMini] = useState(false);
  useEffect(() => {
    const id = sheet.addListener(({ value }) => {
      sheetVal.current = value;
      setMini((m) => (m === value < -0.4 ? m : value < -0.4));
    });
    return () => sheet.removeListener(id);
  }, [sheet]);
  const goTo = useCallback(
    (l: number) => {
      level.current = l;
      Animated.timing(sheet, { toValue: l, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    },
    [sheet],
  );
  useEffect(() => {
    if (tracking) goTo(1);
  }, [tracking, goTo]);
  const sheetPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => {
          const range = g.dy < 0 ? SHEET_EXTRA : hideRef.current;
          sheet.setValue(Math.min(Math.max(level.current - g.dy / range, -1), 1));
        },
        onPanResponderRelease: (_e, g) => {
          const step = g.dy < -30 ? 1 : g.dy > 30 ? -1 : 0;
          goTo(Math.min(Math.max(level.current + step, -1), 1));
        },
        onPanResponderTerminate: () => goTo(level.current),
      }),
    [sheet, goTo],
  );
  const extraHeight = sheet.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 0, SHEET_EXTRA] });
  const sheetShift = sheet.interpolate({ inputRange: [-1, 0, 1], outputRange: [hideDist, 0, 0] });
  const detailOpacity = sheet.interpolate({ inputRange: [-1, -0.5, 0, 1], outputRange: [0, 0, 1, 1] });
  useEffect(() => {
    setPinsTracking(true);
    const id = setTimeout(() => setPinsTracking(false), 1200);
    return () => clearTimeout(id);
  }, [near]);

  const fit = () =>
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 60, right: 40, bottom: 260 + TAB_BAR_CLEARANCE, left: 40 },
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
            title={`${st.name} (${u.metric ? 'km' : 'mi'} ${u.distNum(st.mile)})`}
            description={st.cutoff ? `Cutoff ${st.cutoff} · tap for details` : 'Tap for details'}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={pinsTracking}
            onCalloutPress={() => router.push({ pathname: '/aid/[id]', params: { id: st.id } })}
          >
            <StationPin code={st.code} name={st.name.replace(/^(Start|Finish): /, '').replace(/^Westling Ranch$/, 'Start')} mile={st.mile} color={stationColor(st, t)} near={near} small={st.kind === 'cutoff'} />
          </Marker>
        ))}
      </MapView>
      {!online && !noticeHidden && (
        <OfflineNotice style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12 }} onDismiss={() => setNoticeHidden(true)}>
          No signal. The map background may be blank, but the course line, aid stations and your location still show.
        </OfflineNotice>
      )}

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
                      <MaterialCommunityIcons name={o.icon} size={28} color="#ffffff" />
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

      <Animated.View
        onLayout={(e) => {
          // Remove the tracking section's current height so the base card size is measured, even mid-animation.
          const base = e.nativeEvent.layout.height - SHEET_EXTRA * Math.max(sheetVal.current, 0);
          const d = Math.min(Math.max(base - PEEK_H, 60), 160);
          if (Math.abs(d - hideRef.current) > 1) {
            hideRef.current = d;
            setHideDist(d);
          }
        }}
        style={[styles.card, { backgroundColor: t.card, borderColor: t.border, bottom: 12 + TAB_BAR_CLEARANCE, transform: [{ translateY: sheetShift }] }]}
        {...sheetPan.panHandlers}
      >
        <Pressable onPress={() => goTo(level.current === -1 ? 0 : level.current === 0 ? 1 : 0)} hitSlop={10} style={styles.handleWrap} accessibilityLabel="Toggle live tracking">
          <View style={[styles.handle, { backgroundColor: t.border }]} />
        </Pressable>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: t.text }]}>{mini ? 'Tracking & GPX' : 'Crazy Mountain 100'}</Text>
            {!mini && <Text style={[styles.cardSub, { color: t.muted }]}>{`${u.dist(course.totalMiles)} · Wilsall to Lennep`}</Text>}
          </View>
          {!mini && (
          <Pressable onPress={() => router.push('/gpx')} style={[styles.gpx, { backgroundColor: t.primary }]}>
            <Ionicons name="download-outline" size={16} color="#ffffff" />
            <Text style={styles.gpxText}>GPX</Text>
          </Pressable>
          )}
        </View>
        <Animated.View style={{ opacity: detailOpacity }}>
        <Pressable onPress={() => goTo(level.current === 1 ? 0 : 1)} style={[styles.trackRow, { backgroundColor: t.primarySoft }]}>
          <Ionicons name="radio" size={18} color={t.primary} />
          <Text style={[styles.trackLabel, { color: t.primary }]}>Live runner tracking</Text>
          <Animated.View style={{ transform: [{ rotate: sheet.interpolate({ inputRange: [-1, 0, 1], outputRange: ['0deg', '0deg', '180deg'] }) }] }}>
            <Ionicons name="chevron-up" size={18} color={t.primary} />
          </Animated.View>
        </Pressable>
        </Animated.View>
        <Animated.View style={{ height: extraHeight, overflow: 'hidden', opacity: sheet.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 0, 1] }) }}>
          <Text style={[styles.trackBody, { color: t.text }]}>
            Runners carry race-provided GPS trackers, and positions appear live on Trackleaders. It needs cell service, so crews in dead
            zones will see stale positions.
          </Text>
          <Pressable
            onPress={() =>
              online
                ? WebBrowser.openBrowserAsync(RACE.trackingUrl)
                : Alert.alert('No signal', 'Live tracking needs cell service or Wi-Fi. Try again when you have a connection.')
            }
            style={[styles.trackBtn, { backgroundColor: t.primary }]}>
            <Text style={styles.trackBtnText}>Open live tracking</Text>
            <Ionicons name="open-outline" size={16} color="#ffffff" />
          </Pressable>
          <Text style={[styles.trackNote, { color: t.muted }]}>Coming: runners shown directly on this map.</Text>
        </Animated.View>
        <Animated.Text style={[styles.hint, { color: t.muted, opacity: detailOpacity }]}>Offline map downloads are coming soon.</Animated.Text>
      </Animated.View>
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
  badge: { minWidth: 34, height: 34, borderRadius: 12, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  badgeSmall: { minWidth: 26, height: 26, borderRadius: 9, borderWidth: 2.5 },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingLeft: 4, paddingRight: 12, borderRadius: 16, backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  labelBody: { maxWidth: 130 },
  labelName: { color: '#1c2b36', fontSize: 12.5, fontWeight: '800' },
  labelMile: { color: '#5b6770', fontSize: 11, fontWeight: '700', marginTop: -1 },
  pointer: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -2 },
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
  handleWrap: { alignItems: 'center', paddingBottom: 8 },
  handle: { width: 40, height: 5, borderRadius: 3 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  trackLabel: { flex: 1, fontSize: 14, fontWeight: '800' },
  trackBody: { fontSize: 14, lineHeight: 20, marginTop: 12 },
  trackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  trackBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  trackNote: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  card: { position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: 22, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  cardSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  gpx: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  gpxText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  hint: { fontSize: 12, marginTop: 8, textAlign: 'center' },
});
