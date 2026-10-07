import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ScreenHeader } from '../../src/components/ui';
import { RACE } from '../../src/data/race';
import { useTheme } from '../../src/theme';

export default function TrackingScreen() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title="Live tracking" subtitle="Follow your runner across the Crazies" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={[styles.icon, { backgroundColor: t.primarySoft }]}>
            <Ionicons name="radio" size={24} color={t.primary} />
          </View>
          <Text style={[styles.title, { color: t.text }]}>Runner tracking</Text>
          <Text style={[styles.body, { color: t.muted }]}>
            Runners carry race-provided GPS trackers, and positions are shown live on Trackleaders. Tracking needs cell service, so crews
            in dead zones will see stale positions.
          </Text>
        </Card>
        <Button label="Open live tracking" onPress={() => WebBrowser.openBrowserAsync(RACE.trackingUrl)} />
        <Text style={[styles.note, { color: t.muted }]}>
          Coming: runners shown directly on the in-app map, with last-known position and time saved for offline use.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  body: { fontSize: 15, lineHeight: 22 },
  note: { fontSize: 13, lineHeight: 19, marginTop: 16, textAlign: 'center' },
});
