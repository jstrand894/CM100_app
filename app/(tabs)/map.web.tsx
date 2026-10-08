import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Polyline, Text as SvgText } from 'react-native-svg';
import { Card } from '../../src/components/ui';
import { AID_STATIONS } from '../../src/data/aidStations';
import course from '../../src/data/course.json';
import { RACE } from '../../src/data/race';
import { stationColor } from '../../src/stationStyle';
import { BRAND_BLUE, useTheme } from '../../src/theme';

// The interactive map uses a native map view that the web does not have, so on the web the Map tab draws the route
// itself and links out to a full map app for directions.
const { minLat, maxLat, minLon, maxLon } = course.bounds;
const lonScale = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
const W = 360;
const H = Math.round((W * (maxLat - minLat)) / ((maxLon - minLon) * lonScale));
const PAD = 22;
const SHOW_W = 230; // keeps the tall course from filling the whole screen before the buttons
const project = (lat: number, lon: number) => ({
  x: PAD + ((lon - minLon) / (maxLon - minLon)) * (W - PAD * 2),
  y: PAD + ((maxLat - lat) / (maxLat - minLat)) * (H - PAD * 2),
});

const mapsUrl = (lat: number, lon: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

export default function MapScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const line = useMemo(
    () =>
      (course.coordinates as number[][])
        .map(([la, lo]) => {
          const p = project(la, lo);
          return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        })
        .join(' '),
    [],
  );
  const gpxUrl = useMemo(() => Asset.fromModule(require('../../assets/data/CM100.gpx')).uri, []);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Map</Text>
        <Text style={styles.headerSub}>Course overview and aid station locations</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ padding: 8, alignItems: 'center' }}>
          <Svg viewBox={`0 0 ${W} ${H}`} width={SHOW_W} height={Math.round((SHOW_W * H) / W)} accessibilityLabel="Course route with aid stations">
            <Polyline points={line} fill="none" stroke="#ffffff" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
            <Polyline points={line} fill="none" stroke={t.accent} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
            {AID_STATIONS.map((s) => {
              const p = project(s.courseCoordinate.latitude, s.courseCoordinate.longitude);
              return (
                <G key={s.id}>
                  <Circle cx={p.x} cy={p.y} r={9} fill={stationColor(s, t)} stroke="#ffffff" strokeWidth={2} />
                  <SvgText x={p.x} y={p.y + 3.2} fontSize={8} fontWeight="800" fontFamily="system-ui, sans-serif" fill="#ffffff" textAnchor="middle">
                    {s.code}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </Card>

        <View style={styles.actions}>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(RACE.trackingUrl)} style={[styles.btn, { backgroundColor: t.primary }]}>
            <Ionicons name="radio" size={18} color="#ffffff" />
            <Text style={styles.btnText}>Live tracking</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(gpxUrl)} style={[styles.btn, { backgroundColor: t.primarySoft }]}>
            <Ionicons name="download-outline" size={18} color={t.primary} />
            <Text style={[styles.btnText, { color: t.primary }]}>Course GPX</Text>
          </Pressable>
        </View>

        <Text style={[styles.heading, { color: t.muted }]}>AID STATIONS</Text>
        {AID_STATIONS.map((s) => {
          const c = s.driveCoordinate ?? s.courseCoordinate;
          return (
            <View key={s.id} style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={[styles.dot, { backgroundColor: stationColor(s, t) }]}>
                <Text style={styles.dotText}>{s.code}</Text>
              </View>
              <Pressable onPress={() => router.push(`/aid/${s.id}`)} style={{ flex: 1 }} accessibilityRole="button">
                <Text style={[styles.name, { color: t.text }]}>{s.name}</Text>
                <Text style={[styles.mile, { color: t.muted }]}>
                  {`Mile ${s.mile}${s.driveCoordinate ? ' · parking location' : ' · on the course'}`}
                </Text>
              </Pressable>
              <Pressable onPress={() => Linking.openURL(mapsUrl(c.latitude, c.longitude))} hitSlop={8} style={[styles.go, { backgroundColor: t.primarySoft }]} accessibilityLabel={`Open ${s.name} in Maps`}>
                <Ionicons name="navigate" size={18} color={t.primary} />
              </Pressable>
            </View>
          );
        })}
        <Text style={[styles.note, { color: t.muted }]}>
          The full interactive map with your location and satellite view is in the mobile app. Directions open in your maps app and need signal.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: BRAND_BLUE, paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  headerSub: { color: '#bcd6e6', fontSize: 14, fontWeight: '600', marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 12 },
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  heading: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 12, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '800' },
  mile: { fontSize: 12, marginTop: 2 },
  go: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 12, lineHeight: 18, marginTop: 6, marginHorizontal: 4, textAlign: 'center' },
});
