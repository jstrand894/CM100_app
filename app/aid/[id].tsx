import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, SectionTitle } from '../../src/components/ui';
import { AID_STATIONS, CREW_LABEL } from '../../src/data/aidStations';
import { useTheme } from '../../src/theme';

function Row({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: t.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: t.text }]}>{value}</Text>
    </View>
  );
}

export default function AidStationDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const station = AID_STATIONS.find((s) => s.id === id);
  if (!station) return <Text style={{ color: t.text, padding: 16 }}>Aid station not found.</Text>;

  const openMaps = () => {
    const c = station.driveCoordinate!;
    const q = `${c.latitude},${c.longitude}`;
    Linking.openURL(Platform.OS === 'ios' ? `maps://?daddr=${q}` : `geo:${q}?q=${q}`);
  };

  const isCutoffOnly = station.kind === 'cutoff';
  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: t.bg }}>
      <Stack.Screen options={{ title: station.name }} />
      <Text style={[styles.title, { color: t.text }]}>{station.name}</Text>
      {!isCutoffOnly && <Text style={[styles.sub, { color: t.accent }]}>{CREW_LABEL[station.crewAccess]}</Text>}
      <Text style={[styles.body, { color: t.text }]}>{station.summary}</Text>

      <SectionTitle>Station info</SectionTitle>
      <Card>
        <Row label="Mile" value={`${station.mile}`} />
        <Row label="Cutoff" value={station.cutoff ?? 'None'} />
        {station.gainFt != null && <Row label="Since last station" value={`+${station.gainFt} ft`} />}
        {station.lossFt != null && <Row label="Descent since last" value={`-${station.lossFt} ft`} />}
        {!isCutoffOnly && <Row label="Drop bags" value={station.dropBags ? 'Yes' : 'No'} />}
        {!isCutoffOnly && <Row label="Pacers" value={station.pacerAccess ? 'Allowed' : 'Not allowed'} />}
        {station.driveFromWilsall && <Row label="Drive from Wilsall" value={station.driveFromWilsall} />}
        {station.locationNote && <Row label="Location" value={station.locationNote} />}
      </Card>

      {station.details.length > 0 && (
        <>
          <SectionTitle>Details</SectionTitle>
          <Card>
            {station.details.map((d) => (
              <Text key={d} style={[styles.body, { color: t.text, marginBottom: 8 }]}>
                {'•  '}
                {d}
              </Text>
            ))}
          </Card>
        </>
      )}

      {station.driveCoordinate ? (
        <Button label="Directions in Maps" onPress={openMaps} />
      ) : (
        station.crewAccess !== 'no' && (
          <Card>
            <Text style={[styles.body, { color: t.muted }]}>
              Parking coordinates for this station haven't been added yet, so in-app directions aren't available. Use the written
              directions above. Offline routing is planned.
            </Text>
          </Card>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800' },
  sub: { fontSize: 15, fontWeight: '700', marginTop: 4, marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22 },
  row: { marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  value: { fontSize: 16, marginTop: 2 },
});
