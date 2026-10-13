import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StationRoute } from '../data/stationRoute';
import { useTheme } from '../theme';

/** Card with a small map and an expand button that opens the same map full screen. `render` draws the map for a given mode. */
export function StationMapFrame({ route, render }: { route: StationRoute; render: (expanded: boolean) => ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { prev, station, next } = route;

  const legend = (
    <View style={styles.legend}>
      {prev && (
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: t.primary }]} />
          <Text style={[styles.legendText, { color: t.muted }]} numberOfLines={1}>{`From ${prev.name.replace(/^Start: /, '')}`}</Text>
        </View>
      )}
      {next && (
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: t.accent }]} />
          <Text style={[styles.legendText, { color: t.muted }]} numberOfLines={1}>{`To ${next.name.replace(/^Finish: /, '')}`}</Text>
        </View>
      )}
    </View>
  );

  return (
    <>
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: t.text }]}>Route around {station.name.replace(/^(Start|Finish): /, '')}</Text>
        </View>
        <View style={styles.mapBox}>
          {render(false)}
          <Pressable onPress={() => setOpen(true)} style={styles.expand} hitSlop={8} accessibilityRole="button" accessibilityLabel="Expand map to full screen">
            <Ionicons name="expand" size={18} color="#ffffff" />
          </Pressable>
        </View>
        {legend}
      </View>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: t.bg }}>
          <View style={{ flex: 1 }}>{render(true)}</View>
          <View style={[styles.fullBar, { paddingTop: insets.top + 8, backgroundColor: 'rgba(11,74,107,0.92)' }]}>
            <Text style={styles.fullTitle} numberOfLines={1}>{station.name}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close full screen map">
              <Ionicons name="contract" size={22} color="#ffffff" />
            </Pressable>
          </View>
          <View style={[styles.fullLegend, { paddingBottom: insets.bottom + 10, backgroundColor: t.card }]}>{legend}</View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  head: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 16, fontWeight: '800' },
  mapBox: { height: 230, backgroundColor: '#e9eef2' },
  expand: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11,74,107,0.9)' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 14, paddingVertical: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  swatch: { width: 18, height: 5, borderRadius: 3 },
  legendText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  fullBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  fullTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800', flex: 1 },
  fullLegend: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
