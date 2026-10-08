import { Ionicons } from '@expo/vector-icons';
import { Href, router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { HeroRidge, RIDGE_FRONT } from '../../src/components/HeroRidge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LOTTERY } from '../../src/data/lottery';
import { agoLabel, formatPostDate, useNews } from '../../src/data/news';
import { HIGHLIGHTS, RACE } from '../../src/data/race';
import { describeCode, SPOTS, useWeather } from '../../src/data/weather';
import { clockDuration, CUTOFF_MS, nowMs, Phase, phaseAt, shortDuration, START_MS, upcoming } from '../../src/data/weekend';
import { BRAND_BLUE, useTheme } from '../../src/theme';

const logo = require('../../assets/brand/cm100-logo-transparent.png');
const HERO_BG = '#fbf7f0'; // warm cream, picks up the logo's illustrated feel
const westernStates = require('../../assets/brand/western-states-qualifier.png');
const hardRock = require('../../assets/brand/hard-rock-qualifier.png');

type Unit = { value: string; label: string };
type Countdown =
  | { kind: 'units'; units: Unit[]; caption: string; footer?: string }
  | { kind: 'text'; big: string; small: string };

const pad = (n: number) => String(n).padStart(2, '0');

function countdown(now: number, phase: Phase): Countdown {
  if (phase === 'far' || phase === 'week') {
    const total = Math.floor((START_MS - now) / 1000);
    return {
      kind: 'units',
      caption: 'until race day',
      units: [
        { value: String(Math.floor(total / 86400)), label: 'days' },
        { value: pad(Math.floor((total % 86400) / 3600)), label: 'hrs' },
        { value: pad(Math.floor((total % 3600) / 60)), label: 'min' },
        { value: pad(total % 60), label: 'sec' },
      ],
    };
  }
  if (phase === 'racing') {
    const total = Math.floor((now - START_MS) / 1000);
    return {
      kind: 'units',
      caption: 'race clock',
      footer: `Finish line closes in ${shortDuration(CUTOFF_MS - now)}`,
      units: [
        { value: String(Math.floor(total / 3600)), label: 'hrs' },
        { value: pad(Math.floor((total % 3600) / 60)), label: 'min' },
        { value: pad(total % 60), label: 'sec' },
      ],
    };
  }
  return { kind: 'text', big: 'Finished', small: 'See you next year' };
}

function lotteryLine(now: number): string | null {
  const opens = new Date(LOTTERY.opensIso).getTime();
  const closes = new Date(LOTTERY.closesIso).getTime();
  const day = 86400000;
  if (now < opens) return `Lottery opens in ${Math.ceil((opens - now) / day)} days`;
  if (now < closes) return `Lottery open now · ${Math.ceil((closes - now) / day)} days left to apply`;
  return null;
}

const TILES: { label: string; sub: string; icon: keyof typeof Ionicons.glyphMap; href: Href }[] = [
  { label: 'Live tracking', sub: 'Follow your runner', icon: 'radio', href: '/map?tracking=1' },
  { label: 'Race weekend', sub: 'Schedule and shuttle', icon: 'calendar', href: '/info/schedule' },
  { label: 'Gear and drop bags', sub: 'Checklists you can tick off', icon: 'bag-handle', href: '/gear' },
  { label: 'Crew and pacers', sub: 'Rules for support teams', icon: 'people', href: '/info/crew' },
  { label: 'Emergency', sub: 'Hospitals and urgent care', icon: 'medkit', href: '/info/emergency' },
  { label: 'Food and lodging', sub: 'Wilsall, Big Timber, Clyde Park', icon: 'restaurant', href: '/info/local' },
];

// Race-weekend card: what is next, plus shortcuts that matter at that point in the weekend.
function WeekendCard({ now, phase }: { now: number; phase: Phase }) {
  const t = useTheme();
  const [next, ...later] = upcoming(now, 3);
  const actions: { label: string; icon: keyof typeof Ionicons.glyphMap; href: Href; primary?: boolean }[] =
    phase === 'week'
      ? [
          { label: 'Full schedule', icon: 'calendar', href: '/info/schedule', primary: true },
          { label: 'Weather', icon: 'partly-sunny', href: '/weather' },
        ]
      : phase === 'racing'
        ? [
            { label: 'Live tracking', icon: 'radio', href: '/map?tracking=1', primary: true },
            { label: 'Weather', icon: 'partly-sunny', href: '/weather' },
          ]
        : [
            { label: 'Live tracking', icon: 'radio', href: '/map?tracking=1', primary: true },
            { label: 'Full schedule', icon: 'calendar', href: '/info/schedule' },
          ];
  return (
    <View style={[styles.weekend, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={styles.newsTop}>
        <View style={[styles.newsIcon, { backgroundColor: t.accentSoft }]}>
          <Ionicons name="flag" size={17} color={t.accent} />
        </View>
        <Text style={[styles.newsKicker, { color: t.muted }]}>RACE WEEKEND · NEXT UP</Text>
      </View>
      {next && (
        <>
          <Text style={[styles.nextTitle, { color: t.text }]}>{next.title}</Text>
          <Text style={[styles.nextMeta, { color: t.muted }]}>{`${next.label} · ${next.place}`}</Text>
          <View style={[styles.inPill, { backgroundColor: t.accentSoft }]}>
            <Text style={[styles.inPillText, { color: t.accent }]}>{`in ${shortDuration(next.at - now)}`}</Text>
          </View>
          {later.map((e) => (
            <View key={e.label + e.title} style={[styles.laterRow, { borderTopColor: t.border }]}>
              <Text style={[styles.laterTime, { color: t.muted }]}>{e.label}</Text>
              <Text style={[styles.laterTitle, { color: t.text }]} numberOfLines={1}>
                {e.title}
              </Text>
            </View>
          ))}
        </>
      )}
      <View style={styles.actions}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={() => router.push(a.href)}
            style={({ pressed }) => [
              styles.action,
              a.primary ? { backgroundColor: t.primary } : { backgroundColor: t.primarySoft },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Ionicons name={a.icon} size={16} color={a.primary ? '#ffffff' : t.primary} />
            <Text style={[styles.actionText, { color: a.primary ? '#ffffff' : t.primary }]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Forecast once it exists (about two weeks out), otherwise what the last five years looked like on race weekend.
function WeatherCard() {
  const t = useTheme();
  const { forecast, history, forecastOpen } = useWeather();
  const useForecast = forecastOpen && !!forecast;
  const rows = SPOTS.map((s) => {
    if (useForecast) {
      const d = forecast![s.id][0];
      return { id: s.id, label: s.label, hi: d.high, lo: d.low, note: describeCode(d.code).label };
    }
    const h = history?.[s.id];
    return h ? { id: s.id, label: s.label, hi: h.high, lo: h.low, note: `${h.wetDays} of ${h.totalDays} days wet` } : null;
  });
  const ready = rows.every(Boolean);
  return (
    <Pressable
      onPress={() => router.push('/weather')}
      accessibilityLabel="Open race weekend weather"
      style={({ pressed }) => [styles.weather, { backgroundColor: t.card, borderColor: t.border }, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.newsTop}>
        <View style={[styles.newsIcon, { backgroundColor: t.primarySoft }]}>
          <Ionicons name="partly-sunny" size={18} color={t.primary} />
        </View>
        <Text style={[styles.newsKicker, { color: t.muted }]}>{useForecast ? 'RACE DAY FORECAST' : 'TYPICAL RACE WEEKEND WEATHER'}</Text>
        <Ionicons name="chevron-forward" size={18} color={t.muted} />
      </View>
      {ready ? (
        <View style={styles.wxCols}>
          {rows.map((r, i) => (
            <View key={r!.id} style={[styles.wxCol, i > 0 && { borderLeftWidth: 1, borderLeftColor: t.border }]}>
              <Text style={[styles.wxLabel, { color: t.muted }]}>{r!.label}</Text>
              <Text style={[styles.wxTemp, { color: t.text }]}>
                {`${r!.hi}°`}
                <Text style={{ color: t.muted }}>{` / ${r!.lo}°`}</Text>
              </Text>
              <Text style={[styles.wxNote, { color: t.muted }]}>{r!.note}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.newsBody, { color: t.muted }]}>
          It can be 90°F and turn to hail and snow within an hour. Tap for typical conditions and the race day forecast.
        </Text>
      )}
    </Pressable>
  );
}

export default function HomeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // Tick every second so the countdown stays live.
  const [now, setNow] = useState(() => nowMs());
  useEffect(() => {
    const id = setInterval(() => setNow(nowMs()), 1000);
    return () => clearInterval(id);
  }, []);
  const phase = phaseAt(now);
  const c = countdown(now, phase);
  const lottery = phase === 'far' ? lotteryLine(now) : null;
  const focused = useIsFocused();
  const news = useNews();
  const latest = news.posts[0];
  // Pull down to check for new news. Keep the spinner up briefly even when the check is instant.
  const [pulling, setPulling] = useState(false);
  const onPull = useCallback(async () => {
    setPulling(true);
    await Promise.all([news.refresh(), new Promise((r) => setTimeout(r, 700))]);
    setPulling(false);
  }, [news.refresh]);
  const scrollY = useRef(new Animated.Value(0)).current;

  const heroHeight = insets.top + 238;
  // Hero stays fixed; only stretches slightly when pulling down past the top.
  const heroScale = scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.2, 1], extrapolate: 'clamp' });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* The hero is light in both modes so the logo stays readable, so keep the status bar dark while this tab is showing. */}
      {focused && <StatusBar style="dark" />}
      {/* Hero sits behind the scroll content; the sheet slides up over it. */}
      <View style={[styles.heroBg, { height: heroHeight + 320 }]} />
      <View style={styles.heroOverscroll} />
      <View style={{ position: 'absolute', top: heroHeight - 36 - 96, left: 0, right: 0 }}>
        <HeroRidge height={130} />
      </View>
      {/* Below the mountains the hero keeps the ridge color, so pulling the page down never reveals cream. */}
      <View style={{ position: 'absolute', top: heroHeight - 36 - 96 + 129, left: 0, right: 0, height: 700, backgroundColor: RIDGE_FRONT }} />
      <Animated.View
        style={[
          styles.hero,
          { height: heroHeight, paddingTop: insets.top + 20, transform: [{ scale: heroScale }] },
        ]}
      >
        <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="Crazy Mountain 100 logo" />
        <View style={styles.datePill}>
          <Ionicons name="calendar-outline" size={15} color="#ffffff" />
          <Text style={styles.heroDate}>{RACE.dateLabel}</Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={StyleSheet.absoluteFill}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        contentInsetAdjustmentBehavior="never"
        refreshControl={<RefreshControl refreshing={pulling || news.refreshing} onRefresh={onPull} tintColor={BRAND_BLUE} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: heroHeight - 36 }} />
        <View style={[styles.sheet, { backgroundColor: t.bg }]}>
          <View style={[styles.grabber, { backgroundColor: t.border }]} />
        <View style={[styles.countdown, { backgroundColor: t.card, borderColor: t.border }]}>
          {c.kind === 'units' ? (
            <>
              <View style={styles.units}>
                {c.units.map((u, i) => (
                  <View key={u.label} style={[styles.unit, i > 0 && { borderLeftWidth: 1, borderLeftColor: t.border }]}>
                    <Text style={[styles.unitValue, { color: t.accent }]}>{u.value}</Text>
                    <Text style={[styles.unitLabel, { color: t.muted }]}>{u.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.countSmall, { color: t.muted }]}>{c.caption}</Text>
              {c.footer && <Text style={[styles.countFooter, { color: t.text }]}>{c.footer}</Text>}
            </>
          ) : (
            <>
              <Text style={[styles.countBig, { color: t.accent }]}>{c.big}</Text>
              <Text style={[styles.countSmall, { color: t.muted }]}>{c.small}</Text>
            </>
          )}
          {lottery && (
            <Pressable onPress={() => router.push('/lottery')} style={[styles.lotteryPill, { backgroundColor: t.accentSoft }]}>
              <Ionicons name="ticket" size={14} color={t.accent} />
              <Text style={[styles.lotteryText, { color: t.accent }]}>{lottery}</Text>
            </Pressable>
          )}
        </View>

        {phase !== 'far' && phase !== 'done' && <WeekendCard now={now} phase={phase} />}

        {(latest || news.configured || news.isSample) && (
          <Pressable
            onPress={() => router.push('/news')}
            accessibilityLabel="Open race news"
            style={({ pressed }) => [styles.news, { backgroundColor: t.card, borderColor: latest?.urgent ? t.accent : t.border, borderWidth: latest?.urgent ? 2 : 1 }, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.newsTop}>
              <View style={[styles.newsIcon, { backgroundColor: t.accentSoft }]}>
                <Ionicons name="megaphone" size={18} color={t.accent} />
              </View>
              <Text style={[styles.newsKicker, { color: t.muted }]}>LATEST FROM THE RACE DIRECTOR</Text>
              {news.unread > 0 && (
                <View style={[styles.badge, { backgroundColor: t.accent }]}>
                  <Text style={styles.badgeText}>{news.unread} new</Text>
                </View>
              )}
            </View>
            {latest ? (
              <>
                <Text style={[styles.newsTitle, { color: t.text }]} numberOfLines={2}>
                  {latest.title}
                </Text>
                {latest.body !== '' && (
                  <Text style={[styles.newsBody, { color: t.muted }]} numberOfLines={2}>
                    {latest.body}
                  </Text>
                )}
                <Text style={[styles.newsFoot, { color: t.muted }]}>{`${formatPostDate(latest.date)} · updated ${agoLabel(news.updatedAt)} · all news`}</Text>
              </>
            ) : (
              <Text style={[styles.newsBody, { color: t.muted }]}>No news yet. Tap to check for updates.</Text>
            )}
          </Pressable>
        )}

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

        <WeatherCard />

        <Text style={[styles.heading, { color: t.muted }]}>KNOW BEFORE YOU GO</Text>
        {HIGHLIGHTS.filter((h) => h.title !== 'Weather').map((h) => (
          <View key={h.title} style={[styles.note, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[styles.noteTitle, { color: t.text }]}>{h.title}</Text>
            <Text style={[styles.noteBody, { color: t.muted }]}>{h.body}</Text>
          </View>
        ))}

        <Text style={[styles.heading, { color: t.muted }]}>QUALIFYING RACE</Text>
        <View style={styles.qualRow}>
          {[
            { src: westernStates, label: 'Western States', alt: 'Western States Endurance Run qualifier' },
            { src: hardRock, label: 'Hardrock', alt: 'Hardrock Endurance Run qualifier' },
          ].map((q) => (
            <View key={q.label} style={[styles.qual, { borderColor: t.border }]}>
              <Image source={q.src} style={styles.qualImg} resizeMode="contain" accessibilityLabel={q.alt} />
              <Text style={styles.qualLabel}>{q.label}</Text>
              <Text style={styles.qualSub}>Qualifier</Text>
            </View>
          ))}
        </View>

        <View style={styles.links}>
          <Pressable onPress={() => Linking.openURL(RACE.website)} style={styles.web}>
            <Text style={[styles.webText, { color: t.primary }]}>Race website</Text>
            <Ionicons name="open-outline" size={16} color={t.primary} />
          </Pressable>
          <Pressable onPress={() => Linking.openURL(RACE.instagram)} style={styles.web} accessibilityLabel="Open the race's Instagram page">
            <Ionicons name="logo-instagram" size={18} color={t.primary} />
            <Text style={[styles.webText, { color: t.primary }]}>Instagram</Text>
          </Pressable>
        </View>
        <Text style={[styles.disclaimer, { color: t.muted }]}>
          Companion app for the Crazy Mountain 100. Details are subject to change, so always confirm with the race website.
        </Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: HERO_BG },
  heroOverscroll: { position: 'absolute', top: -800, left: 0, right: 0, height: 800, backgroundColor: HERO_BG },
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
  logo: { width: 270, height: 103 },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: BRAND_BLUE,
  },
  heroDate: { color: '#ffffff', fontSize: 14, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  countdown: { borderRadius: 18, borderWidth: 1, paddingVertical: 18, alignItems: 'center' },
  units: { flexDirection: 'row', alignSelf: 'stretch', paddingHorizontal: 10, marginBottom: 8 },
  unit: { flex: 1, alignItems: 'center' },
  unitValue: { fontSize: 30, fontWeight: '900', lineHeight: 40, fontVariant: ['tabular-nums'] },
  unitLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  countBig: { fontSize: 40, fontWeight: '900', lineHeight: 46 },
  lotteryPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  lotteryText: { fontSize: 13, fontWeight: '800' },
  countFooter: { fontSize: 14, fontWeight: '800', marginTop: 6 },
  countSmall: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  news: { borderRadius: 18, padding: 14, marginTop: 14 },
  newsTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  newsIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  newsKicker: { flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  newsTitle: { fontSize: 17, fontWeight: '800', lineHeight: 22 },
  newsBody: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  newsFoot: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  tile: { width: '48%', flexGrow: 1, borderRadius: 18, borderWidth: 1, padding: 14 },
  tileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileLabel: { fontSize: 16, fontWeight: '800' },
  tileSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  weekend: { borderRadius: 18, borderWidth: 1, padding: 14, marginTop: 14 },
  nextTitle: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  nextMeta: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  inPill: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  inPillText: { fontSize: 14, fontWeight: '800' },
  laterRow: { flexDirection: 'row', gap: 12, paddingTop: 10, marginTop: 10, borderTopWidth: 1 },
  laterTime: { width: 96, fontSize: 13, fontWeight: '700' },
  laterTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  action: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
  actionText: { fontSize: 14, fontWeight: '800' },
  weather: { borderRadius: 18, borderWidth: 1, padding: 14, marginTop: 14 },
  wxCols: { flexDirection: 'row' },
  wxCol: { flex: 1, paddingLeft: 12 },
  wxLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  wxTemp: { fontSize: 24, fontWeight: '900', marginTop: 2, fontVariant: ['tabular-nums'] },
  wxNote: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  heading: { fontSize: 12, fontWeight: '800', letterSpacing: 0.9, marginTop: 24, marginBottom: 10, marginLeft: 4 },
  note: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  noteTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  noteBody: { fontSize: 14, lineHeight: 20 },
  list: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  listIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  listLabel: { fontSize: 16, fontWeight: '700' },
  listSub: { fontSize: 13, marginTop: 1 },
  qualRow: { flexDirection: 'row', gap: 12 },
  qual: { flex: 1, backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, paddingTop: 10, paddingBottom: 12, alignItems: 'center' },
  qualImg: { width: '100%', height: 120 },
  qualLabel: { color: '#111111', fontSize: 14, fontWeight: '800', marginTop: 6 },
  qualSub: { color: '#666666', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 20 },
  web: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', padding: 12 },
  webText: { fontSize: 15, fontWeight: '700' },
  disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 4 },
});
