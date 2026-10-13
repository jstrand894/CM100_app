import { Ionicons } from '@expo/vector-icons';
import { Href, router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { HeroRidge, RIDGE_FRONT } from '../../src/components/HeroRidge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Collapsible, OfflineNotice, tint } from '../../src/components/ui';
import { RunnersSection } from '../../src/components/RunnersSection';
import { OfflineAction, WelcomeModal } from '../../src/components/Welcome';
import { useOfflinePrep } from '../../src/offline';
import { NEWS_PREFIX, useNotifications } from '../../src/data/notifications';
import { useOnline } from '../../src/data/online';
import { LOTTERY } from '../../src/data/lottery';
import { agoLabel, formatPostDate } from '../../src/data/news';
import { HIGHLIGHTS, RACE } from '../../src/data/race';
import { describeCode, SPOTS, useWeather } from '../../src/data/weather';
import { clockDuration, CUTOFF_MS, nowMs, Phase, phaseAt, shortDuration, START_MS, upcoming } from '../../src/data/weekend';
import { BRAND_BLUE, useTheme } from '../../src/theme';
import { useUnits } from '../../src/units';
import { TAB_BAR_CLEARANCE } from '../../src/tabBar';
import { TickerNumber } from '../../src/components/TickerNumber';

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

const TILES: { label: string; sub: string; href: Href; icon: keyof typeof Ionicons.glyphMap; urgent?: boolean }[] = [
  { label: 'Live tracking', icon: 'radio', sub: 'Follow your runner', href: '/map?tracking=1' },
  { label: 'Race weekend', icon: 'calendar', sub: 'Schedule and shuttle', href: '/info/schedule' },
  { label: 'Gear and drop bags', icon: 'bag-handle', sub: 'Checklists', href: '/gear' },
  { label: 'Crew and pacers', icon: 'people', sub: 'Rules for support teams', href: '/info/crew' },
  { label: 'Emergency', icon: 'medkit', sub: 'Hospitals and 911', href: '/info/emergency', urgent: true },
  { label: 'Food and lodging', icon: 'restaurant', sub: 'Wilsall, Big Timber, Clyde Park', href: '/info/local' },
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
  const u = useUnits();
  const { forecast, history, forecastOpen, updatedAt, failed } = useWeather();
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
      style={({ pressed }) => [styles.weather, { backgroundColor: BRAND_BLUE }, pressed && { opacity: 0.9 }]}
    >
      <Ionicons name="partly-sunny" size={120} color="rgba(255,255,255,0.12)" style={styles.wxWatermark} />
      <View style={styles.wxTop}>
        <Text style={styles.wxKicker}>{useForecast ? 'RACE DAY FORECAST' : 'TYPICAL RACE WEEKEND WEATHER'}</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.75)" />
      </View>
      {ready ? (
        <View style={styles.wxCols}>
          {rows.map((r, i) => (
            <View key={r!.id} style={[styles.wxCol, i > 0 && { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.wxLabel}>{r!.label}</Text>
              <Text style={styles.wxTemp}>
                {u.temp(r!.hi)}
                <Text style={styles.wxLow}>{` / ${u.temp(r!.lo)}`}</Text>
              </Text>
              <Text style={styles.wxNote}>{r!.note}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.wxFallback}>
          {failed ? 'No signal and nothing saved yet. ' : ''}It can be {u.temp(90)}{u.metric ? 'C' : 'F'} and turn to hail and snow within an hour. Tap for typical conditions and the race day forecast.
        </Text>
      )}
    </Pressable>
  );
}

export default function HomeScreen() {
  const t = useTheme();
  const u = useUnits();
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
  const online = useOnline();
  const notices = useNotifications();
  const news = notices.news;
  const newsUnread = notices.items.filter((n) => n.id.startsWith(NEWS_PREFIX) && !notices.isRead(n.id)).length;
  const prep = useOfflinePrep();
  const [prepOpen, setPrepOpen] = useState(false);
  const latest = news.posts[0];
  // Pull down to check for new news. Keep the spinner up briefly even when the check is instant.
  const [pulling, setPulling] = useState(false);
  const onPull = useCallback(async () => {
    setPulling(true);
    await Promise.all([notices.refresh(), new Promise((r) => setTimeout(r, 700))]);
    setPulling(false);
  }, [notices.refresh]);
  const scrollY = useRef(new Animated.Value(0)).current;
  // The gear sits over the fixed hero, so it only works while the hero is showing.
  const [gearOn, setGearOn] = useState(true);

  const heroHeight = insets.top + 238 + 84;
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
        {c.kind === 'units' ? (
          <View style={styles.heroCount} accessibilityLabel={`${c.units.map((u) => `${u.value} ${u.label}`).join(', ')} ${c.caption}`}>
            <View style={styles.heroUnits}>
              {c.units.map((u) => (
                <View key={u.label} style={styles.heroUnit}>
                  <TickerNumber value={u.value} style={[styles.heroUnitValue, { color: t.accent }]} />
                  <Text style={styles.heroUnitLabel}>{u.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.heroCaption}>{c.footer ?? c.caption}</Text>
          </View>
        ) : (
          <View style={styles.heroCount}>
            <Text style={[styles.heroUnitValue, { color: t.accent, fontSize: 30 }]}>{c.big}</Text>
            <Text style={styles.heroCaption}>{c.small}</Text>
          </View>
        )}
      </Animated.View>

      <Animated.ScrollView
        style={StyleSheet.absoluteFill}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: (e: any) => setGearOn(e.nativeEvent.contentOffset.y < 40),
        })}
        contentInsetAdjustmentBehavior="never"
        refreshControl={<RefreshControl refreshing={pulling || notices.refreshing} onRefresh={onPull} tintColor={BRAND_BLUE} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: heroHeight - 36 }} />
        <View style={[styles.sheet, { backgroundColor: t.bg, paddingBottom: 60 + TAB_BAR_CLEARANCE }]}>
          <View style={[styles.grabber, { backgroundColor: t.border }]} />
        {online && prep.ready === false && (
          <View style={[styles.prep, { backgroundColor: t.card, borderColor: t.accent }]}>
            <Pressable
              onPress={() => setPrepOpen((o) => !o)}
              accessibilityRole="button"
              accessibilityState={{ expanded: prepOpen }}
              accessibilityLabel="Save for offline"
              style={styles.prepBar}
            >
              <Ionicons name="cloud-download-outline" size={20} color={t.accent} />
              <Text style={[styles.newsKicker, { color: t.text, flex: 1 }]}>SAVE FOR OFFLINE</Text>
              <Ionicons name={prepOpen ? 'chevron-up' : 'chevron-down'} size={18} color={t.muted} />
            </Pressable>
            <Collapsible open={prepOpen}>
              <View style={{ paddingTop: 8, paddingBottom: 4 }}>
                <Text style={[styles.newsBody, { color: t.muted, marginBottom: 10 }]}>
                  You have service now. Save news, weather and announcements before you head out of range.
                </Text>
                <OfflineAction prep={prep} compact />
              </View>
            </Collapsible>
          </View>
        )}
        {lottery && (
          <Pressable onPress={() => router.push('/lottery')} style={[styles.lotteryPill, styles.lotteryRow, { backgroundColor: t.accentSoft }]} accessibilityRole="button">
            <Ionicons name="ticket" size={14} color={t.accent} />
            <Text style={[styles.lotteryText, { color: t.accent }]}>{lottery}</Text>
          </Pressable>
        )}

        <RunnersSection />

        {phase !== 'far' && phase !== 'done' && <WeekendCard now={now} phase={phase} />}

        {(latest || news.configured || news.isSample) && (
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityLabel="Open notifications"
            style={({ pressed }) => [styles.news, { backgroundColor: t.card, borderColor: latest?.urgent ? t.accent : t.border, borderWidth: latest?.urgent ? 2 : 1 }, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.newsTop}>
              <View style={[styles.newsIcon, { backgroundColor: t.accentSoft }]}>
                <Ionicons name="megaphone" size={18} color={t.accent} />
              </View>
              <Text style={[styles.newsKicker, { color: t.muted }]}>LATEST FROM THE RACE DIRECTOR</Text>
              {newsUnread > 0 && (
                <View style={[styles.badge, { backgroundColor: t.accent }]}>
                  <Text style={styles.badgeText}>{newsUnread} new</Text>
                </View>
              )}
            </View>
            {latest ? (
              <>
                <Text style={[styles.newsTitle, { color: t.text }]} numberOfLines={2}>
                  {u.text(latest.title)}
                </Text>
                {latest.body !== '' && (
                  <Text style={[styles.newsBody, { color: t.muted }]} numberOfLines={2}>
                    {u.text(latest.body)}
                  </Text>
                )}
                <Text style={[styles.newsFoot, { color: t.muted }]}>{`${formatPostDate(latest.date)} · updated ${agoLabel(news.updatedAt)} · all notifications`}</Text>
              </>
            ) : (
              <Text style={[styles.newsBody, { color: t.muted }]}>No news yet. Tap to check for updates.</Text>
            )}
          </Pressable>
        )}

        <View style={styles.grid}>
          {TILES.map((tile) => {
            const fg = tile.urgent ? t.red : t.primary;
            return (
              <Pressable
                key={tile.label}
                onPress={() => router.push(tile.href)}
                accessibilityRole="button"
                accessibilityLabel={`${tile.label}. ${tile.sub}`}
                style={({ pressed }) => [styles.tile, { backgroundColor: t.card, borderColor: t.border }, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
              >
                <View style={[styles.tileIcon, { backgroundColor: tile.urgent ? tint(t.red) : t.primarySoft }]}>
                  <Ionicons name={tile.icon} size={20} color={fg} />
                </View>
                <Text style={[styles.tileLabel, { color: t.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{tile.label}</Text>
                <Text style={[styles.tileSub, { color: t.muted }]} numberOfLines={1}>{tile.sub}</Text>
              </Pressable>
            );
          })}
        </View>

        <WeatherCard />

        <Text style={[styles.heading, { color: t.muted }]}>RACE BASICS</Text>
        {HIGHLIGHTS.filter((h) => h.title !== 'Weather').map((h) => (
          <View key={h.title} style={[styles.note, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[styles.noteTitle, { color: t.text }]}>{h.title}</Text>
            <Text style={[styles.noteBody, { color: t.muted }]}>{u.text(h.body)}</Text>
          </View>
        ))}

        <View style={[styles.land, { backgroundColor: t.card, borderColor: t.border }]} accessibilityLabel="Land acknowledgment">
          <View style={styles.newsTop}>
            <Ionicons name="leaf-outline" size={18} color={t.primary} />
            <Text style={[styles.newsKicker, { color: t.muted }]}>LAND ACKNOWLEDGMENT</Text>
          </View>
          <Text style={[styles.landTitle, { color: t.text }]}>Respect where you are and give thanks</Text>
          <Text style={[styles.landBody, { color: t.muted }]}>
            The race course itself navigates through the Indigenous lands of the Apsaalooke, private, and public land/forest service.
            To the Apsaalooke people this range is called Awaxaawippíia. "Awaxaawi" meaning mountain, "ppíia" meaning ominous or angry.
            Some say you can hear the mountains and the power is felt. We feel this is an important history and knowledge. Our hope
            is that you take the time to learn about its rich history.
          </Text>
        </View>

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
      <WelcomeModal prep={prep} />
      <Animated.View
        pointerEvents={gearOn ? 'auto' : 'none'}
        style={[styles.gear, { top: insets.top + 8, opacity: scrollY.interpolate({ inputRange: [0, 60], outputRange: [1, 0], extrapolate: 'clamp' }) }]}
      >
        <Pressable onPress={() => router.push('/settings')} hitSlop={10} style={styles.gearBtn} accessibilityRole="button" accessibilityLabel="Settings">
          <Ionicons name="settings-outline" size={22} color={BRAND_BLUE} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: HERO_BG },
  heroOverscroll: { position: 'absolute', top: -800, left: 0, right: 0, height: 800, backgroundColor: HERO_BG },
  gear: { position: 'absolute', right: 14, flexDirection: 'row' },
  prep: { borderRadius: 18, borderWidth: 2, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  prepBar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  gearBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11,74,107,0.10)' },
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
  heroCount: { alignItems: 'center', marginTop: 12 },
  heroUnits: { flexDirection: 'row', gap: 6 },
  heroUnit: { width: 62, alignItems: 'center' },
  heroUnitValue: { fontSize: 28, fontWeight: '900', lineHeight: 32, fontVariant: ['tabular-nums'] },
  heroUnitLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: '#6b6358' },
  heroCaption: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', color: '#6b6358', marginTop: 4 },
  lotteryRow: { alignSelf: 'center', marginTop: 0, marginBottom: 14 },
  lotteryPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  lotteryText: { fontSize: 13, fontWeight: '800' },
  news: { borderRadius: 18, padding: 14, marginTop: 14 },
  newsTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  newsIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  newsKicker: { flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  newsTitle: { fontSize: 17, fontWeight: '800', lineHeight: 22 },
  newsBody: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  newsFoot: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tile: { width: '48%', flexGrow: 1, borderRadius: 18, borderWidth: 1, padding: 14 },
  tileIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  tileLabel: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  tileSub: { fontSize: 12, marginTop: 2 },
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
  weather: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14, marginTop: 8, overflow: 'hidden' },
  wxWatermark: { position: 'absolute', right: -14, top: -22 },
  wxTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  wxKicker: { flex: 1, color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  wxLow: { color: 'rgba(255,255,255,0.65)', fontSize: 18, fontWeight: '700' },
  wxFallback: { color: '#ffffff', fontSize: 14, lineHeight: 20 },
  wxCols: { flexDirection: 'row' },
  wxCol: { flex: 1, paddingLeft: 12 },
  wxLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  wxTemp: { color: '#ffffff', fontSize: 26, fontWeight: '900', marginTop: 2, fontVariant: ['tabular-nums'] },
  wxStale: { fontSize: 12, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  wxNote: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '600', marginTop: 2 },
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
  land: { borderRadius: 18, borderWidth: 1, padding: 16, marginTop: 18 },
  landTitle: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  landBody: { fontSize: 14, lineHeight: 21, marginTop: 6 },
  disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 4 },
});
