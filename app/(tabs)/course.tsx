import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ElevationChart } from '../../src/components/ElevationChart';
import { tint } from '../../src/components/ui';
import { AID_STATIONS, AidStation, CREW_LABEL, CrewAccess } from '../../src/data/aidStations';
import { COURSE_STATS, elevationAtMile } from '../../src/data/elevationUtil';
import { stationColor } from '../../src/stationStyle';
import { BRAND_BLUE, Theme, useTheme } from '../../src/theme';

const crewColor = (a: CrewAccess, t: Theme) => ({ yes: t.green, 'hike-in': t.amber, no: t.red })[a];
const badgeColor = stationColor;

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
          <Chip label={`${miles} mi`} color={t.muted} icon="walk" />
          {next.gainFt != null && <Chip label={`+${fmt(next.gainFt)} ft`} color={t.muted} icon="trending-up" />}
          {next.lossFt != null && <Chip label={`−${fmt(next.lossFt)} ft`} color={t.muted} icon="trending-down" />}
        </View>
      </View>
    </View>
  );
}

const PANEL_H = 330;
const RAISED = 'rgba(255,255,255,0.1)';
const raceGain = AID_STATIONS.reduce((n, a) => n + (a.gainFt ?? 0), 0);
const raceLoss = AID_STATIONS.reduce((n, a) => n + (a.lossFt ?? 0), 0);

// Sections ranked by climbing per mile, for the "toughest sections" list.
const TOUGHEST = AID_STATIONS.map((st, i) => {
  if (i === 0 || st.gainFt == null) return null;
  const miles = st.mile - AID_STATIONS[i - 1].mile;
  return miles > 0 ? { st, miles, perMile: st.gainFt / miles } : null;
})
  .filter((x): x is { st: AidStation; miles: number; perMile: number } => x != null)
  .sort((a, b) => b.perMile - a.perMile)
  .slice(0, 3);

function CourseDetails({ activeId, onPick }: { activeId: string; onPick: (id: string) => void }) {
  const idx = Math.max(AID_STATIONS.findIndex((s) => s.id === activeId), 0);
  const st = AID_STATIONS[idx];
  const prev = idx > 0 ? AID_STATIONS[idx - 1] : null;
  const miles = prev ? Math.round((st.mile - prev.mile) * 10) / 10 : 0;
  const net = (st.gainFt ?? 0) - (st.lossFt ?? 0);
  return (
    <View>
      <View style={styles.statRow}>
        <Stat label="Distance" value="100 mi" />
        <Stat label="Climb" value={`${fmt(raceGain)} ft`} />
        <Stat label="Descent" value={`${fmt(raceLoss)} ft`} />
        <Stat label="High / low" value={`${(COURSE_STATS.highFt / 1000).toFixed(1)}k / ${(COURSE_STATS.lowFt / 1000).toFixed(1)}k`} />
      </View>

      <View style={[styles.block, { backgroundColor: RAISED }]}>
        <Text style={styles.blockKicker}>{prev ? 'SELECTED SECTION' : 'START'}</Text>
        <Text style={styles.blockTitle}>
          {prev ? `${prev.name.replace(/^Start: /, '')} → ${st.name.replace(/^Finish: /, '')}` : st.name}
        </Text>
        <Text style={styles.blockBody}>
          {prev
            ? `${miles} mi · +${fmt(st.gainFt ?? 0)} / −${fmt(st.lossFt ?? 0)} ft · net ${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))} ft · ${Math.round((st.gainFt ?? 0) / Math.max(miles, 0.1))} ft of climbing per mile`
            : `Mile 0 · ${Math.round(elevationAtMile(0)).toLocaleString()} ft elevation`}
        </Text>
        <Text style={styles.blockBody}>
          {prev ? `Elevation at ${st.name.replace(/^Finish: /, '')}: ${Math.round(elevationAtMile(st.mile)).toLocaleString()} ft` : ' '}
        </Text>
      </View>

      <Text style={styles.listKicker}>TOUGHEST SECTIONS</Text>
      {TOUGHEST.map((r) => (
        <Pressable key={r.st.id} onPress={() => onPick(r.st.id)} style={[styles.toughRow, { backgroundColor: RAISED }]}>
          <Text style={styles.toughName} numberOfLines={1}>
            To {r.st.name.replace(/^Finish: /, '')}
          </Text>
          <Text style={styles.toughMeta}>
            +{fmt(r.st.gainFt!)} ft in {Math.round(r.miles * 10) / 10} mi · {Math.round(r.perMile)} ft/mi
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: RAISED }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const ZOOM_SPAN = 38;

// Owns the zoom window state so per-frame updates only re-render the chart.
const ZoomChart = memo(function ZoomChart({
  activeId,
  onSelect,
  center,
  progress,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  center: Animated.Value;
  progress: Animated.Value;
}) {
  const [view, setView] = useState({ start: 0, span: ZOOM_SPAN, mile: AID_STATIONS[0].mile });
  useEffect(() => {
    let c = AID_STATIONS[0].mile, p = 0;
    const apply = () => {
      const span = ZOOM_SPAN + (100 - ZOOM_SPAN) * p;
      const start = Math.min(Math.max(c - span / 2, 0), 100 - span);
      setView((v) => (Math.abs(v.start - start) < 0.01 && Math.abs(v.span - span) < 0.01 && Math.abs(v.mile - c) < 0.01 ? v : { start, span, mile: c }));
    };
    const a = center.addListener(({ value }) => { c = value; apply(); });
    const b = progress.addListener(({ value }) => { p = value; apply(); });
    return () => { center.removeListener(a); progress.removeListener(b); };
  }, [center, progress]);
  return <ElevationChart stations={AID_STATIONS} height={185} activeStationId={activeId} onSelectStation={onSelect} tone="dark" viewStart={view.start} viewSpan={view.span} activeMile={view.mile} />;
});

export default function CourseScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const rows = useRef<Record<string, { y: number; h: number }>>({});
  const viewport = useRef(0);
  const lockUntil = useRef(0); // ignore scroll-derived updates briefly after a programmatic jump
  const [activeId, setActiveId] = useState(AID_STATIONS[0].id);

  // Pull the header down (or tap the handle) to reveal course details; drag sideways on the chart to scrub.
  const progress = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);
  const settle = useCallback(
    (open: boolean) => {
      isOpen.current = open;
      Animated.timing(progress, { toValue: open ? 1 : 0, duration: open ? 300 : 240, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    },
    [progress],
  );
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
        onPanResponderMove: (_e, g) => progress.setValue(Math.min(Math.max((isOpen.current ? 1 : 0) + g.dy / PANEL_H, 0), 1)),
        onPanResponderRelease: (_e, g) => settle(isOpen.current ? !(g.dy < -40) : g.dy > 40),
        onPanResponderTerminate: () => settle(isOpen.current),
      }),
    [progress, settle],
  );
  // Zoom center follows the selected station (animated); the chart subscribes to it directly so the
  // station list is not re-rendered on every animation frame.
  const center = useRef(new Animated.Value(AID_STATIONS[0].mile)).current;
  useEffect(() => {
    const m = AID_STATIONS.find((s) => s.id === activeId)?.mile ?? 0;
    Animated.timing(center, { toValue: m, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [activeId, center]);

  const panelHeight = progress.interpolate({ inputRange: [0, 1], outputRange: [0, PANEL_H] });

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
      <View style={[styles.header, { paddingTop: insets.top + 8 }]} {...pan.panHandlers}>
        <Text style={styles.title}>Course</Text>
        <Text style={styles.sub}>Pull down to see the whole course</Text>
        <View style={styles.chart}>
          <ZoomChart activeId={activeId} onSelect={jumpTo} center={center} progress={progress} />
        </View>
        <Animated.View style={{ height: panelHeight, overflow: 'hidden', opacity: progress }}>
          <View style={{ paddingHorizontal: 8, paddingTop: 4 }}>
            <CourseDetails activeId={activeId} onPick={jumpTo} />
          </View>
        </Animated.View>
        <Pressable onPress={() => settle(!isOpen.current)} hitSlop={12} style={styles.handleWrap} accessibilityLabel="Toggle course details">
          <View style={styles.handle} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        onScrollBeginDrag={() => isOpen.current && settle(false)}
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
  handleWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 2 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  statRow: { flexDirection: 'row', gap: 6 },
  stat: { flex: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 8 },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  statValue: { color: '#ffffff', fontSize: 15, fontWeight: '900', marginTop: 2 },
  block: { borderRadius: 14, padding: 12, marginTop: 8 },
  blockKicker: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  blockTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginTop: 2 },
  blockBody: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  listKicker: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginTop: 10, marginBottom: 5 },
  toughRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 4, gap: 8 },
  toughName: { color: '#ffffff', fontSize: 13, fontWeight: '800', flexShrink: 1 },
  toughMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
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
