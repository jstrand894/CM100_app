import { useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../../src/alert';
import { Card, DetailHeader, SectionTitle } from '../../src/components/ui';
import { INFO_PAGES, MENU } from '../../src/data/info';
import { useTheme } from '../../src/theme';

export default function InfoScreen() {
  const t = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = INFO_PAGES[slug];
  const meta = MENU.find((m) => m.slug === slug);
  if (!page)
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <DetailHeader title="Not found" />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <DetailHeader title={page.title} subtitle={page.intro ?? meta?.sub} />
      <ScrollView contentContainerStyle={styles.content}>
        {page.sections.map((section) => (
          <View key={section.title}>
            {section.urgent ? (
              section.rows.map((row) => (
                <Pressable
                  key={row.title}
                  onPress={() =>
                    Alert.alert('Call 911?', 'This will place an emergency call right away.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Call 911', style: 'destructive', onPress: () => row.href && Linking.openURL(row.href) },
                    ])
                  }
                  accessibilityRole="button"
                  accessibilityLabel={row.title}
                  style={({ pressed }) => [styles.urgent, { backgroundColor: '#b91c1c' }, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name="call" size={30} color="#ffffff" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.urgentTitle}>{row.title}</Text>
                    {row.body && <Text style={styles.urgentBody}>{row.body}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#ffffff" />
                </Pressable>
              ))
            ) : (
              <>
            <SectionTitle>{section.title}</SectionTitle>
            <Card style={{ paddingVertical: 4 }}>
              {section.rows.map((row, i) => {
                const inner = (
                  <View style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: t.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: row.href ? t.primary : t.text }]}>{row.title}</Text>
                      {row.body && <Text style={[styles.rowBody, { color: t.muted }]}>{row.body}</Text>}
                    </View>
                    {row.href && <Ionicons name="open-outline" size={18} color={t.primary} />}
                  </View>
                );
                return row.href ? (
                  <Pressable key={row.title} onPress={() => Linking.openURL(row.href!)} style={({ pressed }) => pressed && { opacity: 0.6 }}>
                    {inner}
                  </Pressable>
                ) : (
                  <View key={row.title}>{inner}</View>
                );
              })}
            </Card>
              </>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  urgent: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 18, marginBottom: 12 },
  urgentTitle: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  urgentBody: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowBody: { fontSize: 14, lineHeight: 20, marginTop: 3 },
});
