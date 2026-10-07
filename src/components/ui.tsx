import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_BLUE, useTheme } from '../theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={[styles.sectionTitle, { color: t.muted }]}>{children.toUpperCase()}</Text>;
}

export function Button({ label, onPress, variant = 'primary' }: { label: string; onPress: () => void; variant?: 'primary' | 'ghost' }) {
  const t = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? { backgroundColor: t.primary } : { borderColor: t.border, borderWidth: 1, backgroundColor: t.card },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.buttonText, { color: primary ? '#ffffff' : t.text }]}>{label}</Text>
    </Pressable>
  );
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
    </View>
  );
}

// Blue header for pushed (non-tab) screens, with a back button and optional right-hand content.
export function DetailHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12} style={styles.back} accessibilityLabel="Go back">
        <Ionicons name="chevron-back" size={22} color="#ffffff" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

// Soft tinted background for a status color, e.g. a chip behind green text.
export const tint = (hex: string, alpha = 0.14) =>
  hex + Math.round(alpha * 255).toString(16).padStart(2, '0');

const styles = StyleSheet.create({
  header: { backgroundColor: BRAND_BLUE, paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { flexDirection: 'row', alignItems: 'center', marginLeft: -6, marginBottom: 6, alignSelf: 'flex-start' },
  backText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  headerSub: { color: '#bcd6e6', fontSize: 14, fontWeight: '600', marginTop: 4 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 12, marginBottom: 8, marginLeft: 4 },
  button: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
