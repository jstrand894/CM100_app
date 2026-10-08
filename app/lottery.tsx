import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { LayoutAnimation, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, View } from 'react-native';
import { Button, Card, DetailHeader, Section } from '../src/components/ui';
import { EXTRA_TICKETS, LOTTERY, QUALIFIER, STEPS, TIMELINE } from '../src/data/lottery';
import { BRAND_BLUE, useTheme } from '../src/theme';

// Android needs layout animations switched on (a no-op on the new architecture).
if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

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
  return { big: 'Closed', small: `Applications for ${LOTTERY.year} have closed`, phase: 'closed' as const };
}

export default function LotteryScreen() {
  const t = useTheme();
  const now = Date.now();
  const s = useMemo(() => status(now), [now]);
  const [open, setOpen] = useState<string | null>('steps'); // one card open at a time keeps the page short
  const toggle = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(260, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setOpen((o) => (o === key ? null : key));
  };
  // The first timeline item that has not happened yet is the one to watch.
  const nextIdx = TIMELINE.findIndex((item) => item.iso && new Date(item.iso).getTime() >= now);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <DetailHeader title="Lottery" subtitle={`Getting into the ${LOTTERY.year} race`} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Ionicons name="ticket" size={150} color="rgba(255,255,255,0.1)" style={styles.heroMark} />
          <Text style={styles.heroBig}>{s.big}</Text>
          <Text style={styles.heroSmall}>{s.small}</Text>
          <View style={styles.heroDates}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>OPENS</Text>
              <Text style={styles.heroDate}>{LOTTERY.opensLabel}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>CLOSES</Text>
              <Text style={styles.heroDate}>{LOTTERY.closesLabel}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => Linking.openURL(LOTTERY.signupUrl)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.heroBtn, { backgroundColor: t.accent }, pressed && { opacity: 0.85 }]}
          >
            <Text style={[styles.heroBtnText, { color: t.accentText }]}>Apply on UltraSignup</Text>
            <Ionicons name="open-outline" size={18} color={t.accentText} />
          </Pressable>
        </View>

        <Card style={{ paddingTop: 18, paddingBottom: 2 }}>
          {TIMELINE.map((item, i) => {
            const past = item.iso ? new Date(item.iso).getTime() < now : false;
            const isNext = i === nextIdx;
            const last = i === TIMELINE.length - 1;
            return (
              <View key={item.what} style={styles.tlRow}>
                <View style={styles.tlRail}>
                  <View
                    style={[
                      styles.tlNode,
                      past && { backgroundColor: t.green, borderColor: t.green },
                      isNext && { backgroundColor: t.card, borderColor: t.accent, borderWidth: 4 },
                      !past && !isNext && { backgroundColor: t.card, borderColor: t.border },
                    ]}
                  >
                    {past && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                  </View>
                  {!last && <View style={[styles.tlLine, { backgroundColor: past ? t.green : t.border }]} />}
                </View>
                <View style={styles.tlBody}>
                  <Text style={[styles.tlWhen, { color: isNext ? t.accent : t.muted }]}>{item.when.toUpperCase()}</Text>
                  <Text style={[styles.tlWhat, { color: past ? t.muted : t.text }]}>{item.what}</Text>
                </View>
              </View>
            );
          })}
        </Card>

        <Section icon="list" title="How to sign up" sub={`${STEPS.length} steps`} open={open === 'steps'} onToggle={() => toggle('steps')}>
          <View style={{ paddingVertical: 14, gap: 16 }}>
            {STEPS.map((step, i) => (
              <View key={step.title} style={styles.step}>
                <View style={[styles.stepNum, { backgroundColor: t.primary }]}>
                  <Text style={[styles.stepNumText, { color: t.bg }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: t.text }]}>{step.title}</Text>
                  <Text style={[styles.body, { color: t.muted }]}>{step.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section icon="ribbon" title="Qualifying" sub="Races, times and trail work" open={open === 'qualify'} onToggle={() => toggle('qualify')}>
          <View style={{ paddingVertical: 14, gap: 14 }}>
            {QUALIFIER.map((q) => (
              <View key={q.title}>
                <Text style={[styles.stepTitle, { color: t.text }]}>{q.title}</Text>
                <Text style={[styles.body, { color: t.muted }]}>{q.body}</Text>
              </View>
            ))}
            <Pressable onPress={() => Linking.openURL(`mailto:${LOTTERY.forms}`)}>
              <Text style={[styles.link, { color: t.primary }]}>Send forms to {LOTTERY.forms}</Text>
            </Pressable>
          </View>
        </Section>

        <Section icon="ticket" title="Extra tickets" sub="Volunteers and veterans" open={open === 'extra'} onToggle={() => toggle('extra')}>
          <View style={{ paddingVertical: 14, gap: 8 }}>
            <Text style={[styles.body, { color: t.muted }]}>The race calls this its current thinking, so details may change.</Text>
            {EXTRA_TICKETS.map((line) => (
              <Text key={line} style={[styles.body, { color: t.text }]}>
                {'•  '}
                {line}
              </Text>
            ))}
          </View>
        </Section>

        <Section icon="heart" title="Charity bib raffle" sub={`Begins ${LOTTERY.raffleStartLabel}`} open={open === 'raffle'} onToggle={() => toggle('raffle')}>
          <View style={{ paddingVertical: 14 }}>
            <Text style={[styles.body, { color: t.text }]}>
              One bib is raffled to benefit REACH Inc., which serves 92 adults with developmental disabilities, helping them live
              independently, hold jobs and get reliable transportation. The raffle begins {LOTTERY.raffleStartLabel}. Anyone who meets all
              the qualifying requirements can enter.
            </Text>
            <Pressable onPress={() => Linking.openURL(LOTTERY.raffleUrl)}>
              <Text style={[styles.link, { color: t.primary }]}>REACH Inc. raffle page</Text>
            </Pressable>
          </View>
        </Section>

        <Section icon="information-circle" title="Good to know" sub={`${LOTTERY.fee.split(' (')[0]} entry · ${LOTTERY.cap}`} open={open === 'know'} onToggle={() => toggle('know')}>
          <View style={{ paddingVertical: 14, gap: 6 }}>
            <Text style={[styles.body, { color: t.text }]}>{'•  '}Entry fee listed on UltraSignup: {LOTTERY.fee}.</Text>
            <Text style={[styles.body, { color: t.text }]}>{'•  '}The field is capped at {LOTTERY.cap}.</Text>
            <Text style={[styles.body, { color: t.text }]}>{'•  '}Entries are non-transferable.</Text>
            <Text style={[styles.body, { color: t.text }]}>{'•  '}Check the race website for the refund and waitlist policies.</Text>
          </View>
        </Section>

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
  hero: { backgroundColor: BRAND_BLUE, borderRadius: 18, padding: 18, marginBottom: 12, overflow: 'hidden' },
  heroMark: { position: 'absolute', right: -24, top: -24 },
  heroBig: { color: '#ffffff', fontSize: 52, fontWeight: '900', lineHeight: 58 },
  heroSmall: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 2 },
  heroDates: { flexDirection: 'row', gap: 12, marginTop: 18 },
  heroLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  heroDate: { color: '#ffffff', fontSize: 14, fontWeight: '700', marginTop: 2, lineHeight: 19 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, paddingVertical: 14, borderRadius: 14 },
  heroBtnText: { fontSize: 16, fontWeight: '800' },
  step: { flexDirection: 'row', gap: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontWeight: '900', fontSize: 14 },
  stepTitle: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
  body: { fontSize: 14, lineHeight: 21 },
  tlRow: { flexDirection: 'row', gap: 14 },
  tlRail: { width: 22, alignItems: 'center' },
  tlNode: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tlLine: { width: 3, flex: 1, borderRadius: 2, marginVertical: 2 },
  tlBody: { flex: 1, paddingBottom: 18 },
  tlWhen: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  tlWhat: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  link: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 14 },
});
