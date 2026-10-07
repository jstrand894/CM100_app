import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionTitle } from '../src/components/ui';
import { ElevationChart } from '../src/components/ElevationChart';
import { AID_STATIONS } from '../src/data/aidStations';
import elevation from '../src/data/elevation.json';
import { useTheme } from '../src/theme';

const raceGain = AID_STATIONS.reduce((s, a) => s + (a.gainFt ?? 0), 0);
const raceLoss = AID_STATIONS.reduce((s, a) => s + (a.lossFt ?? 0), 0);
const fmt = (n: number) => n.toLocaleString();

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: t.card, borderColor: t.border }]}>
      <Text style={[styles.statLabel, { color: t.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: t.primary }]}>{value}</Text>
      {sub ? <Text style={[styles.statSub, { color: t.muted }]}>{sub}</Text> : null}
    </View>
  );
}

export default function ElevationScreen() {
  const t = useTheme();
  const legs = AID_STATIONS.filter((s) => s.gainFt != null);
  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <Card>
        <ElevationChart stations={AID_STATIONS} />
      </Card>

      <View style={styles.grid}>
        <Stat label="Gain (race chart)" value={`${fmt(raceGain)} ft`} sub="Published by the race" />
        <Stat label="Loss (race chart)" value={`${fmt(raceLoss)} ft`} sub="Published by the race" />
        <Stat label="High point" value={`${fmt(elevation.maxFt)} ft`} sub="From USGS terrain" />
        <Stat label="Low point" value={`${fmt(elevation.minFt)} ft`} sub="From USGS terrain" />
      </View>
      <Text style={[styles.note, { color: t.muted }]}>
        The chart is built from USGS terrain data under the course GPX. It measures {fmt(elevation.gainFt)} ft of gain and{' '}
        {fmt(elevation.lossFt)} ft of loss, which reads lower than the race's figures because terrain models smooth out short steep
        sections. Watches read differently again.
      </Text>

      <SectionTitle>Climbing between stations (race chart)</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        {legs.map((s, i) => (
          <View key={s.id} style={[styles.leg, i > 0 && { borderTopWidth: 1, borderTopColor: t.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.legName, { color: t.text }]}>{s.name}</Text>
              <Text style={[styles.legMile, { color: t.muted }]}>Mile {s.mile}</Text>
            </View>
            <Text style={[styles.legUp, { color: t.red }]}>+{fmt(s.gainFt!)}</Text>
            <Text style={[styles.legDown, { color: t.green }]}>−{fmt(s.lossFt ?? 0)}</Text>
          </View>
        ))}
      </Card>
      <Text style={[styles.note, { color: t.muted }]}>
        Gain and loss are the climbing and descending between the previous station and this one, in feet.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48%', flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 14 },
  statLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  statSub: { fontSize: 11, marginTop: 2 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 12, marginHorizontal: 4 },
  leg: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 },
  legName: { fontSize: 15, fontWeight: '700' },
  legMile: { fontSize: 12, marginTop: 1 },
  legUp: { fontSize: 15, fontWeight: '800', width: 62, textAlign: 'right' },
  legDown: { fontSize: 15, fontWeight: '800', width: 62, textAlign: 'right' },
});
