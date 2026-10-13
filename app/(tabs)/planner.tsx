import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { createElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutAnimation, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from '../../src/alert';
import { RunnerBar } from '../../src/components/RunnerBar';
import { Card, SectionTitle, tint } from '../../src/components/ui';
import { goalKey, logsKey, useRunners } from '../../src/runners';
import { AID_STATIONS } from '../../src/data/aidStations';
import {
  AID_STOP_MINUTES,
  clockLabel,
  CREW_DRIVE,
  CUTOFF_HOURS,
  durationLabel,
  elapsedHours,
  crewLeg,
  projectFromLogs,
  START_HOUR,
} from '../../src/data/pace';
import { nowMs, phaseAt, START_MS } from '../../src/data/weekend';
import { BRAND_BLUE, useTheme } from '../../src/theme';
import { useUnits } from '../../src/units';

const MIN = 16 * 60;
const MAX = 36 * 60;
const PRESETS = [21, 24, 27, 28.5, 30, 32, 34, 36];
const START_ABS = START_HOUR * 60; // minutes after Friday midnight at the gun
const DAY = 1440;
const NEAR_METERS = 800; // close enough to count as "at" a station; trail coordinates are approximate

const metersBetween = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};

const goalLabel = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
// Absolute minutes after Friday 12:00 AM -> label such as "Fri 10:45 AM"
const absLabel = (abs: number) => clockLabel((abs - START_ABS) / 60);
const shortName = (name: string) => name.replace(/^Start: .*$/, 'Start').replace(/^Finish: /, '');

type Mode = 'plan' | 'race';
type Logs = Record<string, number>; // station id -> absolute minutes after Fri 12:00 AM

// Time-of-day picker. iOS shows a spinner; Android opens the system dialog from a button.
function TimeField({ minutes, onChange }: { minutes: number; onChange: (minutesOfDay: number) => void }) {
  const t = useTheme();
  const scheme = useColorScheme();
  const value = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  const apply = (d?: Date) => d && onChange(d.getHours() * 60 + d.getMinutes());
  if (Platform.OS === 'web') {
    // The native picker does not exist on the web; the browser's own time input does the job.
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      <View style={styles.timeBox}>
        {createElement('input', {
          type: 'time',
          value: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`,
          'aria-label': 'Time',
          onChange: (e: { target: { value: string } }) => {
            const [h, m] = e.target.value.split(':').map(Number);
            if (!Number.isNaN(h) && !Number.isNaN(m)) onChange(h * 60 + m);
          },
          style: {
            fontSize: 22,
            fontWeight: 800,
            width: 140,
            height: 48,
            textAlign: 'center',
            border: 'none',
            borderRadius: 12,
            background: t.primarySoft,
            color: t.primary,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
        })}
      </View>
    );
  }
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.timeBox}>
        <DateTimePicker
          value={value}
          mode="time"
          display="compact"
          themeVariant={scheme === 'dark' ? 'dark' : 'light'}
          onChange={(_, d) => apply(d)}
          style={{ transform: [{ scale: 1.4 }] }}
        />
      </View>
    );
  }
  const h24 = Math.floor(minutes / 60);
  const label = `${h24 % 12 === 0 ? 12 : h24 % 12}:${String(minutes % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
  return (
    <Pressable
      onPress={() => DateTimePickerAndroid.open({ value, mode: 'time', is24Hour: false, onChange: (_, d) => apply(d) })}
      style={[styles.androidTime, styles.timeBox, { backgroundColor: t.primarySoft }]}
      accessibilityLabel={`Time ${label}. Tap to change`}
    >
      <Ionicons name="time-outline" size={20} color={t.primary} />
      <Text style={[styles.androidTimeText, { color: t.primary }]}>{label}</Text>
    </Pressable>
  );
}

// Timeline circle: when a station is checked in, a green disc with a check mark pops in over it.
function TimelineDot({ logged, selected, behind }: { logged: boolean; selected: boolean; behind: boolean }) {
  const t = useTheme();
  const pop = useRef(new Animated.Value(logged ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: logged ? 1 : 0, friction: 4, tension: 150, useNativeDriver: true }).start();
  }, [logged, pop]);
  return (
    <View
      pointerEvents="none"
      style={[styles.dot, { borderColor: behind ? t.red : logged ? t.green : selected ? t.primary : t.muted, backgroundColor: selected ? t.primary : t.bg }]}
    >
      <Animated.View style={[styles.dotFill, { backgroundColor: t.green, opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]}>
        <Ionicons name="checkmark" size={11} color="#ffffff" />
      </Animated.View>
    </View>
  );
}

function HowItWorks({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const u = useUnits();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const points = [
    'Plan ahead: pick a finish time to see when your runner should reach each station, and when crew needs to leave to meet them.',
    'Race day: log each station as your runner passes it. Everything after it updates to match their real pace.',
    'Times come from past finisher splits (27 to 34 hour finishes), blended to match your goal. They are estimates, not predictions.',
    'In Race day mode, every time you log is used. Each leg is compared with how past finishers ran that same stretch, so climbs and descents are expected to be slow and fast.',
    'Early on, a fast or slow start moves the projection only a little and your goal still counts. By about halfway, your logged pace takes over. Recent stations count more than early ones.',
    `Crew "leave by" times assume your runner spends ${AID_STOP_MINUTES} minutes at each crewed station and use 2025 drive times.`,
    'Sunlight is a 0.7 mi hike from the road, so we add 15 minutes each way.',
    'The race warns that Sunlight and Crandall, and Crandall and Forest Lake, are hard to crew together because of rough roads.',
    'Weather, trail conditions and aid station stops all change the real numbers.',
  ];
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.bg, padding: 20, paddingBottom: insets.bottom + 20 }}>
        <View style={styles.modalHead}>
          <Text style={[styles.modalTitle, { color: t.text }]}>How the planner works</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close-circle" size={30} color={t.muted} />
          </Pressable>
        </View>
        <ScrollView>
          {points.map((p) => (
            <View key={p} style={styles.point}>
              <Text style={[styles.pointDot, { color: t.primary }]}>•</Text>
              <Text style={[styles.pointText, { color: t.text }]}>{u.text(p)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function PlannerScreen() {
  const t = useTheme();
  const u = useUnits();
  const [mode, setMode] = useState<Mode>(() => (phaseAt(nowMs()) === 'racing' ? 'race' : 'plan'));
  const userPicked = useRef(false);
  const rs = useRunners();
  const runnerId = rs.active.id;
  const [goal, setGoal] = useState(30 * 60);
  const [logs, setLogs] = useState<Logs>({});
  const [sel, setSel] = useState('ibex'); // station being logged
  const [entry, setEntry] = useState<number | null>(null); // absolute minutes being entered
  const [info, setInfo] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const rowY = useRef<Record<string, number>>({}); // y of each arrival-time row, to bring a checked-in row into view
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  // Glow on the next-stop card: strong on new info, then a softer glow that stays until the user opens or closes the card.
  const pulse = useRef(new Animated.Value(0)).current; // halo strength
  const pop = useRef(new Animated.Value(1)).current; // card scale
  const GLOW_REST = 0.4;
  const setOpen = (v: boolean) => {
    pulse.stopAnimation();
    Animated.timing(pulse, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(v);
  };
  // Pull the next-stop card down for full details, push it up to tuck it away.
  const openRef = useRef(setOpen);
  openRef.current = setOpen;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderRelease: (_, g) => {
          if (g.dy > 20) openRef.current(true);
          else if (g.dy < -20) openRef.current(false);
        },
      }),
    [],
  );

  // Read saved values whenever the tab comes into view or the runner changes, so a reset in Settings shows up right away.
  useFocusEffect(
    useCallback(() => {
      rs.reload();
      AsyncStorage.getItem(goalKey(runnerId))
        .then((v) => setGoal(v ? Math.min(Math.max(parseInt(v, 10) || 30 * 60, MIN), MAX) : 30 * 60))
        .catch(() => {});
      AsyncStorage.getItem(logsKey(runnerId))
        .then((v) => {
          const saved: Logs = v ? JSON.parse(v) : {};
          setLogs(saved);
          // Someone who already logged times wants to land on them.
          if (!userPicked.current && Object.keys(saved).length) setMode('race');
        })
        .catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runnerId]),
  );

  // Switching runners starts from a clean screen so a time can never land on the wrong person.
  const switchRunner = (id: string) => {
    if (saving || id === runnerId) return;
    setLogs({});
    setGoal(30 * 60);
    setHistory([]);
    setSel('ibex');
    setEntry(null);
    rs.setActive(id);
  };

  const [segW, setSegW] = useState(0);
  const segPos = useRef(new Animated.Value(mode === 'race' ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(segPos, { toValue: mode === 'race' ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [mode, segPos]);
  const pickMode = (m: Mode) => {
    userPicked.current = true;
    setMode(m);
  };
  const updateGoal = (min: number) => {
    const m = Math.min(Math.max(min, MIN), MAX);
    setGoal(m);
    AsyncStorage.setItem(goalKey(runnerId), String(m)).catch(() => {});
  };
  // Every change remembers what came before, so Undo can step back through them.
  const [history, setHistory] = useState<{ logs: Logs; sel: string }[]>([]);
  const saveLogs = (next: Logs, remember = true) => {
    if (remember) setHistory((h) => [...h.slice(-29), { logs, sel }]);
    setLogs(next);
    AsyncStorage.setItem(logsKey(runnerId), JSON.stringify(next)).catch(() => {});
  };

  const order = AID_STATIONS.map((s) => s.id);
  // The latest station with a logged time drives the live projection.
  const lastLoggedIdx = order.reduce((acc, id, i) => (logs[id] != null ? i : acc), -1);
  const liveActive = mode === 'race' && lastLoggedIdx >= 0;
  // Every logged time feeds the projection; see projectFromLogs for how.
  const proj = useMemo(() => {
    const hours: Record<string, number> = {};
    if (mode === 'race') for (const id of order) if (logs[id] != null) hours[id] = (logs[id] - START_ABS) / 60;
    return projectFromLogs(hours, goal / 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, logs, mode]);
  const projectedGoalMin = Math.round(proj.finishHours * 60);
  const elapsed = proj.elapsed;

  const drive = useMemo(() => Object.fromEntries(CREW_DRIVE.map((d) => [d.id, d])), []);

  const loggable = AID_STATIONS.filter((s) => s.kind !== 'start');
  const selIdx = loggable.findIndex((s) => s.id === sel);
  const selStation = loggable[selIdx];
  // Re-check every few seconds so the button wakes up at the gun even if the screen is just sitting open.
  const [raceStarted, setRaceStarted] = useState(() => nowMs() >= START_MS);
  useEffect(() => {
    if (raceStarted) return;
    const id = setInterval(() => nowMs() >= START_MS && setRaceStarted(true), 15000);
    return () => clearInterval(id);
  }, [raceStarted]);
  // Checking in uses the current time, kept fresh while the screen is open. Before the race starts there is no race clock, so it
  // uses the phone's time of day on Friday, which lets the screen be tried out ahead of time.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 20000);
    return () => clearInterval(id);
  }, []);
  const nowDate = new Date(nowMs());
  const liveAbs = raceStarted
    ? Math.min(Math.max(START_ABS + Math.floor((nowMs() - START_MS) / 60000), START_ABS), 2 * DAY - 1)
    : nowDate.getHours() * 60 + nowDate.getMinutes();
  const entryAbs = entry ?? liveAbs;
  const [editTime, setEditTime] = useState(false);
  // Station change is one motion: the old name slides a short way and fades out while the new one slides in and fades up.
  const go = useRef(new Animated.Value(1)).current; // 0 -> 1 across a change
  const [leaving, setLeaving] = useState<string | null>(null); // station sliding out
  const [dir, setDir] = useState(1); // 1 when moving to a later station
  const [saving, setSaving] = useState(false);
  const afterChange = useRef<(() => void) | null>(null);
  const firstRun = useRef(true);
  const changeTo = (id: string, d: number, done?: () => void) => {
    afterChange.current = done ?? null;
    setLeaving(sel);
    setDir(d);
    setSel(id);
    setEntry(null);
  };
  // Starts after the new station is on screen but before it paints, so there is no flash of the wrong name.
  useLayoutEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    go.setValue(0);
    Animated.timing(go, { toValue: 1, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setLeaving(null);
      const cb = afterChange.current;
      afterChange.current = null;
      cb?.();
    });
  }, [sel, go]);
  const choose = (id: string) => {
    if (saving) return; // ignore taps while a save is playing
    if (id === sel) return setEntry(null);
    const to = loggable.findIndex((s) => s.id === id);
    changeTo(id, to > selIdx ? 1 : -1);
  };
  const step = (d: number) => choose(loggable[Math.min(Math.max(selIdx + d, 0), loggable.length - 1)].id);
  const setDay = (day: number) => setEntry(day * DAY + (entryAbs % DAY));
  const setTimeOfDay = (m: number) => setEntry(Math.floor(entryAbs / DAY) * DAY + m);
  // Picks the station you are standing at, using the phone's location. One-shot, only when the button is tapped.
  const [locating, setLocating] = useState(false);
  const [locNote, setLocNote] = useState<string | null>(null);
  const useLocation = async () => {
    if (locating || saving) return;
    setLocating(true);
    setLocNote(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setLocNote('Location is off for this app. Turn it on in your phone settings to use this.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const here = pos.coords;
      let best: { id: string; name: string; m: number } | null = null;
      for (const st of loggable) {
        for (const c of [st.driveCoordinate, st.courseCoordinate]) {
          if (!c) continue;
          const m = metersBetween(here, c);
          if (!best || m < best.m) best = { id: st.id, name: st.name, m };
        }
      }
      if (best && best.m <= NEAR_METERS) {
        choose(best.id);
        setLocNote(`You are at ${shortName(best.name)}.`);
      } else if (best) {
        setLocNote(`Not near an aid station. Closest is ${shortName(best.name)}, ${u.dist(best.m / 1609.34)} away.`);
      }
    } catch {
      setLocNote('Could not get your location. Try again with a clearer view of the sky.');
    } finally {
      setLocating(false);
    }
  };
  // Saving shows a check mark pop, holds a moment, then slides on to the next station.
  const checkScale = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const saveEntry = () => {
    if (saving) return;
    saveLogs({ ...logs, [sel]: entryAbs });
    setEntry(entryAbs); // keep the saved time on screen while the check shows
    setSaving(true);
    checkScale.setValue(0);
    Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
    timers.current.push(
      setTimeout(() => {
        // Move on to the next station, which is almost always what's wanted.
        const finish = () => setSaving(false);
        if (selIdx < loggable.length - 1) changeTo(loggable[selIdx + 1].id, 1, finish);
        else finish();
      }, 800),
    );
  };
  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev || saving) return;
    setHistory((h) => h.slice(0, -1));
    saveLogs(prev.logs, false);
    setSel(prev.sel);
    setEntry(null);
  };
  const clearAll = () =>
    Alert.alert('Clear all logged times?', 'This resets Race day back to your plan. You can still undo it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: () => {
          saveLogs({});
          setSel('ibex');
          setEntry(null);
        },
      },
    ]);
  const clearLog = (id: string, name: string) =>
    Alert.alert(`Clear ${shortName(name)}?`, 'This removes the time you logged. Later times will re-estimate.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          const next = { ...logs };
          delete next[id];
          saveLogs(next);
        },
      },
    ]);

  // The next stop worth reporting after the latest logged one: skips cutoff-only checkpoints and stations crew can't reach.
  const nextCard = (() => {
    if (mode !== 'race') return null;
    const li = lastLoggedIdx;
    if (li < 0) return { empty: true as const };
    let ni = li + 1;
    while (ni < AID_STATIONS.length - 1 && (AID_STATIONS[ni].kind === 'cutoff' || AID_STATIONS[ni].crewAccess === 'no')) ni++;
    const nextSt = AID_STATIONS[ni];
    if (!nextSt) return { empty: true as const };
    const from = AID_STATIONS[li];
    const between = AID_STATIONS.slice(li + 1, ni).filter((x) => x.kind !== 'cutoff');
    const nextAbs = START_ABS + Math.round(elapsed[nextSt.id] * 60);
    const legMin = Math.round((elapsed[nextSt.id] - (logs[from.id] - START_ABS) / 60) * 60);
    const miles = Math.round((nextSt.mile - from.mile) * 10) / 10;
    const cutoffH = CUTOFF_HOURS[nextSt.id];
    const margin = cutoffH != null ? cutoffH - elapsed[nextSt.id] : null;
    const cl = crewLeg(nextSt.id, elapsed);
    const cdn = drive[nextSt.id];
    const crew = cl && cdn ? { fromName: shortName(AID_STATIONS.find((a) => a.id === cdn.fromId)!.name), leaveBy: START_ABS + Math.round(cl.leaveByMin), driveMin: cdn.minutes, approx: !!cdn.approx, slack: cl.slackMin } : null;
    return { empty: false as const, from, nextSt, between, nextAbs, legMin, miles, margin, crew };
  })();

  // Station name, mile and the plan's time for it. Rendered twice during a change (outgoing and incoming).
  const nameBlock = (id: string) => {
    const st = loggable.find((x) => x.id === id) ?? selStation;
    const planFor = START_ABS + Math.round(elapsedHours(goal / 60)[st.id] * 60);
    return (
      <>
        <View style={styles.nameBox}>
          <Text style={[styles.stationName, { color: t.text }]} numberOfLines={2}>
            {shortName(st.name)}
          </Text>
        </View>
        <Text style={[styles.goalSub, { color: t.muted }]}>
          {u.metric ? 'Km' : 'Mile'} {u.distNum(st.mile)} · plan was {absLabel(planFor)}
        </Text>
      </>
    );
  };

  // New information in the next-stop card: pop it and let a halo fade out so the change is noticed.
  const nextKey = nextCard && !nextCard.empty ? `${nextCard.nextSt.id}|${nextCard.nextAbs}` : null;
  const prevKey = useRef<string | null>(null);
  useEffect(() => {
    if (nextKey && prevKey.current && prevKey.current !== nextKey) {
      // The card swells and settles, while the halo eases up to full strength, holds a beat, then rests at a softer glow
      // that stays until the card is touched.
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.03, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(pop, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(pulse, { toValue: GLOW_REST, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
    prevKey.current = nextKey;
  }, [nextKey, pulse]);

  // Checking in from the pinned bar jumps back up, but keeps the row that was just checked in on screen under the bar.
  const checkInFromBar = () => {
    if (saving) return;
    const id = sel;
    saveEntry();
    setTimeout(() => scroller.current?.scrollTo({ y: Math.max((rowY.current[id] ?? 0) - 84, 0), animated: true }), 80);
  };

  // When the check-in card scrolls out of view, a slim bar stays pinned at the top with the station, time and Check in.
  const [cardBottom, setCardBottom] = useState(260);
  const [pinned, setPinned] = useState(false);
  const barIn = useRef(new Animated.Value(0)).current;
  const showBar = mode === 'race' && pinned;
  useEffect(() => {
    Animated.timing(barIn, { toValue: showBar ? 1 : 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [showBar, barIn]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Pace planner</Text>
          <Pressable onPress={() => setInfo(true)} hitSlop={12} accessibilityLabel="How the planner works">
            <Ionicons name="information-circle-outline" size={24} color="#ffffff" />
          </Pressable>
        </View>
        <View style={styles.segment} onLayout={(e) => setSegW(e.nativeEvent.layout.width)}>
          {/* The white thumb slides between the two options like a rocker switch. */}
          {segW > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.segThumb,
                { width: (segW - 6) / 2, transform: [{ translateX: segPos.interpolate({ inputRange: [0, 1], outputRange: [0, (segW - 6) / 2] }) }] },
              ]}
            />
          )}
          {(['plan', 'race'] as Mode[]).map((m) => (
            <Pressable key={m} onPress={() => pickMode(m)} style={styles.segBtn} accessibilityRole="button" accessibilityState={{ selected: mode === m }}>
              <Text style={[styles.segText, { color: mode === m ? BRAND_BLUE : '#dbe9f2' }]}>{m === 'plan' ? 'Plan ahead' : 'Race day'}</Text>
            </Pressable>
          ))}
        </View>
        <RunnerBar runners={rs.runners} activeId={runnerId} onPick={switchRunner} onAdd={(n, b) => { setLogs({}); setGoal(30 * 60); setHistory([]); setSel('ibex'); setEntry(null); rs.add(n, b); }} onUpdate={rs.update} onRemove={(id) => { if (id === runnerId) { setLogs({}); setGoal(30 * 60); setHistory([]); } rs.remove(id); }} />
      </View>

      {nextCard && !nextCard.empty && (
        <View style={styles.top} {...pan.panHandlers}>
          <Animated.View style={{ transform: [{ scale: pop }] }}>
          <Animated.View pointerEvents="none" style={[styles.halo, { backgroundColor: t.accent, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.75] }) }]} />
          <Pressable onPress={() => setOpen(!expanded)} style={[styles.result, { backgroundColor: t.primary }]} accessibilityRole="button" accessibilityLabel={`Next crew stop ${shortName(nextCard.nextSt.name)}, runner arrives ${absLabel(nextCard.nextAbs)}. ${expanded ? 'Collapse' : 'Expand'} details`}>
            <View style={styles.resultBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultKicker}>NEXT CREW STOP</Text>
                <Text style={styles.resultTitle} numberOfLines={1}>{shortName(nextCard.nextSt.name)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.resultCaption}>RUNNER ARRIVES</Text>
                <Text style={styles.resultTime}>{absLabel(nextCard.nextAbs)}</Text>
              </View>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#ffffff" />
            </View>
            {expanded && (
              <View style={{ marginTop: 6 }}>
                {nextCard.between.length > 0 && (
                  <Text style={styles.resultMeta}>
                    {`Passes ${nextCard.between.map((b) => `${shortName(b.name)} ${absLabel(START_ABS + Math.round(elapsed[b.id] * 60)).replace(/^\w+ /, '')}`).join(', ')}`}
                  </Text>
                )}
                <Text style={styles.resultMeta}>
                  {`Runner: ${u.dist(nextCard.miles)} from ${shortName(nextCard.from.name)} (left ${absLabel(logs[nextCard.from.id]).replace(/^\w+ /, '')}), about ${durationLabel(nextCard.legMin / 60)} of running`}
                  {nextCard.margin != null
                    ? ` · ${durationLabel(Math.abs(nextCard.margin))} ${nextCard.margin >= 0 ? 'ahead of' : 'behind'} the cutoff`
                    : ''}
                </Text>
                {nextCard.crew && (
                  <Text style={styles.resultMeta}>
                    {nextCard.crew.slack < 0
                      ? `Crew drive: can't make it from ${nextCard.crew.fromName}. The ${nextCard.crew.approx ? '~' : ''}${durationLabel(nextCard.crew.driveMin / 60)} drive leaves crew about ${durationLabel(-nextCard.crew.slack / 60)} short.`
                      : `Crew drive: leave ${nextCard.crew.fromName} by ${absLabel(nextCard.crew.leaveBy).replace(/^\w+ /, '')} (${nextCard.crew.approx ? '~' : ''}${durationLabel(nextCard.crew.driveMin / 60)} drive).`}
                  </Text>
                )}
                <Pressable
                  onPress={() => router.push(`/aid/${nextCard.nextSt.id}`)}
                  style={({ pressed }) => [styles.directions, pressed && { opacity: 0.75 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Directions and info for ${shortName(nextCard.nextSt.name)}`}
                >
                  <Ionicons name="navigate" size={18} color={BRAND_BLUE} />
                  <Text style={styles.directionsText}>Directions & station info</Text>
                  <Ionicons name="chevron-forward" size={18} color={BRAND_BLUE} />
                </Pressable>
              </View>
            )}
          </Pressable>
          </Animated.View>
        </View>
      )}

      <View style={{ flex: 1 }}>
      <ScrollView
        ref={scroller}
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={32}
        onScroll={(e) => {
          const past = e.nativeEvent.contentOffset.y > cardBottom - 24;
          setPinned((p) => (p === past ? p : past));
        }}
      >
        {mode === 'plan' ? (
          <Card>
            <Text style={[styles.label, { color: t.muted }]}>GOAL FINISH TIME (HOURS : MINUTES)</Text>
            <View style={styles.stepper}>
              <Pressable onPress={() => updateGoal(goal - 15)} style={[styles.stepBtn, { backgroundColor: t.primarySoft }]} accessibilityLabel="Faster by 15 minutes">
                <Ionicons name="remove" size={28} color={t.primary} />
              </Pressable>
              <Text style={[styles.goal, { color: t.text }]}>{goalLabel(goal)}</Text>
              <Pressable onPress={() => updateGoal(goal + 15)} style={[styles.stepBtn, { backgroundColor: t.primarySoft }]} accessibilityLabel="Slower by 15 minutes">
                <Ionicons name="add" size={28} color={t.primary} />
              </Pressable>
            </View>
            <Text style={[styles.goalSub, { color: t.muted }]}>Each tap changes it by 15 minutes</Text>
            <View style={styles.presets}>
              {PRESETS.map((h) => {
                const on = goal === h * 60;
                return (
                  <Pressable key={h} onPress={() => updateGoal(h * 60)} style={[styles.preset, { backgroundColor: on ? t.primary : t.card, borderColor: on ? t.primary : t.border }]}>
                    <Text style={[styles.presetText, { color: on ? '#ffffff' : t.text }]}>{h}h</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.finish, { color: t.text }]}>
              Finish line: <Text style={{ fontWeight: '900', color: t.accent }}>{clockLabel(goal / 60)}</Text>
            </Text>
          </Card>
        ) : (
          <View onLayout={(e) => setCardBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          <Card>
            {lastLoggedIdx < 0 && (
              <View style={[styles.startNote, { backgroundColor: t.primarySoft }]}>
                <Text style={[styles.startNoteText, { color: t.text }]}>
                  Nothing logged yet, so times below follow your {goalLabel(goal)} plan. Once you log a station they switch to your runner's real pace.
                </Text>
                <Pressable onPress={() => pickMode('plan')} hitSlop={8}>
                  <Text style={[styles.link, { color: t.primary }]}>Change plan</Text>
                </Pressable>
              </View>
            )}
            <Text style={[styles.label, { color: t.muted }]} numberOfLines={1}>{`${rs.active.name.toUpperCase()} ARRIVED AT`}</Text>
            <View style={styles.pickRow}>
              <Pressable onPress={() => step(-1)} disabled={selIdx === 0} style={[styles.arrow, { backgroundColor: t.primarySoft, opacity: selIdx === 0 ? 0.35 : 1 }]} accessibilityLabel="Previous station">
                <Ionicons name="chevron-back" size={24} color={t.primary} />
              </Pressable>
              <View style={styles.wheel}>
                {leaving && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.wheelOut,
                      { opacity: go.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }), transform: [{ translateX: go.interpolate({ inputRange: [0, 1], outputRange: [0, -dir * 18] }) }] },
                    ]}
                  >
                    {nameBlock(leaving)}
                  </Animated.View>
                )}
                <Animated.View
                  style={{
                    alignItems: 'center',
                    opacity: go.interpolate({ inputRange: [0.15, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
                    transform: [{ translateX: go.interpolate({ inputRange: [0, 1], outputRange: [dir * 18, 0] }) }],
                  }}
                >
                  {nameBlock(sel)}
                </Animated.View>
              </View>
              <Pressable onPress={() => step(1)} disabled={selIdx === loggable.length - 1} style={[styles.arrow, { backgroundColor: t.primarySoft, opacity: selIdx === loggable.length - 1 ? 0.35 : 1 }]} accessibilityLabel="Next station">
                <Ionicons name="chevron-forward" size={24} color={t.primary} />
              </Pressable>
            </View>

            <Pressable onPress={() => router.push(`/aid/${sel}`)} hitSlop={8} style={styles.infoLink} accessibilityRole="button" accessibilityLabel={`Station info for ${shortName(selStation.name)}`}>
              <Ionicons name="information-circle-outline" size={16} color={t.primary} />
              <Text style={[styles.infoLinkText, { color: t.primary }]}>Station info and directions</Text>
            </Pressable>
            <Pressable onPress={() => setEditTime((e) => !e)} disabled={saving} style={styles.timeChip} accessibilityRole="button" accessibilityLabel={`Time ${absLabel(entryAbs)}. Tap to change`}>
              <Text style={[styles.timeChipText, { color: t.text }]}>{absLabel(entryAbs)}</Text>
              <Ionicons name={editTime ? 'chevron-up' : 'create-outline'} size={18} color={t.primary} />
            </Pressable>
            <Text style={[styles.goalSub, { color: t.muted }]}>
              {entry != null ? 'Time set by hand' : raceStarted ? 'Current time. Tap it to change.' : 'Current time (the race hasn\'t started). Tap it to change.'}
            </Text>
            {editTime && (
              <View style={styles.timeRow}>
                <View style={[styles.daySeg, { backgroundColor: t.primarySoft }]}>
                  {['Fri', 'Sat'].map((d, i) => {
                    const on = Math.floor(entryAbs / DAY) === i;
                    return (
                      <Pressable key={d} onPress={() => setDay(i)} style={[styles.segBtn, on && { backgroundColor: t.card }]}>
                        <Text style={[styles.segText, { color: on ? t.primary : t.muted }]}>{d}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TimeField minutes={entryAbs % DAY} onChange={setTimeOfDay} />
              </View>
            )}
            {editTime && entry != null && (
              <Pressable onPress={() => setEntry(null)} hitSlop={8} style={{ alignSelf: 'center', marginTop: 8 }}>
                <Text style={[styles.link, { color: t.primary }]}>Use the current time</Text>
              </Pressable>
            )}

            <Pressable onPress={() => { setEditTime(false); saveEntry(); }} disabled={saving} style={[styles.save, { backgroundColor: saving ? t.green : t.primary }]} accessibilityLabel={saving ? 'Checked in' : `Check in at ${absLabel(entryAbs)}`}>
              {saving ? (
                <Animated.View style={[styles.savedRow, { transform: [{ scale: checkScale }] }]}>
                  <Ionicons name="checkmark-circle" size={26} color="#ffffff" />
                  <Text style={styles.saveText}>Checked in</Text>
                </Animated.View>
              ) : (
                <Text style={styles.saveText}>Check in</Text>
              )}
            </Pressable>
            <Pressable onPress={useLocation} disabled={locating} style={[styles.bump, { backgroundColor: t.primarySoft, opacity: locating ? 0.6 : 1, marginTop: 10, flexDirection: 'row', gap: 8 }]} accessibilityRole="button" accessibilityLabel="Pick the aid station nearest to my location">
              <Ionicons name="locate" size={18} color={t.primary} />
              <Text style={[styles.bumpText, { color: t.primary }]}>{locating ? 'Finding you…' : 'Use my location for the station'}</Text>
            </Pressable>
            {locNote && <Text style={[styles.goalSub, { color: t.muted }]}>{locNote}</Text>}
            <View style={styles.undoRow}>
              <Pressable onPress={undo} disabled={history.length === 0 || saving} hitSlop={6} style={[styles.undoBtn, { opacity: history.length === 0 || saving ? 0.35 : 1 }]} accessibilityLabel="Undo last change">
                <Ionicons name="arrow-undo" size={18} color={t.primary} />
                <Text style={[styles.undoText, { color: t.primary }]}>Undo</Text>
              </Pressable>
              <Pressable onPress={clearAll} disabled={lastLoggedIdx < 0 || saving} hitSlop={6} style={[styles.undoBtn, { opacity: lastLoggedIdx < 0 || saving ? 0.35 : 1 }]} accessibilityLabel="Clear all logged times">
                <Ionicons name="trash-outline" size={18} color={t.red} />
                <Text style={[styles.undoText, { color: t.red }]}>Clear all</Text>
              </Pressable>
            </View>
            {lastLoggedIdx >= 0 && (
              <View style={[styles.projBox, { borderTopColor: t.border }]}>
                <Text style={[styles.label, { color: t.muted }]}>PROJECTED FINISH</Text>
                <Text style={[styles.projTime, { color: t.accent }]}>{clockLabel(projectedGoalMin / 60)}</Text>
                <Text style={[styles.goalSub, { color: t.muted }]}>
                  {`${durationLabel(projectedGoalMin / 60)} total · based on ${Object.keys(logs).length > 1 ? `${Object.keys(logs).length} logged times` : shortName(AID_STATIONS[lastLoggedIdx].name)}`}
                </Text>
              </View>
            )}
          </Card>
          </View>
        )}

        <View style={styles.listHead}>
          <SectionTitle>{liveActive ? 'Updated arrival times' : 'Arrival times'}</SectionTitle>
        </View>
        {AID_STATIONS.map((s, idx) => {
          const e = elapsed[s.id];
          const isLogged = mode === 'race' && logs[s.id] != null;
          const isEst = liveActive && idx < lastLoggedIdx && !isLogged && s.kind !== 'start';
          const cutoff = CUTOFF_HOURS[s.id];
          const margin = cutoff != null ? cutoff - e : null;
          const behind = margin != null && margin < 0;
          const tight = margin != null && margin >= 0 && margin < 0.75;
          const cd = drive[s.id];
          let slack: number | null = null;
          let leaveBy = 0;
          let prevName = '';
          const leg = crewLeg(s.id, elapsed);
          if (cd && leg) {
            prevName = shortName(AID_STATIONS.find((a) => a.id === cd.fromId)!.name);
            slack = leg.slackMin;
            leaveBy = START_ABS + Math.round(leg.leaveByMin);
          }
          const passed = liveActive && idx <= lastLoggedIdx;
          const selected = mode === 'race' && s.id === sel;
          const canLog = mode === 'race' && s.kind !== 'start';
          return (
            <Pressable
              key={s.id}
              onLayout={(e) => {
                rowY.current[s.id] = e.nativeEvent.layout.y;
              }}
              disabled={!canLog}
              onPress={() => {
                choose(s.id);
                scroller.current?.scrollTo({ y: 0, animated: true });
              }}
              style={[styles.tlRow, selected && { backgroundColor: t.primarySoft }, { opacity: passed && !isLogged ? 0.6 : 1 }]}
            >
              <View
                pointerEvents="none"
                style={[styles.railLine, { backgroundColor: t.border }, idx === 0 ? { top: 24 } : { top: 0 }, idx === AID_STATIONS.length - 1 ? { height: 24 } : { bottom: 0 }]}
              />
              <TimelineDot logged={isLogged} selected={selected} behind={behind} />
              <View style={styles.rowTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: t.text, flexShrink: 1 }]}>{s.name}</Text>
                    <Pressable onPress={() => router.push(`/aid/${s.id}`)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Station info for ${shortName(s.name)}`}>
                      <Ionicons name="information-circle-outline" size={20} color={t.primary} />
                    </Pressable>
                    {isLogged && (
                      <View style={[styles.loggedPill, { backgroundColor: t.green }]}>
                        <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                        <Text style={styles.loggedPillText}>Logged</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.mile, { color: t.muted }]}>
                    {u.metric ? 'Km' : 'Mile'} {u.distNum(s.mile)}
                    {s.kind !== 'start' ? ` · ${durationLabel(e)} into the race` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.etaCaption, { color: t.muted }]}>{s.kind === 'start' ? 'Start' : isLogged ? 'Runner arrived' : isEst ? 'Runner est.' : 'Runner arrives'}</Text>
                  <Text style={[styles.eta, { color: isLogged ? t.green : t.primary }]}>{s.kind === 'start' ? 'Fri 6:00 AM' : clockLabel(e)}</Text>
                  {canLog && !isLogged && !passed && (
                    <Text style={[styles.logged, { color: t.primary }]}>Tap to log</Text>
                  )}
                </View>
              </View>
              {isLogged && (
                <Pressable onPress={() => clearLog(s.id, s.name)} hitSlop={8} style={styles.clear}>
                  <Text style={[styles.clearText, { color: t.muted }]}>Clear logged time</Text>
                </Pressable>
              )}
              {margin != null && (
                <View style={[styles.tag, { backgroundColor: tint(behind ? t.red : tight ? t.amber : t.green) }]}>
                  <Ionicons name={behind ? 'warning' : 'time-outline'} size={13} color={behind ? t.red : tight ? t.amber : t.green} />
                  <Text style={[styles.tagText, { color: behind ? t.red : tight ? t.amber : t.green }]}>
                    {behind ? `${durationLabel(margin)} behind the ${clockLabel(cutoff)} cutoff` : `${durationLabel(margin)} ahead of the ${clockLabel(cutoff)} cutoff`}
                  </Text>
                </View>
              )}
              {cd && slack != null && !passed && (
                <View style={[styles.tag, { backgroundColor: tint(slack < 0 ? t.red : slack < 30 ? t.amber : t.primary) }]}>
                  <Ionicons name="car" size={13} color={slack < 0 ? t.red : slack < 30 ? t.amber : t.primary} />
                  <Text style={[styles.tagText, { color: slack < 0 ? t.red : slack < 30 ? t.amber : t.primary }]}>
                    {slack < 0
                      ? `Crew drive: can't make it from ${prevName}. The ${cd.approx ? '~' : ''}${durationLabel(cd.minutes / 60)} drive leaves crew about ${durationLabel(-slack / 60)} short`
                      : `Crew drive: leave ${prevName} by ${absLabel(leaveBy)} (${cd.approx ? '~' : ''}${durationLabel(cd.minutes / 60)} drive)`}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      {mode === 'race' && (
        <Animated.View
          pointerEvents={showBar ? 'auto' : 'none'}
          style={[styles.pinBar, { backgroundColor: t.card, borderColor: t.border, opacity: barIn, transform: [{ translateY: barIn.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] }]}
        >
          <Pressable
            onPress={() => scroller.current?.scrollTo({ y: 0, animated: true })}
            style={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityLabel={`${rs.active.name} at ${shortName(selStation.name)}, ${absLabel(entryAbs)}. Scroll to the check in card`}
          >
            <Text style={[styles.pinCaption, { color: t.muted }]} numberOfLines={1}>{`${rs.active.name.toUpperCase()} ARRIVED AT`}</Text>
            <Text style={[styles.pinTitle, { color: t.text }]} numberOfLines={1}>{`${shortName(selStation.name)} · ${absLabel(entryAbs)}`}</Text>
          </Pressable>
          <Pressable onPress={checkInFromBar} disabled={saving} style={[styles.pinBtn, { backgroundColor: saving ? t.green : t.primary }]} accessibilityRole="button" accessibilityLabel={`Check in at ${absLabel(entryAbs)}`}>
            <Text style={styles.pinBtnText}>{saving ? 'Checked in' : 'Check in'}</Text>
          </Pressable>
        </Animated.View>
      )}
      </View>
      <HowItWorks visible={info} onClose={() => setInfo(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: BRAND_BLUE, paddingHorizontal: 16, paddingBottom: 12, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  top: { paddingHorizontal: 16, paddingTop: 10, zIndex: 2 },
  pinBar: { position: 'absolute', top: 8, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingLeft: 14, paddingRight: 8, borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  pinCaption: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  pinTitle: { fontSize: 16, fontWeight: '800', marginTop: 1 },
  pinBtn: { paddingHorizontal: 16, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pinBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  infoLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10 },
  infoLinkText: { fontSize: 14, fontWeight: '800' },
  timeChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 6 },
  timeChipText: { fontSize: 28, fontWeight: '900' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 },
  content: { padding: 16, paddingBottom: 40 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  daySeg: { flex: 1, height: 52, flexDirection: 'row', borderRadius: 12, padding: 3 },
  timeBox: { width: 150, height: 52, alignItems: 'center', justifyContent: 'center' },
  segThumb: { position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: 10, backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: 10 },
  segText: { fontSize: 15, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  stepBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  goal: { fontSize: 52, fontWeight: '900', lineHeight: 58 },
  goalSub: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 },
  preset: { paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', borderRadius: 22, borderWidth: 1 },
  presetText: { fontSize: 15, fontWeight: '800' },
  finish: { textAlign: 'center', fontSize: 16, marginTop: 16, fontWeight: '600' },
  startNote: { borderRadius: 12, padding: 12, marginBottom: 14 },
  startNoteText: { fontSize: 13, lineHeight: 19 },
  link: { fontSize: 14, fontWeight: '800', marginTop: 6 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  arrow: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stationName: { fontSize: 22, lineHeight: 27, fontWeight: '900', textAlign: 'center', },
  wheelOut: { position: 'absolute', top: 2, left: 0, right: 0, alignItems: 'center' },
  wheel: { flex: 1, overflow: 'hidden', paddingVertical: 2 },
  nameBox: { minHeight: 54, justifyContent: 'center' },
  androidTime: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12 },
  androidTimeText: { fontSize: 24, fontWeight: '900' },
  bump: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 12 },
  bumpText: { fontSize: 14, fontWeight: '800' },
  save: { alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: 14, marginTop: 14 },
  projBox: { alignItems: 'center', borderTopWidth: 1, marginTop: 8, paddingTop: 14 },
  projTime: { fontSize: 34, fontWeight: '900', lineHeight: 40, marginTop: 2 },
  undoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 6 },
  undoText: { fontSize: 15, fontWeight: '800' },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  tlRow: { paddingLeft: 40, paddingRight: 10, paddingVertical: 12, borderRadius: 14 },
  railLine: { position: 'absolute', left: 17, width: 2 },
  dotFill: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', left: 9, top: 16, width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  listHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  row: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 16, fontWeight: '800' },
  mile: { fontSize: 12, marginTop: 2 },
  etaCaption: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  eta: { fontSize: 15, fontWeight: '900' },
  logged: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  loggedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  loggedPillText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  loggedRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  clear: { alignSelf: 'flex-start', paddingVertical: 8 },
  clearText: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, marginTop: 8 },
  tagText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  result: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  resultKicker: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  resultBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginTop: 1 },
  resultCaption: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  resultTime: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
  halo: { position: 'absolute', top: -5, bottom: -5, left: -5, right: -5, borderRadius: 19 },
  directions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, borderRadius: 12, marginTop: 12, backgroundColor: '#ffffff' },
  directionsText: { color: BRAND_BLUE, fontSize: 15, fontWeight: '800' },
  resultMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginTop: 4, lineHeight: 18 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  point: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  pointDot: { fontSize: 18, lineHeight: 22, fontWeight: '900' },
  pointText: { flex: 1, fontSize: 15, lineHeight: 22 },
});
