import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { useRef } from 'react';
import { Animated, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ElevationChart } from '../../src/components/ElevationChart';
import { AID_STATIONS } from '../../src/data/aidStations';
import { INFO_PAGES, MENU } from '../../src/data/info';
import { HIGHLIGHTS, RACE } from '../../src/data/race';
import { BRAND_BLUE, useTheme } from '../../src/theme';

const logo = require('../../assets/brand/cm100-logo.png');

function countdown(): { big: string; small: string } {
  const ms = new Date(RACE.startIso).getTime() - Date.now();
  if (ms > 0) {
    const days = Math.ceil(ms / 86400000);
    return { big: `${days}`, small: days === 1 ? 'day to the start' : 'days to the start' };
  }
  if (ms > -36 * 3600000) return { big: 'Race on', small: 'The race is underway' };
  return { big: 'Finished', small: 'See you next year' };
}

const TILES: { label: string; sub: string; icon: keyof typeof Ionicons.glyphMap; href: Href }[] = [
  { label: 'Course map', sub: '99.4 mi, download GPX', icon: 'map', href: '/map' },
  { label: 'Aid stations', sub: 'Profile, cutoffs, crew access', icon: 'location', href: '/course' },
  { label: 'Live tracking', sub: 'Follow your runner', icon: 'radio', href: '/track' },
  { label: 'Race weekend', sub: 'Schedule and shuttle', icon: 'calendar', href: '/info/schedule' },
  { label: 'Pace planner', sub: 'When will they arrive?', icon: 'timer', href: '/planner' },
  { label: 'Elevation', sub: 'Profile and climbing', icon: 'trending-up', href: '/elevation' },
];

const STATS = [
  { value: '100', label: 'miles' },
  { value: '23k', label: 'ft gain' },
  { value: '36', label: 'hr cutoff' },
  { value: '10k', label: 'ft high' },
];

export default function HomeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const c = countdown();
  const scrollY = useRef(new Animated.Value(0)).current;

  const heroHeight = insets.top + 250;
  // Hero stays fixed; only stretches slightly when pulling down past the top.
  const heroScale = scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.2, 1], extrapolate: 'clamp' });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Hero sits behind the scroll content; the sheet slides up over it. */}
      <View style={[styles.heroBg, { height: heroHeight + 40 }]} />
      <View style={styles.heroOverscroll} />
      <Animated.View
        style={[
          styles.hero,
          { height: heroHeight, paddingTop: insets.top + 16, transform: [{ scale: heroScale }] },
        ]}
      >
        <View style={styles.logoCard}>
          <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="Crazy Mountain 100 logo" />
        </View>
        <Text style={styles.heroDate}>{RACE.dateLabel}</Text>
        <Text style={styles.heroSub}>
          {RACE.start.split(',')[0]} → {RACE.finish.split(',')[0]}
        </Text>
      </Animated.View>

      <Animated.ScrollView
        style={StyleSheet.absoluteFill}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: heroHeight - 36 }} />
        <View style={[styles.sheet, { backgroundColor: t.bg }]}>
          <View style={[styles.grabber, { backgroundColor: t.border }]} />
        <View style={[styles.countdown, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.countBig, { color: t.accent }]}>{c.big}</Text>
          <Text style={[styles.countSmall, { color: t.muted }]}>{c.small}</Text>
        </View>

        <Pressable
          onPress={() => router.push('/course')}
          accessibilityLabel="Open the course profile"
          style={({ pressed }) => [styles.profile, { backgroundColor: BRAND_BLUE }, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.profileTop}>
            <View>
              <Text style={styles.profileTitle}>Course profile</Text>
              <Text style={styles.profileSub}>100 mi · 23,008 ft of climbing</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#bcd6e6" />
          </View>
          <ElevationChart stations={AID_STATIONS} height={78} tone="dark" compact />
        </Pressable>

        <View style={styles.grid}>
          {TILES.map((tile) => (
            <Pressable
              key={tile.label}
              onPress={() => router.push(tile.href)}
              style={({ pressed }) => [styles.tile, { backgroundColor: t.card, borderColor: t.border }, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.tileIcon, { backgroundColor: t.primarySoft }]}>
                <Ionicons name={tile.icon} size={22} color={t.primary} />
              </View>
              <Text style={[styles.tileLabel, { color: t.text }]}>{tile.label}</Text>
              <Text style={[styles.tileSub, { color: t.muted }]}>{tile.sub}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.stats, { backgroundColor: t.card, borderColor: t.border }]}>
          {STATS.map((s, i) => (
            <View key={s.label} style={[styles.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: t.border }]}>
              <Text style={[styles.statValue, { color: t.primary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: t.muted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.heading, { color: t.muted }]}>KNOW BEFORE YOU GO</Text>
        {HIGHLIGHTS.map((h) => (
          <View key={h.title} style={[styles.note, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[styles.noteTitle, { color: t.text }]}>{h.title}</Text>
            <Text style={[styles.noteBody, { color: t.muted }]}>{h.body}</Text>
          </View>
        ))}

        <Text style={[styles.heading, { color: t.muted }]}>RACE INFO</Text>
        <View style={[styles.list, { backgroundColor: t.card, borderColor: t.border }]}>
          {MENU.map((m, i) => (
            <Pressable
              key={m.slug}
              onPress={() => router.push({ pathname: '/info/[slug]', params: { slug: m.slug } })}
              style={({ pressed }) => [styles.listRow, i > 0 && { borderTopWidth: 1, borderTopColor: t.border }, pressed && { opacity: 0.6 }]}
            >
              <View style={[styles.listIcon, { backgroundColor: t.accentSoft }]}>
                <Ionicons name={m.icon as keyof typeof Ionicons.glyphMap} size={20} color={t.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.listLabel, { color: t.text }]}>{INFO_PAGES[m.slug].title}</Text>
                <Text style={[styles.listSub, { color: t.muted }]}>{m.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.muted} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => Linking.openURL(RACE.website)} style={[styles.web, { borderColor: t.border }]}>
          <Text style={[styles.webText, { color: t.primary }]}>Official race website</Text>
          <Ionicons name="open-outline" size={16} color={t.primary} />
        </Pressable>
        <Text style={[styles.disclaimer, { color: t.muted }]}>
          Companion app for the Crazy Mountain 100. Details are subject to change, so always confirm with the race website.
        </Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: BRAND_BLUE },
  heroOverscroll: { position: 'absolute', top: -800, left: 0, right: 0, height: 800, backgroundColor: BRAND_BLUE },
  hero: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  sheet: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 60,
    minHeight: 900,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: 14 },
  logoCard: { backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  logo: { width: 250, height: 122 },
  heroDate: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginTop: 16 },
  heroSub: { color: '#bcd6e6', fontSize: 14, fontWeight: '600', marginTop: 4 },
  countdown: { borderRadius: 18, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  countBig: { fontSize: 40, fontWeight: '900', lineHeight: 46 },
  countSmall: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  profile: { borderRadius: 18, marginTop: 14, paddingTop: 12, paddingBottom: 6, overflow: 'hidden' },
  profileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  profileTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  profileSub: { color: '#bcd6e6', fontSize: 12, fontWeight: '600', marginTop: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  tile: { width: '48%', flexGrow: 1, borderRadius: 18, borderWidth: 1, padding: 14 },
  tileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileLabel: { fontSize: 16, fontWeight: '800' },
  tileSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  stats: { flexDirection: 'row', borderRadius: 18, borderWidth: 1, marginTop: 14, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },
  heading: { fontSize: 12, fontWeight: '800', letterSpacing: 0.9, marginTop: 24, marginBottom: 10, marginLeft: 4 },
  note: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  noteTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  noteBody: { fontSize: 14, lineHeight: 20 },
  list: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  listIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  listLabel: { fontSize: 16, fontWeight: '700' },
  listSub: { fontSize: 13, marginTop: 1 },
  web: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 20, padding: 12 },
  webText: { fontSize: 15, fontWeight: '700' },
  disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 4 },
});
