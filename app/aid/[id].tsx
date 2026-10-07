import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card, SectionTitle } from '../../src/components/ui';
import { AID_STATIONS, CREW_LABEL } from '../../src/data/aidStations';
import { useTheme } from '../../src/theme';

export default function AidStationDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const station = AID_STATIONS.find((s) => s.id === id);
  if (!station) return <Text style={{ color: t.text, padding: 16 }}>Aid station not found.</Text>;

  const openMaps = () => {
    const c = station.coordinate!;
    const q = `${c.latitude},${c.longitude}`;
    Linking.openURL(Platform.OS === 'ios' ? `maps://?daddr=${q}` : `geo:${q}?q=${q}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: t.bg }}>
      <Stack.Screen options={{ title: station.name }} />
      <Text style={[styles.title, { color: t.text }]}>{station.name}</Text>
      <Text style={[styles.sub, { color: t.accent }]}>{CREW_LABEL[station.crewAccess]}</Text>
      <Text style={[styles.body, { color: t.text }]}>{station.summary}</Text>

      <SectionTitle>Details</SectionTitle>
      <Card>
        {station.details.map((d) => (
          <Text key={d} style={[styles.body, { color: t.text, marginBottom: 8 }]}>
            {'•  '}
            {d}
          </Text>
        ))}
      </Card>

      {station.coordinate ? (
        <Button label="Directions" onPress={openMaps} />
      ) : (
        <Card>
          <Text style={[styles.body, { color: t.muted }]}>
            Coordinates for this station haven't been added yet, so in-app directions aren't available. Offline routing is planned.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800' },
  sub: { fontSize: 15, fontWeight: '700', marginTop: 4, marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22 },
});
