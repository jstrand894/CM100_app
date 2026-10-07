import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AID_STATIONS, CREW_LABEL, CrewAccess } from '../../src/data/aidStations';
import { Theme, useTheme } from '../../src/theme';

const badgeColor = (a: CrewAccess, t: Theme) =>
  ({ yes: t.green, 'hike-in': t.amber, no: t.red, unknown: t.muted })[a];

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
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: t.text }]}>{item.name}</Text>
              <Text style={[styles.summary, { color: t.muted }]}>{item.summary}</Text>
              <Text style={[styles.badge, { color: badgeColor(item.crewAccess, t) }]}>{CREW_LABEL[item.crewAccess]}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1 },
  name: { fontSize: 17, fontWeight: '700' },
  summary: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  badge: { fontSize: 13, fontWeight: '700', marginTop: 8 },
});
