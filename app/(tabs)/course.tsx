import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
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

const fmt = (n: number) => n.toLocaleString();

// Connector between two stations: distance, climb and descent for the section leading to `next`.
function Leg({ from, next }: { from: AidStation; next: AidStation }) {
  const t = useTheme();
  const miles = Math.round((next.mile - from.mile) * 10) / 10;
  return (
    <View style={styles.leg}>
      <View style={[styles.legLine, { backgroundColor: t.border }]} />
      <View style={styles.legBody}>
        <Text style={[styles.legTo, { color: t.muted }]}>To {next.name.replace(/^Finish: /, '')}</Text>
        <View style={styles.legChips}>
          <Chip label={`${miles} mi`} color={t.primary} icon="walk" />
          {next.gainFt != null && <Chip label={`+${fmt(next.gainFt)} ft`} color={t.red} icon="trending-up" />}
          {next.lossFt != null && <Chip label={`−${fmt(next.lossFt)} ft`} color={t.green} icon="trending-down" />}
        </View>
      </View>
    </View>
  );
}

export default function CourseScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const rows = useRef<Record<string, { y: number; h: number }>>({});
  const viewport = useRef(0);
  const lockUntil = useRef(0); // ignore scroll-derived updates briefly after a programmatic jump
  const [activeId, setActiveId] = useState(AID_STATIONS[0].id);

  // The selected station always sits in a fixed slot at the top of the list. Rows snap into that slot,
  // and extra space below the last row lets the Finish scroll all the way up to it too.
  const SLOT = 12;
  const [snaps, setSnaps] = useState<number[]>([]);
  const [bottomPad, setBottomPad] = useState(300);

  const recompute = useCallback(() => {
    const measured = AID_STATIONS.map((s) => rows.current[s.id]);
    if (measured.some((r) => !r)) return;
    setSnaps(measured.map((r) => Math.max(r!.y - SLOT, 0)));
    const last = measured[measured.length - 1]!;
    setBottomPad(Math.max(viewport.current - last.h - SLOT * 2, 24));
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Date.now() < lockUntil.current) return;
    const y = e.nativeEvent.contentOffset.y + SLOT;
    let best = AID_STATIONS[0].id;
    let bestDist = Infinity;
    for (const s of AID_STATIONS) {
      const r = rows.current[s.id];
      if (!r) continue;
      const d = Math.abs(r.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = s.id;
      }
    }
    setActiveId((prev) => (prev === best ? prev : best));
  }, []);

  const jumpTo = useCallback((id: string) => {
    const r = rows.current[id];
    if (!r) return;
    lockUntil.current = Date.now() + 700;
    setActiveId(id);
    scrollRef.current?.scrollTo({ y: Math.max(r.y - SLOT, 0), animated: true });
  }, []);

  const onRowLayout = (id: string) => (e: LayoutChangeEvent) => {
    rows.current[id] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
    recompute();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Course</Text>
        <Text style={styles.sub}>Scroll the stations or drag the profile</Text>
        <View style={styles.chart}>
          <ElevationChart stations={AID_STATIONS} height={185} activeStationId={activeId} onSelectStation={jumpTo} tone="dark" />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e) => {
          viewport.current = e.nativeEvent.layout.height;
          recompute();
        }}
        snapToOffsets={snaps.length ? snaps : undefined}
        snapToEnd={false}
        decelerationRate="fast"
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      >
        {AID_STATIONS.map((item, idx) => {
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
              {idx < AID_STATIONS.length - 1 && <Leg from={item} next={AID_STATIONS[idx + 1]} />}
              {item.kind === 'finish' && (
                <Pressable
                  onPress={() => router.push('/planner')}
                  style={[styles.cta, { backgroundColor: t.primarySoft, borderColor: t.border }]}
                >
                  <View style={[styles.ctaIcon, { backgroundColor: t.primary }]}>
                    <Ionicons name="timer" size={20} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ctaTitle, { color: t.text }]}>Pace planner</Text>
                    <Text style={[styles.ctaSub, { color: t.muted }]}>When will your runner reach each station?</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={t.muted} />
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: BRAND_BLUE, paddingHorizontal: 12, paddingBottom: 10, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  title: { color: '#ffffff', fontSize: 26, fontWeight: '800', marginLeft: 8 },
  sub: { color: '#bcd6e6', fontSize: 13, fontWeight: '600', marginLeft: 8, marginTop: 2, marginBottom: 10 },
  chart: { marginHorizontal: -4 },
  content: { padding: 16, paddingTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18, gap: 12 },
  badge: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeNum: { fontSize: 19, fontWeight: '900' },
  badgeLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  name: { fontSize: 17, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  chipText: { fontSize: 12, fontWeight: '700' },
  leg: { flexDirection: 'row', minHeight: 78, paddingLeft: 0 },
  legLine: { position: 'absolute', left: 40, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  legBody: { marginLeft: 66, justifyContent: 'center', paddingVertical: 10 },
  legTo: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  legChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, marginTop: 14 },
  ctaIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { fontSize: 16, fontWeight: '800' },
  ctaSub: { fontSize: 13, marginTop: 1 },
});
