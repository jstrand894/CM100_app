import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
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
export function DetailHeader({ title, subtitle, children, right, compact }: { title: string; subtitle?: string; children?: ReactNode; right?: ReactNode; compact?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }, compact && { paddingBottom: 14 }]}>
      <View style={styles.backRow}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12} style={styles.back} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        {right}
      </View>
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
export function OfflineNotice({ children, style, onDismiss }: { children: string; style?: ViewStyle; onDismiss?: () => void }) {
  const t = useTheme();
  return (
    <View style={[styles.offline, { backgroundColor: t.accentSoft }, style]} accessibilityRole="alert">
      <Ionicons name="cloud-offline" size={18} color={t.accent} />
      <Text style={[styles.offlineText, { color: t.text }]}>{children}</Text>
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss">
          <Ionicons name="close" size={20} color={t.muted} />
        </Pressable>
      )}
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
  backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  back: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
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

/** Height-animated container: content is measured once, then slides open and closed. */
export function Collapsible({ open, children, style }: { open: boolean; children: ReactNode; style?: ViewStyle }) {
  const [h, setH] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  const measured = useRef(false);
  useEffect(() => {
    // The first measurement snaps into place, so content that starts open does not animate in on screen load.
    if (!measured.current && h > 0) {
      measured.current = true;
      anim.setValue(open ? h : 0);
      return;
    }
    Animated.timing(anim, { toValue: open ? h : 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [open, h, anim]);
  return (
    <Animated.View style={{ height: anim, overflow: 'hidden', alignSelf: 'stretch', opacity: anim.interpolate({ inputRange: [0, Math.max(h, 1)], outputRange: [0, 1] }) }}>
      <View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={[{ position: 'absolute', left: 0, right: 0 }, style]}>
        {children}
      </View>
    </Animated.View>
  );
}
