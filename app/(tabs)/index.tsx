import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  { label: 'Aid stations', sub: 'Cutoffs and crew access', icon: 'location', href: '/aid' },
  { label: 'Live tracking', sub: 'Follow your runner', icon: 'radio', href: '/track' },
  { label: 'Race weekend', sub: 'Schedule and shuttle', icon: 'calendar', href: '/info/schedule' },
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

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 40 }} contentInsetAdjustmentBehavior="never">
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.logoCard}>
          <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="Crazy Mountain 100 logo" />
        </View>
        <Text style={styles.heroDate}>{RACE.dateLabel}</Text>
        <Text style={styles.heroSub}>
          {RACE.start.split(',')[0]} → {RACE.finish.split(',')[0]}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={[styles.countdown, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.countBig, { color: t.accent }]}>{c.big}</Text>
          <Text style={[styles.countSmall, { color: t.muted }]}>{c.small}</Text>
        </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: BRAND_BLUE, alignItems: 'center', paddingBottom: 56, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  logoCard: { backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  logo: { width: 250, height: 122 },
  heroDate: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginTop: 16 },
  heroSub: { color: '#bcd6e6', fontSize: 14, fontWeight: '600', marginTop: 4 },
  body: { paddingHorizontal: 16, marginTop: -34 },
  countdown: { borderRadius: 18, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  countBig: { fontSize: 40, fontWeight: '900', lineHeight: 46 },
  countSmall: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
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
