import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionTitle, tint } from '../src/components/ui';
import { AID_STATIONS } from '../src/data/aidStations';
import { AID_STOP_MINUTES, clockLabel, CREW_DRIVE, CUTOFF_HOURS, durationLabel, elapsedHours } from '../src/data/pace';
import { useTheme } from '../src/theme';

const KEY = 'cm100.goalMinutes';
const MIN = 24 * 60;
const MAX = 36 * 60;
const PRESETS = [27, 28.5, 30, 32, 34, 36];

const goalLabel = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

export default function PlannerScreen() {
  const t = useTheme();
  const [goal, setGoal] = useState(30 * 60);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setGoal(Math.min(Math.max(parseInt(v, 10) || 30 * 60, MIN), MAX)))
      .catch(() => {});
  }, []);
  const update = (min: number) => {
    const m = Math.min(Math.max(min, MIN), MAX);
    setGoal(m);
    AsyncStorage.setItem(KEY, String(m)).catch(() => {});
  };

  const elapsed = useMemo(() => elapsedHours(goal / 60), [goal]);
  const drive = useMemo(() => Object.fromEntries(CREW_DRIVE.map((d) => [d.id, d])), []);
  const hikeAt = (id: string) => drive[id]?.hikeMinutes ?? 0;

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <Card>
        <Text style={[styles.label, { color: t.muted }]}>GOAL FINISH TIME</Text>
        <View style={styles.stepper}>
          <Pressable onPress={() => update(goal - 15)} style={[styles.stepBtn, { backgroundColor: t.primarySoft }]} accessibilityLabel="Faster by 15 minutes">
            <Ionicons name="remove" size={26} color={t.primary} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.goal, { color: t.text }]}>{goalLabel(goal)}</Text>
            <Text style={[styles.goalSub, { color: t.muted }]}>hours : minutes</Text>
          </View>
          <Pressable onPress={() => update(goal + 15)} style={[styles.stepBtn, { backgroundColor: t.primarySoft }]} accessibilityLabel="Slower by 15 minutes">
            <Ionicons name="add" size={26} color={t.primary} />
          </Pressable>
        </View>
        <View style={styles.presets}>
          {PRESETS.map((h) => {
            const on = goal === h * 60;
            return (
              <Pressable key={h} onPress={() => update(h * 60)} style={[styles.preset, { backgroundColor: on ? t.primary : t.card, borderColor: on ? t.primary : t.border }]}>
                <Text style={[styles.presetText, { color: on ? '#ffffff' : t.text }]}>{h}h</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.finish, { color: t.text }]}>
          Finish: <Text style={{ fontWeight: '900', color: t.accent }}>{clockLabel(goal / 60)}</Text>
        </Text>
      </Card>

      <SectionTitle>When your runner arrives</SectionTitle>
      {AID_STATIONS.map((s) => {
        const e = elapsed[s.id];
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
        return (
          <View key={s.id} style={[styles.row, { backgroundColor: t.card, borderColor: behind ? t.red : t.border }]}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: t.text }]}>{s.name}</Text>
                <Text style={[styles.mile, { color: t.muted }]}>
                  Mile {s.mile}
                  {s.kind !== 'start' ? ` · ${durationLabel(e)} into the race` : ''}
                </Text>
              </View>
              <Text style={[styles.eta, { color: t.primary }]}>{s.kind === 'start' ? 'Fri 6:00 AM' : clockLabel(e)}</Text>
            </View>
            {margin != null && (
              <View style={[styles.tag, { backgroundColor: tint(behind ? t.red : tight ? t.amber : t.green) }]}>
                <Ionicons name={behind ? 'warning' : 'time-outline'} size={13} color={behind ? t.red : tight ? t.amber : t.green} />
                <Text style={[styles.tagText, { color: behind ? t.red : tight ? t.amber : t.green }]}>
                  {behind ? `${durationLabel(margin)} behind the ${clockLabel(cutoff)} cutoff` : `${durationLabel(margin)} ahead of the ${clockLabel(cutoff)} cutoff`}
                </Text>
              </View>
            )}
            {cd && slack != null && (
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
        Estimates come from past finisher splits (27 to 34 hour finishes) and scale to your goal time. Real races vary with weather,
        conditions and aid station stops. Drive slack assumes {AID_STOP_MINUTES} minutes at each crewed station, 2025 drive times, and
        15 minutes for the 0.7 mi Sunlight hike each way. The race warns that Sunlight and Crandall, and Crandall and Forest Lake, are
        hard to crew together because of rough roads.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  stepBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  goal: { fontSize: 52, fontWeight: '900', lineHeight: 58 },
  goalSub: { fontSize: 12, fontWeight: '600' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 },
  preset: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  presetText: { fontSize: 14, fontWeight: '800' },
  finish: { textAlign: 'center', fontSize: 16, marginTop: 16, fontWeight: '600' },
  row: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 16, fontWeight: '800' },
  mile: { fontSize: 12, marginTop: 2 },
  eta: { fontSize: 15, fontWeight: '900' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  tagText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 12, marginHorizontal: 4 },
});
