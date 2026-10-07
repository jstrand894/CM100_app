import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, DetailHeader, SectionTitle, tint } from '../../src/components/ui';
import { AID_STATIONS, AidStation, CREW_LABEL } from '../../src/data/aidStations';
import { CREW_DRIVE, CUTOFF_HOURS, clockLabel } from '../../src/data/pace';
import { stationColor } from '../../src/stationStyle';
import { useTheme } from '../../src/theme';

const fmt = (n: number) => n.toLocaleString();

function Fact({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={styles.fact}>
      <View style={[styles.factIcon, { backgroundColor: t.primarySoft }]}>
        <Ionicons name={icon} size={18} color={t.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.factLabel, { color: t.muted }]}>{label}</Text>
        <Text style={[styles.factValue, { color: t.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function Pill({ label, color, icon }: { label: string; color: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
      {icon && <Ionicons name={icon} size={13} color={color} />}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export default function AidStationDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idx = AID_STATIONS.findIndex((s) => s.id === id);
  const station: AidStation | undefined = AID_STATIONS[idx];
  if (!station)
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <DetailHeader title="Not found" />
      </View>
    );

  const prev = idx > 0 ? AID_STATIONS[idx - 1] : null;
  const next = idx < AID_STATIONS.length - 1 ? AID_STATIONS[idx + 1] : null;
  const isCutoffOnly = station.kind === 'cutoff';
  const color = stationColor(station, t);
  const cutoffHours = CUTOFF_HOURS[station.id];
  const drive = CREW_DRIVE.find((d) => d.id === station.id);
  const legMiles = prev ? Math.round((station.mile - prev.mile) * 10) / 10 : 0;

  const openMaps = () => {
    const c = station.driveCoordinate!;
    const q = `${c.latitude},${c.longitude}`;
    Linking.openURL(Platform.OS === 'ios' ? `maps://?daddr=${q}` : `geo:${q}?q=${q}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <DetailHeader title={station.name} subtitle={`Mile ${station.mile}${cutoffHours != null ? ` · Cutoff ${clockLabel(cutoffHours)}` : ''}`}>
        <View style={styles.pills}>
          {station.kind === 'start' && <Pill label="Start 6:00 AM" color="#ffffff" icon="time-outline" />}
          {isCutoffOnly ? (
            <Pill label="Cutoff checkpoint only" color="#ffd166" />
          ) : (
            <Pill
              label={CREW_LABEL[station.crewAccess]}
              color={station.crewAccess === 'no' ? '#ff9b9b' : station.crewAccess === 'hike-in' ? '#ffd166' : '#8de3b0'}
              icon={station.crewAccess === 'no' ? 'close-circle' : station.crewAccess === 'hike-in' ? 'footsteps' : 'checkmark-circle'}
            />
          )}
          {station.pacerAccess && <Pill label="Pacers" color="#ffffff" icon="walk" />}
          {station.dropBags && <Pill label="Drop bags" color="#ffb26b" icon="bag-handle" />}
        </View>
      </DetailHeader>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.summary, { color: t.text }]}>{station.summary}</Text>

        {station.driveCoordinate ? (
          <Pressable onPress={openMaps} style={({ pressed }) => [styles.cta, { backgroundColor: t.primary }, pressed && { opacity: 0.85 }]}>
            <Ionicons name="navigate" size={20} color="#ffffff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Directions in Maps</Text>
              <Text style={styles.ctaSub}>Needs signal. Download the area in Maps ahead of time.</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#ffffff" />
          </Pressable>
        ) : (
          station.crewAccess !== 'no' && (
            <Card>
              <Text style={[styles.note, { color: t.muted }]}>
                Parking coordinates for this station haven't been added yet. Use the written directions below. Offline routing is planned.
              </Text>
            </Card>
          )
        )}

        <SectionTitle>At a glance</SectionTitle>
        <Card style={{ gap: 14 }}>
          <Fact icon="flag" label="Mile" value={`${station.mile}`} />
          {station.kind === 'start' ? (
            <Fact icon="time" label="Start time" value="Friday, 6:00 AM" />
          ) : (
            <Fact icon="time" label="Cutoff" value={cutoffHours != null ? clockLabel(cutoffHours) : 'No cutoff here'} />
          )}
          {!isCutoffOnly && <Fact icon="bag-handle" label="Drop bags" value={station.dropBags ? 'Yes' : 'No'} />}
          {!isCutoffOnly && <Fact icon="walk" label="Pacers" value={station.pacerAccess ? 'Allowed' : 'Not allowed'} />}
          {station.driveFromWilsall && <Fact icon="car" label="Drive from Wilsall" value={station.driveFromWilsall} />}
          {drive && drive.fromId !== 'start' && (
            <Fact
              icon="car-sport"
              label={`Drive from ${AID_STATIONS.find((a) => a.id === drive.fromId)?.name}`}
              value={`${drive.approx ? '~' : ''}${Math.floor(drive.minutes / 60)}h ${String(drive.minutes % 60).padStart(2, '0')}m`}
            />
          )}
          {station.locationNote && <Fact icon="location" label="Location" value={station.locationNote} />}
        </Card>

        {prev && station.gainFt != null && (
          <>
            <SectionTitle>{`From ${prev.name.replace(/^Start: /, '')}`}</SectionTitle>
            <View style={styles.legRow}>
              <View style={[styles.legStat, { backgroundColor: t.card, borderColor: t.border }]}>
                <Text style={[styles.legValue, { color: t.text }]}>{legMiles} mi</Text>
                <Text style={[styles.legLabel, { color: t.muted }]}>Distance</Text>
              </View>
              <View style={[styles.legStat, { backgroundColor: t.card, borderColor: t.border }]}>
                <Text style={[styles.legValue, { color: t.text }]}>+{fmt(station.gainFt)}</Text>
                <Text style={[styles.legLabel, { color: t.muted }]}>Climb (ft)</Text>
              </View>
              <View style={[styles.legStat, { backgroundColor: t.card, borderColor: t.border }]}>
                <Text style={[styles.legValue, { color: t.text }]}>−{fmt(station.lossFt ?? 0)}</Text>
                <Text style={[styles.legLabel, { color: t.muted }]}>Descent (ft)</Text>
              </View>
            </View>
          </>
        )}

        {station.details.length > 0 && (
          <>
            <SectionTitle>Crew notes</SectionTitle>
            <Card style={{ paddingVertical: 6 }}>
              {station.details.map((d, i) => (
                <View key={d} style={[styles.note2, i > 0 && { borderTopWidth: 1, borderTopColor: t.border }]}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={[styles.noteText, { color: t.text }]}>{d}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        <View style={styles.nav}>
          {prev ? (
            <Pressable onPress={() => router.replace({ pathname: '/aid/[id]', params: { id: prev.id } })} style={[styles.navBtn, { backgroundColor: t.card, borderColor: t.border }]}>
              <Ionicons name="chevron-back" size={18} color={t.primary} />
              <Text style={[styles.navText, { color: t.primary }]} numberOfLines={1}>
                {prev.name.replace(/^(Start|Finish): /, '')}
              </Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {next ? (
            <Pressable onPress={() => router.replace({ pathname: '/aid/[id]', params: { id: next.id } })} style={[styles.navBtn, { backgroundColor: t.card, borderColor: t.border, justifyContent: 'flex-end' }]}>
              <Text style={[styles.navText, { color: t.primary }]} numberOfLines={1}>
                {next.name.replace(/^(Start|Finish): /, '')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={t.primary} />
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  pillText: { fontSize: 13, fontWeight: '800' },
  summary: { fontSize: 15, lineHeight: 22, marginBottom: 14 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16 },
  ctaTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  ctaSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 },
  note: { fontSize: 14, lineHeight: 20 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  factIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  factLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  factValue: { fontSize: 16, fontWeight: '600', marginTop: 1 },
  legRow: { flexDirection: 'row', gap: 10 },
  legStat: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  legValue: { fontSize: 18, fontWeight: '900' },
  legLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  note2: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  noteText: { flex: 1, fontSize: 14, lineHeight: 21 },
  nav: { flexDirection: 'row', gap: 10, marginTop: 20 },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1 },
  navText: { fontSize: 14, fontWeight: '800', flexShrink: 1 },
});
