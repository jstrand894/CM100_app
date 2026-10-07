import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AID_STATIONS, CREW_LABEL, CrewAccess } from '../../src/data/aidStations';
import { Theme, useTheme } from '../../src/theme';

const badgeColor = (a: CrewAccess, t: Theme) => ({ yes: t.green, 'hike-in': t.amber, no: t.red })[a];

export default function AidStationsScreen() {
  const t = useTheme();
  return (
    <FlatList
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={styles.content}
      data={AID_STATIONS}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => (
        <Link href={{ pathname: '/aid/[id]', params: { id: item.id } }} asChild>
          <Pressable style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={[styles.mile, { borderColor: t.border }]}>
              <Text style={[styles.mileNum, { color: t.text }]}>{item.mile}</Text>
              <Text style={[styles.mileLabel, { color: t.muted }]}>mi</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: t.text }]}>{item.name}</Text>
              <Text style={[styles.summary, { color: t.muted }]}>
                {item.cutoff ? `Cutoff ${item.cutoff}` : 'No cutoff'}
                {item.kind === 'cutoff' ? ' · not an aid station' : ''}
              </Text>
              {item.kind !== 'cutoff' && (
                <Text style={[styles.badge, { color: badgeColor(item.crewAccess, t) }]}>
                  {CREW_LABEL[item.crewAccess]}
                  {item.pacerAccess ? ' · Pacers OK' : ''}
                  {item.dropBags ? ' · Drop bags' : ''}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.muted} />
          </Pressable>
        </Link>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  mile: { width: 52, alignItems: 'center', borderRightWidth: 1, paddingRight: 10 },
  mileNum: { fontSize: 20, fontWeight: '800' },
  mileLabel: { fontSize: 11, fontWeight: '700' },
  name: { fontSize: 17, fontWeight: '700' },
  summary: { fontSize: 14, marginTop: 2 },
  badge: { fontSize: 12, fontWeight: '700', marginTop: 6 },
});
