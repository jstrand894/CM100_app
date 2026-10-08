import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, PanResponder, Platform, Pressable, ScrollView, useWindowDimensions, StyleSheet, Text, View } from 'react-native';
import { AnimatedNumber } from '../../src/components/AnimatedNumber';
import { LegProfile } from '../../src/components/LegProfile';
import { Card, DetailHeader, SectionTitle, tint } from '../../src/components/ui';
import { AID_STATIONS, AidStation, CREW_LABEL } from '../../src/data/aidStations';
import { TRAIL } from '../../src/data/trail';
import { CREW_DRIVE, CUTOFF_HOURS, clockLabel } from '../../src/data/pace';
import { stationColor } from '../../src/stationStyle';
import { useTheme } from '../../src/theme';

// Bottom prev/next buttons are tight on space; the visit suffix is never needed there because the two Cow Camps are never neighbours.
const navName = (n: string) => shortName(n).replace(/ \(.*\)$/, '');
const shortName = (n: string) => n.replace(/^(Start|Finish): /, '');
const fmt = (n: number) => n.toLocaleString();

function Fact({ icon, label, value, copyText, half }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; copyText?: string; half?: boolean }) {
  const t = useTheme();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    await Clipboard.setStringAsync(copyText!);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };
  const body = (
    <View style={[styles.fact, half && { width: '47%' }]}>
      <View style={[styles.factIcon, { backgroundColor: t.primarySoft }]}>
        <Ionicons name={icon} size={18} color={t.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.factLabel, { color: t.muted }]}>{label}</Text>
        <Text style={[styles.factValue, { color: t.text }]}>{value}</Text>
      </View>
      {copyText && (
        <View style={styles.copyHint}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={t.primary} />
          <Text style={[styles.copyText, { color: t.primary }]}>{copied ? 'Copied' : 'Copy'}</Text>
        </View>
      )}
    </View>
  );
  return copyText ? (
    <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel={`Copy ${label}`} style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

function Pill({ label, color, icon }: { label: string; color: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
      {icon && <Ionicons name={icon} size={13} color={color} />}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export default function AidStationDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  // The stack's full-screen swipe-back would otherwise steal a rightward swipe on the graph, so it is switched off while a finger is on it.
  const lockBack = (locked: boolean) => navigation.setOptions({ gestureEnabled: !locked });
  // Prev/next switch stations in place (rather than pushing routes), so Back always returns to where you came from.
  const [idx, setIdx] = useState(() => AID_STATIONS.findIndex((s) => s.id === id));
  const [legMode, setLegMode] = useState<'from' | 'to'>('from'); // what the rocker says
  const [shownMode, setShownMode] = useState<'from' | 'to'>('from'); // what the leg content shows (lags behind during the animation)
  const [segW, setSegW] = useState(0);
  const thumb = useRef(new Animated.Value(0)).current;
  const legFade = useRef(new Animated.Value(1)).current;
  const legSlide = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(0)).current; // trail description: travels the full width, in step with the graph
  const textFade = useRef(new Animated.Value(1)).current;
  const switchLeg = (m: 'from' | 'to') => {
    if (m === legMode) return;
    setLegMode(m);
    Animated.timing(thumb, { toValue: m === 'to' ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    // Content slides out the way the rocker moves, swaps, then slides in from the other side.
    const dir = m === 'to' ? 1 : -1;
    Animated.parallel([
      Animated.timing(legFade, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(legSlide, { toValue: -dir * 28, duration: 120, useNativeDriver: true }),
      Animated.timing(textFade, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(textSlide, { toValue: -dir * width, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setShownMode(m);
      legSlide.setValue(dir * 28);
      textSlide.setValue(dir * width);
      Animated.parallel([
        Animated.timing(legFade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(legSlide, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(textFade, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(textSlide, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  };
  const { width } = useWindowDimensions();
  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const scroller = useRef<ScrollView>(null);
  const busy = useRef(false);
  const go = (to: number) => {
    if (busy.current) return;
    busy.current = true;
    const dir = to > idx ? 1 : -1;
    const ease = Easing.out(Easing.cubic);
    // White body slides off in the direction of travel and the new one slides in from the other side; the blue header just fades.
    Animated.parallel([
      Animated.timing(slide, { toValue: -dir * width, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setIdx(to);
      scroller.current?.scrollTo({ y: 0, animated: false });
      slide.setValue(dir * width);
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 260, easing: ease, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start(() => {
        busy.current = false;
      });
    });
  };
  // Swiping the graph flips the rocker: drag left to bring in the next leg, right for the previous one.
  const swipeState = useRef({ go: switchLeg, canPrev: false, canNext: false });
  useEffect(() => {
    swipeState.current = { go: switchLeg, canPrev: idx > 0, canNext: idx < AID_STATIONS.length - 1 };
  });
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        const sw = swipeState.current;
        if (g.dx < -40 && sw.canNext) sw.go('to');
        else if (g.dx > 40 && sw.canPrev) sw.go('from');
      },
    })
  ).current;
  const station: AidStation | undefined = AID_STATIONS[idx];
  if (!station)
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <DetailHeader title="Not found" />
      </View>
    );

  const prev = idx > 0 ? AID_STATIONS[idx - 1] : null;
  const next = idx < AID_STATIONS.length - 1 ? AID_STATIONS[idx + 1] : null;
  const isCutoffOnly = station.kind === 'cutoff';
  const color = stationColor(station, t);
  const cutoffHours = CUTOFF_HOURS[station.id];
  const drive = CREW_DRIVE.find((d) => d.id === station.id);
  // The leg shown under "At a glance": into this station, or out of it toward the next one.
  const resolve = (m: 'from' | 'to') => (m === 'to' ? (next ? 'to' : 'from') : prev ? 'from' : 'to');
  const mode = resolve(shownMode);
  const selected = resolve(legMode);
  const leg = mode === 'from' ? (prev ? { a: prev, b: station } : null) : next ? { a: station, b: next } : null;
  const statLeg = selected === 'from' ? (prev ? { a: prev, b: station } : null) : next ? { a: station, b: next } : null;
  const trail = leg ? TRAIL[leg.b.id] : undefined;
  const legMiles = statLeg ? Math.round((statLeg.b.mile - statLeg.a.mile) * 10) / 10 : 0;

  const openMaps = () => {
    const c = station.driveCoordinate!;
    const q = `${c.latitude},${c.longitude}`;
    Linking.openURL(Platform.OS === 'ios' ? `maps://?daddr=${q}` : `geo:${q}?q=${q}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Animated.View style={{ opacity: fade }}>
      <DetailHeader title={station.name} subtitle={`Mile ${station.mile}${cutoffHours != null ? ` · Cutoff ${clockLabel(cutoffHours)}` : ''}`}>
        <View style={styles.pills}>
          {station.kind === 'start' && <Pill label="Start 6:00 AM" color="#ffffff" icon="time-outline" />}
          {isCutoffOnly ? (
            <Pill label="Cutoff checkpoint only" color="#ffd166" />
          ) : (
            <Pill
              label={CREW_LABEL[station.crewAccess]}
              color={station.crewAccess === 'no' ? '#ff9b9b' : station.crewAccess === 'hike-in' ? '#ffd166' : '#8de3b0'}
              icon={station.crewAccess === 'no' ? 'close-circle' : station.crewAccess === 'hike-in' ? 'footsteps' : 'checkmark-circle'}
            />
          )}
          {station.pacerAccess && <Pill label="Pacers" color="#ffffff" icon="walk" />}
          {station.dropBags && <Pill label="Drop bags" color="#ffb26b" icon="bag-handle" />}
        </View>
      </DetailHeader>
      </Animated.View>

      <Animated.View style={{ flex: 1, transform: [{ translateX: slide }] }}>
      <ScrollView ref={scroller} contentContainerStyle={styles.content}>
        <Text style={[styles.summary, { color: t.text }]}>{station.summary}</Text>

        {station.driveCoordinate ? (
          <Pressable onPress={openMaps} style={({ pressed }) => [styles.cta, { backgroundColor: t.primary }, pressed && { opacity: 0.85 }]}>
            <Ionicons name="navigate" size={20} color="#ffffff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Directions in Maps</Text>
              <Text style={styles.ctaSub}>Needs signal. Download the area in Maps ahead of time.</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#ffffff" />
          </Pressable>
        ) : (
          station.crewAccess !== 'no' && (
            <Card>
              <Text style={[styles.note, { color: t.muted }]}>
                Parking coordinates for this station haven't been added yet. Use the written directions below. Offline routing is planned.
              </Text>
            </Card>
          )
        )}

        <SectionTitle>At a glance</SectionTitle>
        <Card style={{ gap: 14 }}>
          <View style={styles.grid}>
          <Fact half icon="flag" label="Mile" value={`${station.mile}`} />
          {station.kind === 'start' ? (
            <Fact half icon="time" label="Start time" value="Friday, 6:00 AM" />
          ) : (
            <Fact half icon="time" label="Cutoff" value={cutoffHours != null ? clockLabel(cutoffHours) : 'No cutoff here'} />
          )}
          {!isCutoffOnly && <Fact half icon="bag-handle" label="Drop bags" value={station.dropBags ? 'Yes' : 'No'} />}
          {!isCutoffOnly && <Fact half icon="walk" label="Pacers" value={station.pacerAccess ? 'Allowed' : 'Not allowed'} />}
          </View>
          {station.driveFromWilsall && <Fact icon="car" label="Drive from Wilsall" value={station.driveFromWilsall} />}
          {drive && drive.fromId !== 'start' && (
            <Fact
              icon="car-sport"
              label={`Drive from ${AID_STATIONS.find((a) => a.id === drive.fromId)?.name}`}
              value={`${drive.approx ? '~' : ''}${Math.floor(drive.minutes / 60)}h ${String(drive.minutes % 60).padStart(2, '0')}m`}
            />
          )}
          {station.locationNote && <Fact
              icon="location"
              label="Location"
              value={station.locationNote}
              copyText={
                station.driveCoordinate
                  ? `${station.driveCoordinate.latitude}, ${station.driveCoordinate.longitude}`
                  : station.locationNote
              }
            />}
        </Card>

        {leg && (
          <>
            {prev && next && (
              <View style={[styles.seg, { backgroundColor: t.card, borderColor: t.border }]} onLayout={(e) => setSegW(e.nativeEvent.layout.width)}>
                {segW > 0 && (
                  <Animated.View
                    style={[
                      styles.segThumb,
                      { backgroundColor: t.primary, width: (segW - 8) / 2, transform: [{ translateX: thumb.interpolate({ inputRange: [0, 1], outputRange: [0, (segW - 8) / 2] }) }] },
                    ]}
                  />
                )}
                {(['from', 'to'] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => switchLeg(m)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selected === m }}
                    style={styles.segBtn}
                  >
                    <Text style={[styles.segText, { color: selected === m ? '#ffffff' : t.primary }]} numberOfLines={1}>
                      {m === 'from' ? 'From previous' : 'To next'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Animated.View style={{ opacity: legFade, transform: [{ translateX: legSlide }] }}>
              <SectionTitle>{`${shortName(leg.a.name)} to ${shortName(leg.b.name)}`}</SectionTitle>
            </Animated.View>
            <View style={styles.legRow}>
              <View style={[styles.legStat, { backgroundColor: t.card, borderColor: t.border }]}>
                <AnimatedNumber style={[styles.legValue, { color: t.text }]} value={legMiles} decimals={1} suffix=" mi" />
                <Text style={[styles.legLabel, { color: t.muted }]}>Distance</Text>
              </View>
              <View style={[styles.legStat, { backgroundColor: t.card, borderColor: t.border }]}>
                <AnimatedNumber style={[styles.legValue, { color: t.text }]} value={statLeg!.b.gainFt!} prefix="+" />
                <Text style={[styles.legLabel, { color: t.muted }]}>Climb (ft)</Text>
              </View>
              <View style={[styles.legStat, { backgroundColor: t.card, borderColor: t.border }]}>
                <AnimatedNumber style={[styles.legValue, { color: t.text }]} value={statLeg!.b.lossFt ?? 0} prefix="−" />
                <Text style={[styles.legLabel, { color: t.muted }]}>Descent (ft)</Text>
              </View>
            </View>
            <View style={{ marginTop: 14, marginBottom: 4 }} {...swipe.panHandlers} onTouchStart={() => lockBack(true)} onTouchEnd={() => lockBack(false)} onTouchCancel={() => lockBack(false)}>
              <LegProfile
                prev={prev ? { name: shortName(prev.name), mile: prev.mile } : null}
                station={{ name: shortName(station.name), mile: station.mile }}
                next={next ? { name: shortName(next.name), mile: next.mile } : null}
                mode={selected}
                color={color}
              />
            </View>
            <Animated.View style={{ opacity: textFade, transform: [{ translateX: textSlide }] }}>
            {trail && (
              <Card style={{ gap: 12, marginTop: 10 }}>
                <Text style={[styles.noteText, { color: t.text }]}>{trail.text}</Text>
                {trail.warning && (
                  <View style={[styles.warn, { backgroundColor: tint('#e0a100', 0.14) }]}>
                    <Ionicons name="warning" size={18} color="#e0a100" />
                    <Text style={[styles.noteText, { color: t.text, fontWeight: '700' }]}>{trail.warning}</Text>
                  </View>
                )}
              </Card>
            )}
            </Animated.View>
          </>
        )}

        {station.details.length > 0 && (
          <>
            <SectionTitle>Crew notes</SectionTitle>
            <Card style={{ paddingVertical: 6 }}>
              {station.details.map((d, i) => (
                <View key={d} style={[styles.note2, i > 0 && { borderTopWidth: 1, borderTopColor: t.border }]}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={[styles.noteText, { color: t.text }]}>{d}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        <View style={styles.nav}>
          {prev ? (
            <Pressable onPress={() => go(idx - 1)} accessibilityRole="button" accessibilityLabel={`Previous: ${navName(prev.name)}`} style={({ pressed }) => [styles.navBtn, { backgroundColor: t.card, borderColor: t.border }, pressed && { opacity: 0.7 }]}>
              <Ionicons name="chevron-back" size={22} color={t.primary} />
              <View style={styles.navCol}>
                <Text style={[styles.navCaption, { color: t.muted }]}>PREVIOUS</Text>
                <Text style={[styles.navText, { color: t.text }]} numberOfLines={1}>{navName(prev.name)}</Text>
                <Text style={[styles.navMiles, { color: t.muted }]}>{Math.round((station.mile - prev.mile) * 10) / 10} mi back</Text>
              </View>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {next ? (
            <Pressable onPress={() => go(idx + 1)} accessibilityRole="button" accessibilityLabel={`Next: ${navName(next.name)}`} style={({ pressed }) => [styles.navBtn, { backgroundColor: t.card, borderColor: t.border }, pressed && { opacity: 0.7 }]}>
              <View style={[styles.navCol, { alignItems: 'flex-end' }]}>
                <Text style={[styles.navCaption, { color: t.muted }]}>NEXT</Text>
                <Text style={[styles.navText, { color: t.text }]} numberOfLines={1}>{navName(next.name)}</Text>
                <Text style={[styles.navMiles, { color: t.muted }]}>{Math.round((next.mile - station.mile) * 10) / 10} mi ahead</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={t.primary} />
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
      </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  pillText: { fontSize: 13, fontWeight: '800' },
  summary: { fontSize: 15, lineHeight: 22, marginBottom: 14 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16 },
  ctaTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  ctaSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 },
  note: { fontSize: 14, lineHeight: 20 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  factIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 14 },
  copyHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { fontSize: 13, fontWeight: '800' },
  factLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  factValue: { fontSize: 16, fontWeight: '600', marginTop: 1 },
  legRow: { flexDirection: 'row', gap: 10 },
  legStat: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  legValue: { fontSize: 18, fontWeight: '900' },
  legLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  note2: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  noteText: { flex: 1, fontSize: 14, lineHeight: 21 },
  warn: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, alignItems: 'flex-start' },
  seg: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4, marginTop: 20 },
  segThumb: { position: 'absolute', top: 4, left: 4, bottom: 4, borderRadius: 11 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9 },
  segText: { fontSize: 14, fontWeight: '800' },
  nav: { flexDirection: 'row', gap: 10, marginTop: 20 },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1 },
  navCol: { flex: 1 },
  navCaption: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  navText: { fontSize: 16, fontWeight: '800', marginTop: 1 },
  navMiles: { fontSize: 12, fontWeight: '600', marginTop: 1 },
});
