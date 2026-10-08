import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../src/alert';
import { Card, DetailHeader, ListRow, SectionTitle } from '../src/components/ui';
import { agoLabel } from '../src/data/news';
import { RACE } from '../src/data/race';
import {
  applyTheme,
  CACHE_KEYS,
  GEAR_KEYS,
  GOAL_KEYS,
  loadThemePref,
  PLANNER_KEYS,
  THEME_KEY,
  ThemePref,
} from '../src/settings';
import { useTheme } from '../src/theme';

const THEMES: { id: ThemePref; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'system', label: 'Automatic', icon: 'phone-portrait-outline' },
  { id: 'light', label: 'Light', icon: 'sunny-outline' },
  { id: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function SettingsScreen() {
  const t = useTheme();
  const [pref, setPref] = useState<ThemePref>('system');
  const [counts, setCounts] = useState({ logs: 0, gear: 0 });
  const [cacheAt, setCacheAt] = useState<{ news: number | null; weather: number | null }>({ news: null, weather: null });

  const refresh = async () => {
    try {
      const [logs, gear, news, weather] = await Promise.all(
        ['cm100.liveLogs', 'cm100.gear.v1', 'cm100.news.cache', 'cm100.weather.v1'].map((k) => AsyncStorage.getItem(k)),
      );
      const w = weather ? JSON.parse(weather) : null;
      setCounts({
        logs: logs ? Object.keys(JSON.parse(logs)).length : 0,
        gear: gear ? Object.values(JSON.parse(gear).checked ?? {}).filter(Boolean).length : 0,
      });
      setCacheAt({ news: news ? JSON.parse(news).at ?? null : null, weather: w ? Math.max(w.forecast?.at ?? 0, w.history?.at ?? 0) || null : null });
    } catch {}
  };
  useEffect(() => {
    loadThemePref().then(setPref);
    refresh();
  }, []);

  const choose = (p: ThemePref) => {
    setPref(p);
    applyTheme(p);
    AsyncStorage.setItem(THEME_KEY, p).catch(() => {});
  };

  const confirm = (title: string, body: string, keys: string[], button = 'Clear') =>
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: button,
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(keys).catch(() => {});
          refresh();
        },
      },
    ]);

  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <DetailHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        {Platform.OS !== 'web' && (
          <>
        <SectionTitle>Appearance</SectionTitle>
        <Card>
          <View style={[styles.seg, { backgroundColor: t.primarySoft }]}>
            {THEMES.map((o) => {
              const on = pref === o.id;
              return (
                <Pressable key={o.id} onPress={() => choose(o.id)} style={[styles.segBtn, on && { backgroundColor: t.card }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Ionicons name={o.icon} size={18} color={on ? t.primary : t.muted} />
                  <Text style={[styles.segText, { color: on ? t.primary : t.muted }]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: t.muted }]}>Automatic follows your phone's light or dark setting.</Text>
        </Card>
          </>
        )}

        <SectionTitle>Pace planner</SectionTitle>
        <Card style={styles.list}>
          <ListRow
            icon="timer-outline"
            title="Clear race day times"
            sub={counts.logs ? `${plural(counts.logs, 'station')} logged` : 'Nothing logged'}
            danger
            onPress={
              counts.logs
                ? () => confirm('Clear all race day times?', 'This removes every time you have logged in the planner.', PLANNER_KEYS)
                : undefined
            }
          />
          <ListRow
            icon="flag-outline"
            title="Reset goal finish time"
            sub="Back to 30 hours"
            danger
            last
            onPress={() => confirm('Reset your goal time?', 'The planner goes back to a 30 hour finish.', GOAL_KEYS, 'Reset')}
          />
        </Card>

        <SectionTitle>Checklists</SectionTitle>
        <Card style={styles.list}>
          <ListRow
            icon="checkbox-outline"
            title="Clear gear checkmarks"
            sub={counts.gear ? `${plural(counts.gear, 'item')} checked` : 'Nothing checked'}
            danger
            last
            onPress={
              counts.gear
                ? () =>
                    Alert.alert('Clear all checkmarks?', 'Your own added items stay. Only the checks are cleared.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Clear',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const raw = await AsyncStorage.getItem('cm100.gear.v1');
                            const saved = raw ? JSON.parse(raw) : {};
                            await AsyncStorage.setItem('cm100.gear.v1', JSON.stringify({ ...saved, checked: {} }));
                          } catch {}
                          refresh();
                        },
                      },
                    ])
                : undefined
            }
          />
        </Card>

        <SectionTitle>Saved for offline</SectionTitle>
        <Card style={styles.list}>
          <ListRow icon="newspaper-outline" title="Race news" sub={cacheAt.news ? `Saved ${agoLabel(cacheAt.news)}` : 'Nothing saved yet'} />
          <ListRow icon="partly-sunny-outline" title="Weather" sub={cacheAt.weather ? `Saved ${agoLabel(cacheAt.weather)}` : 'Nothing saved yet'} />
          <ListRow
            icon="cloud-download-outline"
            title="Clear saved news and weather"
            sub="They download again next time you have signal"
            danger
            last
            onPress={() => confirm('Clear saved news and weather?', 'You will need signal to see them again until they re-download.', CACHE_KEYS)}
          />
        </Card>

        <SectionTitle>About</SectionTitle>
        <Card style={styles.list}>
          <ListRow icon="information-circle-outline" title="Crazy Mountain 100" sub={`Version ${Constants.expoConfig?.version ?? '1.0.0'} · ${RACE.dateLabel}`} />
          <ListRow icon="globe-outline" title="Race website" sub="crazymountainultra.com" last onPress={() => Linking.openURL(RACE.website)} />
        </Card>
        <Text style={[styles.disclaimer, { color: t.muted }]}>
          Unofficial companion app. Details can change, so always confirm with the race. Pace estimates come from past finisher splits and are not
          predictions.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  list: { padding: 0, overflow: 'hidden' },
  seg: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segBtn: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  segText: { fontSize: 14, fontWeight: '800' },
  hint: { fontSize: 13, marginTop: 10, lineHeight: 18 },
  disclaimer: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
});
