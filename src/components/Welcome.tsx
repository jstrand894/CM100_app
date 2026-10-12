import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { markRead } from '../data/notifications';
import { useOfflinePrep } from '../offline';
import { useTheme } from '../theme';
import { Button, tint } from './ui';

type Prep = ReturnType<typeof useOfflinePrep>;
const SEEN_KEY = 'cm100.welcome.seen';

const STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: 'home-outline', title: 'Home', body: 'Countdown, race-weekend schedule, weather and news from the race director.' },
  { icon: 'trail-sign-outline', title: 'Course and map', body: 'Aid stations, cutoffs, the elevation profile and your position on the trail.' },
  { icon: 'stopwatch-outline', title: 'Planner', body: 'Set a goal time for a pace plan, and log your splits live on race day.' },
  { icon: 'notifications-outline', title: 'Notifications', body: 'The bell on Home holds race announcements. A red dot means there is something new.' },
];

/** Status line and button for saving data offline. Used in the welcome sheet and the Home card. */
export function OfflineAction({ prep, compact }: { prep: Prep; compact?: boolean }) {
  const t = useTheme();
  if (prep.ready) {
    return (
      <View style={styles.row}>
        <Ionicons name="checkmark-circle" size={20} color={t.primary} />
        <Text style={[styles.status, { color: t.text }]}>Saved. News, weather and announcements will show without signal.</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {prep.failed && <Text style={[styles.status, { color: t.accent }]}>Could not reach the internet. Try again when you have service.</Text>}
      {prep.working ? (
        <View style={styles.row}>
          <ActivityIndicator color={t.primary} />
          <Text style={[styles.status, { color: t.muted }]}>Saving…</Text>
        </View>
      ) : (
        <Button label={compact ? 'Get ready for offline' : 'Get ready for offline now'} onPress={prep.run} />
      )}
    </View>
  );
}

/** Shows once, the first time the app is opened. */
export function WelcomeModal({ prep }: { prep: Prep }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then((v) => setOpen(!v))
      .catch(() => {});
  }, []);

  const close = () => {
    setOpen(false);
    AsyncStorage.setItem(SEEN_KEY, '1').catch(() => {});
    markRead(['welcome']);
  };

  return (
    <Modal visible={open} animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: t.text }]}>Welcome to the Crazy Mountain 100</Text>
          <Text style={[styles.lead, { color: t.muted }]}>Here is a quick tour, and one thing to do before you lose signal.</Text>
          {STEPS.map((s) => (
            <View key={s.title} style={styles.step}>
              <View style={[styles.icon, { backgroundColor: tint(t.primary, 0.14) }]}>
                <Ionicons name={s.icon} size={20} color={t.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: t.text }]}>{s.title}</Text>
                <Text style={[styles.stepBody, { color: t.muted }]}>{s.body}</Text>
              </View>
            </View>
          ))}
          <View style={[styles.offline, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={styles.row}>
              <Ionicons name="cloud-download-outline" size={22} color={t.accent} />
              <Text style={[styles.stepTitle, { color: t.text }]}>Download for offline</Text>
            </View>
            <Text style={[styles.stepBody, { color: t.muted }]}>
              The course, schedule, gear list and planner are built in. News, weather and announcements need to be saved once while you have service.
            </Text>
            <OfflineAction prep={prep} />
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button label="Got it" onPress={close} variant={prep.ready ? 'primary' : 'ghost'} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16 },
  title: { fontSize: 28, fontWeight: '900', lineHeight: 33 },
  lead: { fontSize: 16, lineHeight: 22 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 16, fontWeight: '800' },
  stepBody: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  offline: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
});
