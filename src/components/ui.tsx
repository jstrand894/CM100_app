import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

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
        primary ? { backgroundColor: t.accent } : { borderColor: t.border, borderWidth: 1, backgroundColor: t.card },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.buttonText, { color: primary ? t.accentText : t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 12, marginBottom: 8, marginLeft: 4 },
  button: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
