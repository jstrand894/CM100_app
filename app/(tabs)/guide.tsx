import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, ListRow, SectionTitle } from '../../src/components/ui';
import { useNews } from '../../src/data/news';
import { RACE } from '../../src/data/race';
import { BRAND_BLUE, useTheme } from '../../src/theme';

// Everything that is reference material rather than a live tool lives here, so Home can stay light.
export default function InfoScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { unread } = useNews();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Info</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>Race weekend</SectionTitle>
        <Card style={styles.list}>
          <ListRow icon="calendar-outline" title="Schedule and shuttle" sub="Check-in, briefings, start and finish times" onPress={() => router.push('/info/schedule')} />
          <ListRow icon="megaphone-outline" title="Race news" sub="Updates from the race director" badge={unread > 0 ? `${unread} new` : undefined} onPress={() => router.push('/news')} />
          <ListRow icon="partly-sunny-outline" title="Weather" sub="Forecast or typical conditions" last onPress={() => router.push('/weather')} />
        </Card>

        <SectionTitle>Runners and crew</SectionTitle>
        <Card style={styles.list}>
          <ListRow icon="bag-handle-outline" title="Gear and drop bags" sub="Checklists you can tick off" onPress={() => router.push('/gear')} />
          <ListRow icon="people-outline" title="Crew and pacer rules" sub="What support teams need to know" onPress={() => router.push('/info/crew')} />
          <ListRow icon="analytics-outline" title="Elevation profile" sub="Climbs and descents, mile by mile" last onPress={() => router.push('/elevation')} />
        </Card>

        <SectionTitle>Safety and local</SectionTitle>
        <Card style={styles.list}>
          <ListRow icon="medkit-outline" title="Emergency contacts" sub="Hospitals and urgent care" onPress={() => router.push('/info/emergency')} />
          <ListRow icon="restaurant-outline" title="Food and lodging" sub="Wilsall, Big Timber, Clyde Park" last onPress={() => router.push('/info/local')} />
        </Card>

        <SectionTitle>Getting in</SectionTitle>
        <Card style={styles.list}>
          <ListRow icon="ticket-outline" title="Lottery" sub="Dates and how to apply" last onPress={() => router.push('/lottery')} />
        </Card>

        <SectionTitle>App</SectionTitle>
        <Card style={styles.list}>
          <ListRow icon="settings-outline" title="Settings" sub="Appearance, reset data" last onPress={() => router.push('/settings')} />
        </Card>
        <Text style={[styles.foot, { color: t.muted }]}>{`${RACE.dateLabel} · unofficial companion app`}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: BRAND_BLUE, paddingHorizontal: 16, paddingBottom: 14, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 40 },
  list: { padding: 0, overflow: 'hidden' },
  foot: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
