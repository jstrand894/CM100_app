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

export function ListRow({
  icon,
  title,
  sub,
  onPress,
  danger,
  last,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub?: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
  badge?: string;
}) {
  const t = useTheme();
  const color = danger ? t.red : t.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, !last && { borderBottomWidth: 1, borderBottomColor: t.border }, pressed && { opacity: 0.6 }]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? t.red + '1f' : t.primarySoft }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: danger ? t.red : t.text }]}>{title}</Text>
        {sub ? <Text style={[styles.rowSub, { color: t.muted }]}>{sub}</Text> : null}
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: t.accent }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {onPress && !danger && <Ionicons name="chevron-forward" size={18} color={t.muted} />}
    </Pressable>
  );
}

// Small notice shown while the phone has no connection. Saved data keeps working, so say what still does.
export function OfflineNotice({ children, style }: { children: string; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View style={[styles.offline, { backgroundColor: t.accentSoft }, style]} accessibilityRole="alert">
      <Ionicons name="cloud-offline" size={18} color={t.accent} />
      <Text style={[styles.offlineText, { color: t.text }]}>{children}</Text>
    </View>
  );
}

/** Collapsible card: icon, title, one-line status and a chevron. Children show when `open`. */
export function Section({ icon, title, sub, open, onToggle, progress, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; open: boolean; onToggle: () => void; progress?: number; children: ReactNode }) {
  const t = useTheme();
  const done = progress === 1;
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={sub ? `${title}. ${sub}` : title}
        style={({ pressed }) => [styles.secHead, pressed && { opacity: 0.7 }]}
      >
        <View style={styles.secTop}>
          <View style={[styles.secIcon, { backgroundColor: done ? tint(t.green, 0.16) : t.primarySoft }]}>
            <Ionicons name={done ? 'checkmark' : icon} size={22} color={done ? t.green : t.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.secTitle, { color: t.text }]}>{title}</Text>
            {sub ? <Text style={[styles.secSub, { color: done ? t.green : t.muted }]}>{sub}</Text> : null}
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={t.muted} />
        </View>
        {progress != null && (
          <View style={[styles.secBar, { backgroundColor: t.primarySoft }]}>
            <View style={[styles.secBarFill, { width: `${progress * 100}%`, backgroundColor: done ? t.green : t.primary }]} />
          </View>
        )}
      </Pressable>
      {open && <View style={{ borderTopWidth: 1, borderTopColor: t.border, paddingHorizontal: 16 }}>{children}</View>}
    </Card>
  );
}

// Soft tinted background for a status color, e.g. a chip behind green text.
export const tint = (hex: string, alpha = 0.14) =>
  hex + Math.round(alpha * 255).toString(16).padStart(2, '0');

const styles = StyleSheet.create({
  secHead: { padding: 16 },
  secTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  secIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secTitle: { fontSize: 17, fontWeight: '800' },
  secSub: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  secBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 14 },
  secBarFill: { height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 60, paddingVertical: 10 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowSub: { fontSize: 13, marginTop: 1 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  header: { backgroundColor: BRAND_BLUE, paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { flexDirection: 'row', alignItems: 'center', marginLeft: -6, marginBottom: 6, alignSelf: 'flex-start' },
  backText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  headerSub: { color: '#bcd6e6', fontSize: 14, fontWeight: '600', marginTop: 4 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  offlineText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 12, marginBottom: 8, marginLeft: 4 },
  button: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
