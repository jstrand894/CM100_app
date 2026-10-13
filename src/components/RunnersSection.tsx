import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AID_STATIONS } from '../data/aidStations';
import { clockLabel, projectFromLogs, START_HOUR } from '../data/pace';
import { goalKey, logsKey, Role, Runner, useRunners } from '../runners';
import { useTheme } from '../theme';
import { tint } from './ui';

const START_ABS = START_HOUR * 60;
const shortName = (name: string) => name.replace(/^Start: .*$/, 'Start').replace(/^Finish: /, '');
const goalLabel = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

type Summary = { goal: number; lastName: string | null; lastAbs: number | null; finishHours: number };

async function summarize(r: Runner): Promise<Summary> {
  let goal = 30 * 60;
  let logs: Record<string, number> = {};
  try {
    const [g, l] = await Promise.all([AsyncStorage.getItem(goalKey(r.id)), AsyncStorage.getItem(logsKey(r.id))]);
    if (g) goal = parseInt(g, 10) || goal;
    if (l) logs = JSON.parse(l);
  } catch {}
  const hours: Record<string, number> = {};
  let last: (typeof AID_STATIONS)[number] | null = null;
  for (const s of AID_STATIONS) {
    if (logs[s.id] != null) {
      hours[s.id] = (logs[s.id] - START_ABS) / 60;
      last = s;
    }
  }
  return {
    goal,
    lastName: last ? shortName(last.name) : null,
    lastAbs: last ? logs[last.id] : null,
    finishHours: projectFromLogs(hours, goal / 60).finishHours,
  };
}

/** Role choice buttons, shared by the Home prompt and the welcome sheet. */
export function RolePicker({ role, onPick }: { role: Role | null; onPick: (r: Role) => void }) {
  const t = useTheme();
  const opts: { id: Role; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'runner', label: "I'm running", sub: 'Plan my own race', icon: 'walk' },
    { id: 'crew', label: "I'm crew", sub: 'Following runners', icon: 'people' },
  ];
  return (
    <View style={styles.pickRow}>
      {opts.map((o) => {
        const on = role === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => onPick(o.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.pick, { backgroundColor: on ? tint(t.primary, 0.14) : t.card, borderColor: on ? t.primary : t.border, borderWidth: on ? 2 : 1 }]}
          >
            <Ionicons name={o.icon} size={22} color={on ? t.primary : t.muted} />
            <Text style={[styles.pickLabel, { color: t.text }]}>{o.label}</Text>
            <Text style={[styles.pickSub, { color: t.muted }]}>{o.sub}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Home: "Me" for runners, "Your runners" for crew. Asks which one you are if that was never set. */
export function RunnersSection() {
  const t = useTheme();
  const rs = useRunners();
  const [sums, setSums] = useState<Record<string, Summary>>({});
  const [changing, setChanging] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      Promise.all(rs.runners.map(async (r) => [r.id, await summarize(r)] as const)).then((e) => live && setSums(Object.fromEntries(e)));
      return () => {
        live = false;
      };
    }, [rs.runners]),
  );

  if (rs.role === null) {
    return (
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
        <Text style={[styles.kicker, { color: t.muted }]}>HOW ARE YOU USING THE APP?</Text>
        <RolePicker role={rs.role} onPick={rs.setRole} />
      </View>
    );
  }

  const list = rs.role === 'runner' ? rs.runners.slice(0, 1) : rs.runners;
  const open = (id: string) => {
    rs.setActive(id);
    router.push('/planner');
  };

  return (
    <View style={{ marginTop: 14 }}>
      <View style={styles.head}>
        <Text style={[styles.kicker, { color: t.muted }]}>{rs.role === 'runner' ? 'ME' : 'YOUR RUNNERS'}</Text>
        <Pressable onPress={() => setChanging((c) => !c)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Change between runner and crew">
          <Text style={[styles.change, { color: t.primary }]}>{changing ? 'Done' : 'Change'}</Text>
        </Pressable>
      </View>
      {changing && (
        <View style={{ marginBottom: 10 }}>
          <RolePicker
            role={rs.role}
            onPick={(r) => {
              rs.setRole(r);
              setChanging(false);
            }}
          />
        </View>
      )}
      <View style={{ gap: 10 }}>
        {list.map((r) => {
          const s = sums[r.id];
          return (
            <Pressable
              key={r.id}
              onPress={() => open(r.id)}
              accessibilityRole="button"
              accessibilityLabel={`${r.name}. Open planner`}
              style={({ pressed }) => [styles.row, { backgroundColor: t.card, borderColor: t.border }, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.avatar, { backgroundColor: tint(t.primary, 0.14) }]}>
                <Ionicons name="person" size={20} color={t.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                  {r.name}
                  {r.bib ? ` · #${r.bib}` : ''}
                </Text>
                {s && (
                  <Text style={[styles.sub, { color: t.muted }]} numberOfLines={2}>
                    {s.lastName && s.lastAbs != null
                      ? `At ${s.lastName}, ${clockLabel((s.lastAbs - START_ABS) / 60)} · finish ${clockLabel(s.finishHours)}`
                      : `Goal ${goalLabel(s.goal)} · not started`}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.muted} />
            </Pressable>
          );
        })}
        {rs.role === 'crew' && (
          <Pressable onPress={() => router.push('/planner')} style={[styles.add, { borderColor: t.border }]} accessibilityRole="button" accessibilityLabel="Add a runner in the planner">
            <Ionicons name="add" size={18} color={t.primary} />
            <Text style={[styles.addText, { color: t.primary }]}>Add a runner</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 14, marginTop: 14, gap: 10 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  change: { fontSize: 14, fontWeight: '800' },
  pickRow: { flexDirection: 'row', gap: 10 },
  pick: { flex: 1, borderRadius: 14, padding: 12, gap: 2, alignItems: 'flex-start' },
  pickLabel: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  pickSub: { fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, padding: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 12 },
  addText: { fontSize: 15, fontWeight: '800' },
});
