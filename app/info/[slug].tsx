import { useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowBody: { fontSize: 14, lineHeight: 20, marginTop: 3 },
});
