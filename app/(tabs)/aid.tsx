import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader, tint } from '../../src/components/ui';
import { AID_STATIONS, AidStation, CREW_LABEL, CrewAccess } from '../../src/data/aidStations';
import { Theme, useTheme } from '../../src/theme';

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'crew', label: 'Crew', test: (s: AidStation) => s.crewAccess !== 'no' },
  { key: 'pacers', label: 'Pacers', test: (s: AidStation) => s.pacerAccess },
  { key: 'bags', label: 'Drop bags', test: (s: AidStation) => s.dropBags },
] as const;

const crewColor = (a: CrewAccess, t: Theme) => ({ yes: t.green, 'hike-in': t.amber, no: t.red })[a];
const kindColor = (k: AidStation['kind'], t: Theme) => ({ start: t.green, finish: t.red, cutoff: t.amber, aid: t.primary })[k];

function Chip({ label, color, icon }: { label: string; color: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.chip, { backgroundColor: tint(color) }]}>
      {icon && <Ionicons name={icon} size={12} color={color} />}
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

export default function AidStationsScreen() {
  const t = useTheme();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const active = FILTERS.find((f) => f.key === filter)!;
  const data = AID_STATIONS.filter(active.test);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title="Aid stations" subtitle="Cutoffs, crew access and directions" />
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const on = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filter, { backgroundColor: on ? t.primary : t.card, borderColor: on ? t.primary : t.border }]}
            >
              <Text style={[styles.filterText, { color: on ? '#ffffff' : t.text }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        contentContainerStyle={styles.content}
        data={data}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => {
          const kc = kindColor(item.kind, t);
          return (
            <Link href={{ pathname: '/aid/[id]', params: { id: item.id } }} asChild>
              <Pressable style={StyleSheet.flatten([styles.row, { backgroundColor: t.card, borderColor: t.border }])}>
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
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  filterText: { fontSize: 14, fontWeight: '700' },
  content: { padding: 16, gap: 10, paddingBottom: 30 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18, borderWidth: 1, gap: 12 },
  badge: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeNum: { fontSize: 19, fontWeight: '900' },
  badgeLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  name: { fontSize: 17, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  chipText: { fontSize: 12, fontWeight: '700' },
});
