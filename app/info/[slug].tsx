import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionTitle } from '../../src/components/ui';
import { INFO_PAGES } from '../../src/data/info';
import { useTheme } from '../../src/theme';

export default function InfoScreen() {
  const t = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = INFO_PAGES[slug];
  if (!page) return <Text style={{ color: t.text, padding: 16 }}>Page not found.</Text>;

  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: t.bg }}>
      <Stack.Screen options={{ title: page.title }} />
      {page.intro && <Text style={[styles.intro, { color: t.muted }]}>{page.intro}</Text>}
      {page.sections.map((section) => (
        <View key={section.title}>
          <SectionTitle>{section.title}</SectionTitle>
          <Card style={{ paddingVertical: 6 }}>
            {section.rows.map((row, i) => {
              const inner = (
                <View style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: t.border }]}>
                  <Text style={[styles.rowTitle, { color: row.href ? t.primary : t.text }]}>{row.title}</Text>
                  {row.body && <Text style={[styles.rowBody, { color: t.muted }]}>{row.body}</Text>}
                </View>
              );
              return row.href ? (
                <Pressable key={row.title} onPress={() => Linking.openURL(row.href!)}>
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
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 4, marginHorizontal: 4 },
  row: { paddingVertical: 12 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowBody: { fontSize: 14, lineHeight: 20, marginTop: 3 },
});
