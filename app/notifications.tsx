import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DetailHeader, tint } from '../src/components/ui';
import { agoLabel, formatPostDate } from '../src/data/news';
import { NEWS_PREFIX, useNotifications } from '../src/data/notifications';
import { useOfflinePrep } from '../src/offline';
import { useTheme } from '../src/theme';
import { useUnits } from '../src/units';

export default function NotificationsScreen() {
  const t = useTheme();
  const u = useUnits();
  const { items, unread, isRead, markRead, refresh, refreshing, updatedAt, failed } = useNotifications();
  const offline = useOfflinePrep();

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <DetailHeader
        title="Notifications"
        subtitle={`${unread > 0 ? `${unread} unread · ` : ''}updated ${agoLabel(updatedAt)}${failed ? ' · offline, showing saved' : ''}`}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.primary} />}
      >
        <View style={[styles.prep, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.prepTitle, { color: t.text }]}>Get ready for offline</Text>
          <Text style={[styles.prepBody, { color: t.muted }]}>
            Saves the latest news, weather and announcements to your phone. Do this while you still have service.
          </Text>
          <Pressable
            onPress={offline.run}
            disabled={offline.working}
            style={({ pressed }) => [styles.prepBtn, { backgroundColor: t.primary }, (pressed || offline.working) && { opacity: 0.7 }]}
          >
            <Ionicons name={offline.ready ? 'checkmark-circle' : 'cloud-download'} size={18} color="#ffffff" />
            <Text style={styles.prepBtnText}>
              {offline.working ? 'Saving…' : offline.ready ? 'Saved. Tap to update' : 'Save for offline'}
            </Text>
          </Pressable>
          {offline.failed && <Text style={[styles.prepBody, { color: t.accent }]}>Could not save everything. Check your signal and try again.</Text>}
        </View>

        {items.map((n) => {
          const isUnread = !isRead(n.id);
          return (
            <Pressable
              key={n.id}
              onPress={() => markRead([n.id])}
              accessibilityLabel={`${isUnread ? 'Unread. ' : ''}${n.title}`}
              style={[styles.card, { backgroundColor: t.card, borderColor: n.urgent ? t.accent : t.border, borderWidth: n.urgent ? 2 : 1 }]}
            >
              <View style={styles.meta}>
                {isUnread && <View style={[styles.dot, { backgroundColor: t.accent }]} />}
                {n.id.startsWith(NEWS_PREFIX) && (
                  <View style={[styles.urgent, { backgroundColor: tint(t.primary, 0.14) }]}>
                    <Text style={[styles.urgentText, { color: t.primary }]}>Race news</Text>
                  </View>
                )}
                {n.urgent && (
                  <View style={[styles.urgent, { backgroundColor: tint(t.accent, 0.16) }]}>
                    <Ionicons name="alert-circle" size={13} color={t.accent} />
                    <Text style={[styles.urgentText, { color: t.accent }]}>Important</Text>
                  </View>
                )}
                {n.id !== 'welcome' && n.date !== '' && <Text style={[styles.date, { color: t.muted }]}>{formatPostDate(n.date)}</Text>}
              </View>
              <Text style={[styles.title, { color: t.text }]}>{u.text(n.title)}</Text>
              {n.body !== '' && <Text style={[styles.body, { color: t.text }]}>{u.text(n.body)}</Text>}
              {n.link !== '' && (
                <Pressable onPress={() => Linking.openURL(n.link)} style={styles.link}>
                  <Text style={[styles.linkText, { color: t.primary }]}>Read more</Text>
                  <Ionicons name="open-outline" size={15} color={t.primary} />
                </Pressable>
              )}
            </Pressable>
          );
        })}
        <Text style={[styles.foot, { color: t.muted }]}>Tap a notification to mark it read. Pull down to check for new ones.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  prep: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 8 },
  prepTitle: { fontSize: 17, fontWeight: '800' },
  prepBody: { fontSize: 14, lineHeight: 20 },
  prepBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12, marginTop: 4 },
  prepBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  card: { borderRadius: 18, padding: 16 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  urgent: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  urgentText: { fontSize: 12, fontWeight: '800' },
  date: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 22, marginTop: 6 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  linkText: { fontSize: 15, fontWeight: '800' },
  foot: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
});
