import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DetailHeader, tint } from '../src/components/ui';
import { agoLabel, formatPostDate, useNews } from '../src/data/news';
import { useTheme } from '../src/theme';

export default function NewsScreen() {
  const t = useTheme();
  const { posts, updatedAt, refreshing, failed, refresh, markSeen, isSample, ready } = useNews();

  useEffect(() => {
    if (ready && posts.length) markSeen();
  }, [ready, posts.length, markSeen]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <DetailHeader title="Race news" subtitle={`Updated ${agoLabel(updatedAt)}${failed ? ' · offline, showing saved news' : ''}`} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.primary} />}
      >
        {isSample && (
          <View style={[styles.banner, { backgroundColor: t.accentSoft }]}>
            <Text style={[styles.bannerText, { color: t.accent }]}>
              Sample posts. Set NEWS_CSV_URL in src/data/news.ts to show the race director's sheet.
            </Text>
          </View>
        )}
        {ready && posts.length === 0 && (
          <View style={[styles.empty, { backgroundColor: t.card, borderColor: t.border }]}>
            <Ionicons name="newspaper-outline" size={28} color={t.muted} />
            <Text style={[styles.emptyTitle, { color: t.text }]}>No news yet</Text>
            <Text style={[styles.emptyBody, { color: t.muted }]}>Pull down to refresh. News from the race director shows up here.</Text>
          </View>
        )}
        {posts.map((p) => (
          <View key={p.id} style={[styles.card, { backgroundColor: t.card, borderColor: p.urgent ? t.accent : t.border, borderWidth: p.urgent ? 2 : 1 }]}>
            <View style={styles.meta}>
              {p.urgent && (
                <View style={[styles.urgent, { backgroundColor: tint(t.accent, 0.16) }]}>
                  <Ionicons name="alert-circle" size={13} color={t.accent} />
                  <Text style={[styles.urgentText, { color: t.accent }]}>Important</Text>
                </View>
              )}
              <Text style={[styles.date, { color: t.muted }]}>{formatPostDate(p.date)}</Text>
            </View>
            <Text style={[styles.title, { color: t.text }]}>{p.title}</Text>
            {p.body !== '' && <Text style={[styles.body, { color: t.text }]}>{p.body}</Text>}
            {p.link !== '' && (
              <Pressable onPress={() => Linking.openURL(p.link)} style={styles.link}>
                <Text style={[styles.linkText, { color: t.primary }]}>Read more</Text>
                <Ionicons name="open-outline" size={15} color={t.primary} />
              </Pressable>
            )}
          </View>
        ))}
        <Text style={[styles.foot, { color: t.muted }]}>
          News is saved on your phone, so you can still read it without signal. Pull down to refresh when you have service.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  banner: { borderRadius: 12, padding: 12 },
  bannerText: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  empty: { alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 28, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  card: { borderRadius: 18, padding: 16 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  urgent: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  urgentText: { fontSize: 12, fontWeight: '800' },
  date: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 22, marginTop: 6 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  linkText: { fontSize: 15, fontWeight: '800' },
  foot: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
});
