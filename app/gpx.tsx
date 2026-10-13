import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../src/alert';
import { Card, DetailHeader } from '../src/components/ui';
import { agoLabel } from '../src/data/news';
import { COURSE_PAGE_URL, useGpxInfo } from '../src/data/gpx';
import { useTheme } from '../src/theme';

const dateLabel = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

export default function GpxScreen() {
  const t = useTheme();
  const { info, loading, failed, refresh } = useGpxInfo();
  const bundled = useMemo(() => Asset.fromModule(require('../assets/data/CM100.gpx')), []);
  const [busy, setBusy] = useState(false);

  const live = !!info?.usable;

  const shareFile = async (uri: string) => {
    if (Platform.OS === 'web') return Linking.openURL(uri);
    await Sharing.shareAsync(uri, { mimeType: 'application/gpx+xml', UTI: 'com.topografix.gpx' });
  };

  const download = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (live && info) {
        if (Platform.OS === 'web') return void (await Linking.openURL(info.url));
        const dir = new Directory(Paths.cache, 'gpx');
        if (!dir.exists) dir.create();
        const name = decodeURIComponent(info.url.split('/').pop() ?? 'CM100.gpx');
        const existing = new File(dir, name);
        if (existing.exists) existing.delete();
        const out = await File.downloadFileAsync(info.url, dir);
        await shareFile(out.uri);
      } else {
        await bundled.downloadAsync();
        await shareFile(bundled.localUri ?? bundled.uri);
      }
    } catch (e) {
      Alert.alert('Could not download the GPX', String(e));
    } finally {
      setBusy(false);
    }
  };

  const sub = loading && !info ? 'Checking the race website…' : info?.updatedAt ? `Updated ${dateLabel(info.updatedAt)}` : 'Course file';

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <DetailHeader title="Course GPX" subtitle={sub} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.row}>
            <Ionicons name="map-outline" size={26} color={t.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: t.text }]}>Crazy Mountain 100 course</Text>
              <Text style={[styles.sub, { color: t.muted }]}>
                {live
                  ? info?.updatedAt
                    ? `Last updated on the race website ${dateLabel(info.updatedAt)}.`
                    : 'Current file from the race website.'
                  : info?.updatedAt
                    ? `Copy saved in this app. The race website's file shows ${dateLabel(info.updatedAt)}.`
                    : 'Copy saved in this app.'}
              </Text>
            </View>
          </View>
          <Pressable onPress={download} disabled={busy} style={({ pressed }) => [styles.btn, { backgroundColor: t.primary }, (pressed || busy) && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Download the course GPX">
            {busy ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="download-outline" size={20} color="#ffffff" />}
            <Text style={styles.btnText}>{busy ? 'Downloading…' : 'Download GPX'}</Text>
          </Pressable>
          <Text style={[styles.hint, { color: t.muted }]}>
            {Platform.OS === 'web' ? 'Opens the file so your browser can save it.' : 'Opens the share sheet, so you can save it to Files or open it in your maps or watch app.'}
          </Text>
        </Card>

        {!live && info && (
          <View style={[styles.note, { backgroundColor: t.accentSoft }]}>
            <Text style={[styles.noteText, { color: t.text }]}>
              The file on the race website looks empty or broken right now, so this downloads the copy saved in the app. Check the website for the newest version.
            </Text>
          </View>
        )}
        {failed && (
          <View style={[styles.note, { backgroundColor: t.accentSoft }]}>
            <Text style={[styles.noteText, { color: t.text }]}>
              {info ? `Couldn't reach the website just now. Showing what was found ${agoLabel(info.checkedAt)}.` : "Couldn't reach the race website, so this downloads the copy saved in the app."}
            </Text>
          </View>
        )}

        <Pressable onPress={refresh} disabled={loading} style={styles.link} accessibilityRole="button">
          <Ionicons name="refresh" size={16} color={t.primary} />
          <Text style={[styles.linkText, { color: t.primary }]}>{loading ? 'Checking…' : 'Check the website again'}</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(COURSE_PAGE_URL)} style={styles.link} accessibilityRole="button">
          <Ionicons name="open-outline" size={16} color={t.primary} />
          <Text style={[styles.linkText, { color: t.primary }]}>Open the course page</Text>
        </Pressable>
        <Text style={[styles.foot, { color: t.muted }]}>
          The race says the GPX is an overlay adjusted with real-time data. Save it to your phone as a backup map: much of the course has no cell service.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, minHeight: 52, marginTop: 16 },
  btnText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  hint: { fontSize: 13, lineHeight: 18, marginTop: 10, textAlign: 'center' },
  note: { borderRadius: 12, padding: 12 },
  noteText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  linkText: { fontSize: 15, fontWeight: '800' },
  foot: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
});
