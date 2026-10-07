import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ElevationChart } from '../../src/components/ElevationChart';
import { tint } from '../../src/components/ui';
import { AID_STATIONS, AidStation, CREW_LABEL, CrewAccess } from '../../src/data/aidStations';
import { BRAND_BLUE, Theme, useTheme } from '../../src/theme';

const crewColor = (a: CrewAccess, t: Theme) => ({ yes: t.green, 'hike-in': t.amber, no: t.red })[a];
// Mile badge color: start/finish are green, cutoff-only checkpoints amber, and aid stations follow their crew access.
const badgeColor = (s: AidStation, t: Theme) =>
  s.kind === 'start' || s.kind === 'finish' ? t.green : s.kind === 'cutoff' ? t.amber : s.crewAccess === 'no' ? t.red : s.crewAccess === 'hike-in' ? t.amber : t.primary;

function Chip({ label, color, icon }: { label: string; color: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.chip, { backgroundColor: tint(color) }]}>
      {icon && <Ionicons name={icon} size={12} color={color} />}
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

export default function CourseScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const rows = useRef<Record<string, { y: number; h: number }>>({});
  const viewport = useRef(0);
  const contentH = useRef(0);
  const lockUntil = useRef(0); // ignore scroll-derived updates briefly after a programmatic jump
  const [activeId, setActiveId] = useState(AID_STATIONS[0].id);

  // The "focus line" slides from the top of the viewport (scrolled to top) to the bottom (scrolled to
  // the end), so every station, including the first and last, can become active.
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Date.now() < lockUntil.current) return;
    const y = e.nativeEvent.contentOffset.y;
    const maxScroll = Math.max(contentH.current - viewport.current, 1);
    const progress = Math.min(Math.max(y / maxScroll, 0), 1);
    const focus = y + progress * viewport.current;
    let found = AID_STATIONS[0].id;
    for (const s of AID_STATIONS) {
      const r = rows.current[s.id];
      if (r && focus >= r.y) found = s.id;
    }
    setActiveId((prev) => (prev === found ? prev : found));
  }, []);

  const jumpTo = useCallback((id: string) => {
    const r = rows.current[id];
    if (!r) return;
    lockUntil.current = Date.now() + 700;
    setActiveId(id);
    const maxScroll = Math.max(contentH.current - viewport.current, 0);
    scrollRef.current?.scrollTo({ y: Math.min(Math.max(r.y - 12, 0), maxScroll), animated: true });
  }, []);

  const onRowLayout = (id: string) => (e: LayoutChangeEvent) => {
    rows.current[id] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Course</Text>
        <Text style={styles.sub}>Scroll the stations or drag the profile</Text>
        <View style={[styles.chart, { backgroundColor: t.card }]}>
          <ElevationChart stations={AID_STATIONS} height={170} activeStationId={activeId} onSelectStation={jumpTo} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e) => (viewport.current = e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => (contentH.current = h)}
        contentContainerStyle={styles.content}
      >
        {AID_STATIONS.map((item) => {
          const kc = badgeColor(item, t);
          const on = item.id === activeId;
          return (
            <View key={item.id} onLayout={onRowLayout(item.id)}>
              <Link href={{ pathname: '/aid/[id]', params: { id: item.id } }} asChild>
                <Pressable
                  style={StyleSheet.flatten([
                    styles.row,
                    { backgroundColor: on ? tint(t.accent, 0.1) : t.card, borderColor: on ? t.accent : t.border, borderWidth: on ? 2 : 1 },
                  ])}
                >
                  <View style={[styles.badge, { backgroundColor: tint(kc, 0.16) }]}>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.badgeNum, { color: kc }]}>
                      {item.mile}
                    </Text>
                    <Text style={[styles.badgeLabel, { color: kc }]}>MI</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: t.text }]}>{item.name}</Text>
                    <View style={styles.chips}>
                      {item.kind === 'start' && <Chip label="Start 6:00 AM" color={t.primary} icon="time-outline" />}
                      {item.cutoff && <Chip label={`Cutoff ${item.cutoff}`} color={t.muted} icon="time-outline" />}
                      {item.kind === 'cutoff' ? (
                        <Chip label="Cutoff only" color={t.amber} />
                      ) : (
                        <Chip label={CREW_LABEL[item.crewAccess]} color={crewColor(item.crewAccess, t)} />
                      )}
                      {item.pacerAccess && <Chip label="Pacers" color={t.primary} />}
                      {item.dropBags && <Chip label="Drop bags" color={t.accent} />}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={t.muted} />
                </Pressable>
              </Link>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: BRAND_BLUE, paddingHorizontal: 12, paddingBottom: 12, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  title: { color: '#ffffff', fontSize: 26, fontWeight: '800', marginLeft: 8 },
  sub: { color: '#bcd6e6', fontSize: 13, fontWeight: '600', marginLeft: 8, marginTop: 2, marginBottom: 10 },
  chart: { borderRadius: 18, overflow: 'hidden', paddingHorizontal: 4, paddingBottom: 4 },
  content: { padding: 16, paddingTop: 14, gap: 10, paddingBottom: 60 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18, gap: 12 },
  badge: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeNum: { fontSize: 19, fontWeight: '900' },
  badgeLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  name: { fontSize: 17, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  chipText: { fontSize: 12, fontWeight: '700' },
});
