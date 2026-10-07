import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, SectionTitle } from '../../src/components/ui';
import { CREW_RULES, HIGHLIGHTS, MANDATORY_GEAR, RACE, RECOMMENDED_GEAR } from '../../src/data/race';
import { useTheme } from '../../src/theme';

function Bullets({ items }: { items: string[] }) {
  const t = useTheme();
  return (
    <View>
      {items.map((s) => (
        <Text key={s} style={[styles.bullet, { color: t.text }]}>
          {'•  '}
          {s}
        </Text>
      ))}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, { color: t.muted }]}>{label}</Text>
      <Text style={[styles.factValue, { color: t.text }]}>{value}</Text>
    </View>
  );
}

export default function RaceScreen() {
  const t = useTheme();
  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: t.bg }}>
      <Text style={[styles.title, { color: t.text }]}>{RACE.name}</Text>
      <Text style={[styles.tagline, { color: t.accent }]}>{RACE.tagline}</Text>

      <Card style={{ marginTop: 16 }}>
        <Fact label="Date" value={`${RACE.dateLabel} · ${RACE.startTimeLabel}`} />
        <Fact label="Start" value={RACE.start} />
        <Fact label="Finish" value={RACE.finish} />
        <Fact label="Distance" value={RACE.distance} />
        <Fact label="Vertical" value={RACE.gain} />
        <Fact label="Cutoff" value={RACE.cutoff} />
      </Card>

      <SectionTitle>Know before you go</SectionTitle>
      {HIGHLIGHTS.map((h) => (
        <Card key={h.title}>
          <Text style={[styles.cardTitle, { color: t.text }]}>{h.title}</Text>
          <Text style={[styles.body, { color: t.text }]}>{h.body}</Text>
        </Card>
      ))}

      <SectionTitle>Mandatory gear</SectionTitle>
      <Card>
        <Bullets items={MANDATORY_GEAR} />
      </Card>
      <SectionTitle>Highly recommended</SectionTitle>
      <Card>
        <Bullets items={RECOMMENDED_GEAR} />
      </Card>

      <SectionTitle>Crew and pacer rules</SectionTitle>
      <Card>
        <Bullets items={CREW_RULES} />
      </Card>

      <Button label="Official race website" variant="ghost" onPress={() => Linking.openURL(RACE.website)} />
      <Text style={[styles.disclaimer, { color: t.muted }]}>
        Unofficial companion app. Rules and details are subject to change, so always confirm with the race website.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', marginTop: 24 },
  tagline: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  fact: { marginBottom: 12 },
  factLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  factValue: { fontSize: 16, marginTop: 2 },
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  body: { fontSize: 15, lineHeight: 22 },
  bullet: { fontSize: 15, lineHeight: 22, marginBottom: 6 },
  disclaimer: { fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },
});
