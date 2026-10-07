import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ScreenHeader, SectionTitle } from '../../src/components/ui';
import { EXTRA_TICKETS, LOTTERY, QUALIFIER, STEPS, TIMELINE } from '../../src/data/lottery';
import { useTheme } from '../../src/theme';

const DAY = 86400000;

function status(now: number) {
  const opens = new Date(LOTTERY.opensIso).getTime();
  const closes = new Date(LOTTERY.closesIso).getTime();
  if (now < opens) {
    const d = Math.ceil((opens - now) / DAY);
    return { big: `${d}`, small: d === 1 ? 'day until applications open' : 'days until applications open', phase: 'before' as const };
  }
  if (now < closes) {
    const d = Math.ceil((closes - now) / DAY);
    return { big: 'Open now', small: `${d} ${d === 1 ? 'day' : 'days'} left to apply`, phase: 'open' as const };
  }
  return { big: 'Closed', small: 'Applications for 2027 have closed', phase: 'closed' as const };
}

export default function LotteryScreen() {
  const t = useTheme();
  const now = Date.now();
  const s = useMemo(() => status(now), [now]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title="Lottery" subtitle={`Getting into the ${LOTTERY.year} race`} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={[styles.big, { color: s.phase === 'open' ? t.green : t.accent }]}>{s.big}</Text>
          <Text style={[styles.small, { color: t.muted }]}>{s.small}</Text>
          <Text style={[styles.dates, { color: t.text }]}>
            Opens {LOTTERY.opensLabel}
            {'\n'}Closes {LOTTERY.closesLabel}
          </Text>
        </Card>
        <Button label="Apply on UltraSignup" onPress={() => Linking.openURL(LOTTERY.signupUrl)} />

        <SectionTitle>How to sign up</SectionTitle>
        <Card>
          {STEPS.map((step, i) => (
            <View key={step.title} style={[styles.step, i > 0 && { marginTop: 16 }]}>
              <View style={[styles.stepNum, { backgroundColor: t.primary }]}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: t.text }]}>{step.title}</Text>
                <Text style={[styles.body, { color: t.muted }]}>{step.body}</Text>
              </View>
            </View>
          ))}
        </Card>

        <SectionTitle>Timeline</SectionTitle>
        <Card>
          {TIMELINE.map((item, i) => {
            const past = item.iso ? new Date(item.iso).getTime() < now : false;
            return (
              <View key={item.what} style={[styles.tl, i > 0 && { borderTopWidth: 1, borderTopColor: t.border }]}>
                <Ionicons name={past ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={past ? t.green : t.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tlWhat, { color: t.text }]}>{item.what}</Text>
                  <Text style={[styles.tlWhen, { color: t.muted }]}>{item.when}</Text>
                </View>
              </View>
            );
          })}
        </Card>

        <SectionTitle>Qualifying</SectionTitle>
        <Card>
          {QUALIFIER.map((q, i) => (
            <View key={q.title} style={i > 0 && { marginTop: 14 }}>
              <Text style={[styles.stepTitle, { color: t.text }]}>{q.title}</Text>
              <Text style={[styles.body, { color: t.muted }]}>{q.body}</Text>
            </View>
          ))}
          <Pressable onPress={() => Linking.openURL(`mailto:${LOTTERY.forms}`)}>
            <Text style={[styles.link, { color: t.primary }]}>Send forms to {LOTTERY.forms}</Text>
          </Pressable>
        </Card>

        <SectionTitle>Extra tickets</SectionTitle>
        <Card>
          <Text style={[styles.body, { color: t.muted, marginBottom: 8 }]}>
            The race calls this its current thinking, so details may change.
          </Text>
          {EXTRA_TICKETS.map((line) => (
            <Text key={line} style={[styles.body, { color: t.text, marginBottom: 6 }]}>
              {'•  '}
              {line}
            </Text>
          ))}
        </Card>

        <SectionTitle>Charity bib raffle</SectionTitle>
        <Card>
          <Text style={[styles.body, { color: t.text }]}>
            One bib is raffled to benefit REACH Inc., which serves 92 adults with developmental disabilities, helping them live
            independently, hold jobs and get reliable transportation. The raffle begins {LOTTERY.raffleStartLabel}. Anyone who meets all
            the qualifying requirements can enter.
          </Text>
          <Pressable onPress={() => Linking.openURL(LOTTERY.raffleUrl)}>
            <Text style={[styles.link, { color: t.primary }]}>REACH Inc. raffle page</Text>
          </Pressable>
        </Card>

        <SectionTitle>Good to know</SectionTitle>
        <Card>
          <Text style={[styles.body, { color: t.text, marginBottom: 6 }]}>
            {'•  '}Entry fee listed on UltraSignup: {LOTTERY.fee}.
          </Text>
          <Text style={[styles.body, { color: t.text, marginBottom: 6 }]}>
            {'•  '}The field is capped at {LOTTERY.cap}.
          </Text>
          <Text style={[styles.body, { color: t.text, marginBottom: 6 }]}>{'•  '}Entries are non-transferable.</Text>
          <Text style={[styles.body, { color: t.text }]}>{'•  '}Check the race website for the refund and waitlist policies.</Text>
        </Card>

        <Button label="Lottery page on the race website" variant="ghost" onPress={() => Linking.openURL(LOTTERY.pageUrl)} />
        <Text style={[styles.disclaimer, { color: t.muted }]}>
          Unofficial summary from the race website and UltraSignup. The race may change the process, so always confirm there before
          applying.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  big: { fontSize: 44, fontWeight: '900', lineHeight: 50 },
  small: { fontSize: 13, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 2 },
  dates: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 14, lineHeight: 22 },
  step: { flexDirection: 'row', gap: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  stepTitle: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
  body: { fontSize: 14, lineHeight: 21 },
  tl: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  tlWhat: { fontSize: 15, fontWeight: '700' },
  tlWhen: { fontSize: 13, marginTop: 1 },
  link: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 14 },
});
