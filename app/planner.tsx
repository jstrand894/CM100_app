import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionTitle, tint } from '../src/components/ui';
import { AID_STATIONS } from '../src/data/aidStations';
import {
  AID_STOP_MINUTES,
  clockLabel,
  CREW_DRIVE,
  CUTOFF_HOURS,
  durationLabel,
  elapsedHours,
  impliedFinishHours,
  START_HOUR,
} from '../src/data/pace';
import { useTheme } from '../src/theme';

const GOAL_KEY = 'cm100.goalMinutes';
const LOG_KEY = 'cm100.liveLogs';
const MIN = 24 * 60;
const MAX = 36 * 60;
const PRESETS = [27, 28.5, 30, 32, 34, 36];
const START_ABS = START_HOUR * 60; // minutes after Friday midnight at the gun

const goalLabel = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
// Absolute minutes after Friday 12:00 AM -> label such as "Fri 10:45 AM"
const absLabel = (abs: number) => clockLabel((abs - START_ABS) / 60);

type Mode = 'goal' | 'live';
type Logs = Record<string, number>; // station id -> absolute minutes after Fri 12:00 AM

export default function PlannerScreen() {
  const t = useTheme();
  const [mode, setMode] = useState<Mode>('goal');
  const [goal, setGoal] = useState(30 * 60);
  const [logs, setLogs] = useState<Logs>({});
  const [sel, setSel] = useState('ibex'); // station being logged
  const [entry, setEntry] = useState<number | null>(null); // absolute minutes being entered

  useEffect(() => {
    AsyncStorage.getItem(GOAL_KEY)
      .then((v) => v && setGoal(Math.min(Math.max(parseInt(v, 10) || 30 * 60, MIN), MAX)))
      .catch(() => {});
    AsyncStorage.getItem(LOG_KEY)
      .then((v) => v && setLogs(JSON.parse(v)))
      .catch(() => {});
  }, []);

  const updateGoal = (min: number) => {
    const m = Math.min(Math.max(min, MIN), MAX);
    setGoal(m);
    AsyncStorage.setItem(GOAL_KEY, String(m)).catch(() => {});
  };
  const saveLogs = (next: Logs) => {
    setLogs(next);
    AsyncStorage.setItem(LOG_KEY, JSON.stringify(next)).catch(() => {});
  };

  const order = AID_STATIONS.map((s) => s.id);
  // The latest station with a logged time drives the live projection.
  const lastLoggedIdx = order.reduce((acc, id, i) => (logs[id] != null ? i : acc), -1);
  const liveActive = mode === 'live' && lastLoggedIdx >= 0;
  const impliedFinish = liveActive
    ? impliedFinishHours(order[lastLoggedIdx], (logs[order[lastLoggedIdx]] - START_ABS) / 60)
    : null;
  const projectedGoalMin = impliedFinish != null ? Math.round(impliedFinish * 60) : goal;

  const elapsed = useMemo(() => {
    const base = elapsedHours(projectedGoalMin / 60);
    if (mode !== 'live') return base;
    const out = { ...base };
    for (const id of order) if (logs[id] != null) out[id] = (logs[id] - START_ABS) / 60;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectedGoalMin, logs, mode]);

  const drive = useMemo(() => Object.fromEntries(CREW_DRIVE.map((d) => [d.id, d])), []);
  const hikeAt = (id: string) => drive[id]?.hikeMinutes ?? 0;

  const selStation = AID_STATIONS.find((s) => s.id === sel)!;
  const planned = START_ABS + Math.round(elapsedHours(goal / 60)[sel] * 60); // your original goal plan
  const projected = START_ABS + Math.round(elapsedHours(projectedGoalMin / 60)[sel] * 60);
  const entryAbs = entry ?? Math.round(projected / 5) * 5;
  const bump = (m: number) => setEntry(entryAbs + m);
  const useNow = () => {
    const d = new Date();
    const day = Math.floor(entryAbs / 1440);
    setEntry(day * 1440 + d.getHours() * 60 + d.getMinutes());
  };
  const saveEntry = () => {
    saveLogs({ ...logs, [sel]: entryAbs });
    setEntry(null);
  };
  const clearLog = (id: string) => {
    const next = { ...logs };
    delete next[id];
    saveLogs(next);
  };

  const loggable = AID_STATIONS.filter((s) => s.kind !== 'start');

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <View style={[styles.segment, { backgroundColor: t.primarySoft }]}>
        {(['goal', 'live'] as Mode[]).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.segBtn, mode === m && { backgroundColor: t.card }]}>
            <Text style={[styles.segText, { color: mode === m ? t.primary : t.muted }]}>{m === 'goal' ? 'Goal time' : 'Live updates'}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'goal' ? (
        <Card>
          <Text style={[styles.label, { color: t.muted }]}>GOAL FINISH TIME</Text>
          <View style={styles.stepper}>
            <Pressable onPress={() => updateGoal(goal - 15)} style={[styles.stepBtn, { backgroundColor: t.primarySoft }]} accessibilityLabel="Faster by 15 minutes">
              <Ionicons name="remove" size={26} color={t.primary} />
            </Pressable>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.goal, { color: t.text }]}>{goalLabel(goal)}</Text>
              <Text style={[styles.goalSub, { color: t.muted }]}>hours : minutes</Text>
            </View>
            <Pressable onPress={() => updateGoal(goal + 15)} style={[styles.stepBtn, { backgroundColor: t.primarySoft }]} accessibilityLabel="Slower by 15 minutes">
              <Ionicons name="add" size={26} color={t.primary} />
            </Pressable>
          </View>
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
            Finish: <Text style={{ fontWeight: '900', color: t.accent }}>{clockLabel(goal / 60)}</Text>
          </Text>
        </Card>
      ) : (
        <Card>
          <Text style={[styles.label, { color: t.muted }]}>LOG WHEN YOUR RUNNER PASSES A STATION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {loggable.map((s) => {
              const on = s.id === sel;
              const done = logs[s.id] != null;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    setSel(s.id);
                    setEntry(null);
                  }}
                  style={[styles.preset, { backgroundColor: on ? t.primary : t.card, borderColor: on ? t.primary : t.border }]}
                >
                  <Text style={[styles.presetText, { color: on ? '#ffffff' : t.text }]}>
                    {done ? '✓ ' : ''}
                    {s.name.replace(/^(Finish): /, '').replace(/ \((first|second) visit\)/, ' $1')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.entryTime, { color: t.text }]}>{absLabel(entryAbs)}</Text>
          <Text style={[styles.goalSub, { color: t.muted, textAlign: 'center' }]}>
            Plan was {absLabel(planned)} · mile {selStation.mile}
          </Text>
          <View style={styles.bumpRow}>
            {[-15, -5, 5, 15].map((m) => (
              <Pressable key={m} onPress={() => bump(m)} style={[styles.bump, { backgroundColor: t.primarySoft }]}>
                <Text style={[styles.bumpText, { color: t.primary }]}>
                  {m > 0 ? '+' : '−'}
                  {Math.abs(m)}m
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.bumpRow}>
            <Pressable onPress={() => setEntry(entryAbs >= 1440 ? entryAbs - 1440 : entryAbs + 1440)} style={[styles.bump, { backgroundColor: t.primarySoft, flex: 1 }]}>
              <Text style={[styles.bumpText, { color: t.primary }]}>{entryAbs >= 1440 ? 'Sat → Fri' : 'Fri → Sat'}</Text>
            </Pressable>
            <Pressable onPress={useNow} style={[styles.bump, { backgroundColor: t.primarySoft, flex: 1 }]}>
              <Text style={[styles.bumpText, { color: t.primary }]}>Use current time</Text>
            </Pressable>
          </View>
          <Pressable onPress={saveEntry} style={[styles.save, { backgroundColor: t.primary }]}>
            <Text style={styles.saveText}>Save {selStation.name.replace(/^Finish: /, '')} at {absLabel(entryAbs)}</Text>
          </Pressable>
          {lastLoggedIdx >= 0 && (
            <Text style={[styles.finish, { color: t.text }]}>
              Projected finish: <Text style={{ fontWeight: '900', color: t.accent }}>{clockLabel(projectedGoalMin / 60)}</Text>
              {'\n'}
              <Text style={{ fontSize: 13, color: t.muted }}>based on {AID_STATIONS[lastLoggedIdx].name.replace(/^Finish: /, '')}</Text>
            </Text>
          )}
        </Card>
      )}

      <SectionTitle>{liveActive ? 'Updated arrival times' : 'When your runner arrives'}</SectionTitle>
      {AID_STATIONS.map((s, idx) => {
        const e = elapsed[s.id];
        const isLogged = mode === 'live' && logs[s.id] != null;
        const isEst = liveActive && idx < lastLoggedIdx && !isLogged;
        const cutoff = CUTOFF_HOURS[s.id];
        const margin = cutoff != null ? cutoff - e : null;
        const behind = margin != null && margin < 0;
        const tight = margin != null && margin >= 0 && margin < 0.75;
        const cd = drive[s.id];
        let slack: number | null = null;
        let prevName = '';
        if (cd) {
          const prev = AID_STATIONS.find((a) => a.id === cd.fromId)!;
          prevName = prev.name.replace(/^(Start|Finish): /, '');
          const arrive = e * 60 - hikeAt(s.id);
          const leave = elapsed[cd.fromId] * 60 + (cd.fromId === 'start' ? 0 : AID_STOP_MINUTES) + hikeAt(cd.fromId);
          slack = arrive - leave - cd.minutes;
        }
        const passed = liveActive && idx <= lastLoggedIdx;
        return (
          <View key={s.id} style={[styles.row, { backgroundColor: t.card, borderColor: behind ? t.red : isLogged ? t.green : t.border, opacity: passed && !isLogged ? 0.6 : 1 }]}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: t.text }]}>{s.name}</Text>
                <Text style={[styles.mile, { color: t.muted }]}>
                  Mile {s.mile}
                  {s.kind !== 'start' ? ` · ${durationLabel(e)} into the race` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.eta, { color: isLogged ? t.green : t.primary }]}>{s.kind === 'start' ? 'Fri 6:00 AM' : clockLabel(e)}</Text>
                {isLogged && (
                  <Pressable onPress={() => clearLog(s.id)} hitSlop={8}>
                    <Text style={[styles.logged, { color: t.green }]}>Logged · tap to clear</Text>
                  </Pressable>
                )}
                {isEst && <Text style={[styles.logged, { color: t.muted }]}>Estimated</Text>}
              </View>
            </View>
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
                  {cd.approx ? '~' : ''}
                  {durationLabel(cd.minutes / 60)} drive from {prevName} ·{' '}
                  {slack < 0 ? `can't make it (${durationLabel(slack / 60)} short)` : `${durationLabel(slack / 60)} to spare`}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      <Text style={[styles.note, { color: t.muted }]}>
        Estimates come from past finisher splits (27 to 34 hour finishes). In live mode, your logged time at the latest station sets
        the pace for the rest of the course. Real races vary with weather, conditions and aid station stops. Drive slack assumes{' '}
        {AID_STOP_MINUTES} minutes at each crewed station, 2025 drive times, and 15 minutes for the 0.7 mi Sunlight hike each way. The
        race warns that Sunlight and Crandall, and Crandall and Forest Lake, are hard to crew together because of rough roads.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 14 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  segText: { fontSize: 14, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  stepBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  goal: { fontSize: 52, fontWeight: '900', lineHeight: 58 },
  goalSub: { fontSize: 12, fontWeight: '600' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 },
  chipRow: { gap: 8, paddingVertical: 12 },
  preset: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  presetText: { fontSize: 14, fontWeight: '800' },
  finish: { textAlign: 'center', fontSize: 16, marginTop: 16, fontWeight: '600' },
  entryTime: { fontSize: 34, fontWeight: '900', textAlign: 'center', marginTop: 4 },
  bumpRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  bump: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12 },
  bumpText: { fontSize: 14, fontWeight: '800' },
  save: { alignItems: 'center', paddingVertical: 14, borderRadius: 14, marginTop: 14 },
  saveText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  row: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 16, fontWeight: '800' },
  mile: { fontSize: 12, marginTop: 2 },
  eta: { fontSize: 15, fontWeight: '900' },
  logged: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  tagText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 12, marginHorizontal: 4 },
});
