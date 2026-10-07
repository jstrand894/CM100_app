import * as WebBrowser from 'expo-web-browser';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card } from '../../src/components/ui';
import { RACE } from '../../src/data/race';
import { useTheme } from '../../src/theme';

export default function TrackingScreen() {
  const t = useTheme();
  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: t.bg }}>
      <Card>
        <Text style={[styles.title, { color: t.text }]}>Runner tracking</Text>
        <Text style={[styles.body, { color: t.text }]}>
          Runners carry race-provided GPS trackers, and positions are shown live on Trackleaders. Live tracking needs cell service, so
          crews in dead zones will see stale positions.
        </Text>
      </Card>
      <Button label="Open live tracking" onPress={() => WebBrowser.openBrowserAsync(RACE.trackingUrl)} />
      <Text style={[styles.note, { color: t.muted }]}>
        Planned: runners shown directly on the in-app map, with last-known position and time cached for offline use.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
  note: { fontSize: 13, lineHeight: 19, marginTop: 16, textAlign: 'center' },
});
