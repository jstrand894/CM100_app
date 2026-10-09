import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, LayoutAnimation, Linking, Platform, UIManager, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Alert } from '../src/alert';
import { DetailHeader, Section, tint } from '../src/components/ui';
import { AID_STATIONS } from '../src/data/aidStations';
import { MANDATORY_GEAR, RECOMMENDED_GEAR } from '../src/data/race';
import { useTheme } from '../src/theme';

// Android needs layout animations switched on (a no-op on the new architecture).
if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

const KEY = 'cm100.gear.v1';

// Ideas for drop bag contents. Not from the race, so they are labeled as ideas.
const BAG_IDEAS = ['Fresh socks', 'Dry shoes', 'Warm layer', 'Headlamp batteries', 'Favorite food', 'Anti-chafe', 'Phone battery'];
const BAG_STATIONS = AID_STATIONS.filter((s) => s.dropBags && s.kind !== 'cutoff');
const stationName = (n: string) => n.replace(/^(Start|Finish): /, '');

interface Saved {
  checked: Record<string, boolean>;
  custom: Record<string, string[]>;
}

export default function GearScreen() {
  const t = useTheme();
  const [saved, setSaved] = useState<Saved>({ checked: {}, custom: {} });
  const [openSection, setOpenSection] = useState<string | null>(null); // one section open at a time keeps the page short
  const [openBag, setOpenBag] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const smooth = () => LayoutAnimation.configureNext(LayoutAnimation.create(260, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
  const toggleSection = (key: string) => {
    smooth();
    setOpenSection((o) => (o === key ? null : key));
    setDraft('');
  };

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setSaved(JSON.parse(v)))
      .catch(() => {});
  }, []);
  const persist = (next: Saved) => {
    setSaved(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };
  const toggle = (id: string) => persist({ ...saved, checked: { ...saved.checked, [id]: !saved.checked[id] } });
  const addCustom = (section: string) => {
    const text = draft.trim();
    if (!text) return;
    persist({ ...saved, custom: { ...saved.custom, [section]: [...(saved.custom[section] ?? []), text] } });
    setDraft('');
  };
  const removeCustom = (section: string, i: number) => {
    const list = [...(saved.custom[section] ?? [])];
    const [gone] = list.splice(i, 1);
    const checked = { ...saved.checked };
    delete checked[`${section}:c:${gone}`];
    persist({ checked, custom: { ...saved.custom, [section]: list } });
  };
  const resetAll = () =>
    Alert.alert('Clear all checkmarks?', 'Your custom items stay. Only the checks are cleared.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => persist({ ...saved, checked: {} }) },
    ]);

  const mandatoryDone = MANDATORY_GEAR.filter((g) => saved.checked[`m:${g}`]).length;
  const recCustom = saved.custom.gear ?? [];
  const recTotal = RECOMMENDED_GEAR.length + recCustom.length;
  const recDone = RECOMMENDED_GEAR.filter((g) => saved.checked[`r:${g}`]).length + recCustom.filter((g) => saved.checked[`gear:c:${g}`]).length;

  const row = (id: string, label: string, divider: boolean, onRemove?: () => void) => {
    const on = !!saved.checked[id];
    return (
      <Pressable
        key={id}
        onPress={() => toggle(id)}
        onLongPress={onRemove}
        style={({ pressed }) => [styles.row, divider && { borderTopWidth: 1, borderTopColor: t.border }, pressed && { opacity: 0.6 }]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
      >
        <Ionicons name={on ? 'checkbox' : 'square-outline'} size={28} color={on ? t.green : t.muted} />
        <Text style={[styles.rowText, { color: on ? t.muted : t.text, textDecorationLine: on ? 'line-through' : 'none' }]}>{label}</Text>
        {onRemove && (
          <Pressable onPress={onRemove} hitSlop={12} accessibilityLabel={`Remove ${label}`}>
            <Ionicons name="close-circle" size={22} color={t.muted} />
          </Pressable>
        )}
      </Pressable>
    );
  };

  const addBox = (section: string) => (
    <View style={[styles.addRow, { borderTopColor: t.border }]}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => addCustom(section)}
        placeholder="Add your own item"
        placeholderTextColor={t.muted}
        returnKeyType="done"
        style={[styles.input, { color: t.text }]}
      />
      <Pressable onPress={() => addCustom(section)} style={[styles.addBtn, { backgroundColor: t.primary }]} accessibilityLabel="Add item">
        <Ionicons name="add" size={24} color="#ffffff" />
      </Pressable>
    </View>
  );

  const note = (text: string) => <Text style={[styles.note, { color: t.muted }]}>{text}</Text>;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <DetailHeader title="Gear and drop bags" subtitle="Tap to check things off. Saved on your phone." />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Section
          icon="shield-checkmark"
          title="Mandatory gear"
          sub={mandatoryDone === MANDATORY_GEAR.length ? 'All packed' : `${mandatoryDone} of ${MANDATORY_GEAR.length} packed`}
          progress={mandatoryDone / MANDATORY_GEAR.length}
          open={openSection === 'mandatory'}
          onToggle={() => toggleSection('mandatory')}
        >
          {note('Checks may happen at the start. The race takes you at your word, so pack all of it. Do not put an EpiPen in a drop bag.')}
          {MANDATORY_GEAR.map((g, i) => row(`m:${g}`, g, i > 0))}
        </Section>

        <Section
          icon="thumbs-up"
          title="Highly recommended"
          sub={recDone > 0 ? `${recDone} of ${recTotal} packed` : `${recTotal} items`}
          open={openSection === 'recommended'}
          onToggle={() => toggleSection('recommended')}
        >
          {RECOMMENDED_GEAR.map((g, i) => row(`r:${g}`, g, i > 0))}
          {recCustom.map((g, i) => row(`gear:c:${g}`, g, true, () => removeCustom('gear', i)))}
          {addBox('gear')}
        </Section>

        <Section
          icon="location"
          title="Drop bags: where and when"
          sub="Drop off Thursday at Berg Ranch"
          open={openSection === 'dropbags'}
          onToggle={() => toggleSection('dropbags')}
        >
          <View style={[styles.logRow, { paddingTop: 16 }]}>
            <Ionicons name="arrow-down-circle" size={26} color={t.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.logLabel, { color: t.muted }]}>DROP OFF</Text>
              <Text style={[styles.logTitle, { color: t.text }]}>Thursday, 3:00–7:00 PM</Text>
              <Text style={[styles.logBody, { color: t.muted }]}>At Berg Ranch (the finish line), during packet pickup. There are no race-day drop bags.</Text>
            </View>
          </View>
          <View style={[styles.logRow, { paddingTop: 16 }]}>
            <Ionicons name="arrow-up-circle" size={26} color={t.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.logLabel, { color: t.muted }]}>PICK UP</Text>
              <Text style={[styles.logTitle, { color: t.text }]}>Not published yet</Text>
              <Text style={[styles.logBody, { color: t.muted }]}>
                The race has not said where or when bags come back. Volunteers carry them between aid stations, so ask at the Thursday briefing (6:00 PM). The finish line is open all day Saturday and closes at 6:00 PM.
              </Text>
              <Pressable onPress={() => Linking.openURL('mailto:megandehaan@crazymountainultra.com?subject=Drop%20bag%20pickup')} hitSlop={8}>
                <Text style={[styles.logLink, { color: t.primary }]}>Email the race to confirm</Text>
              </Pressable>
            </View>
          </View>
          <View style={[styles.logRow, { paddingTop: 16 }]}>
            <Ionicons name="resize" size={26} color={t.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.logLabel, { color: t.muted }]}>SIZE</Text>
              <Text style={[styles.logTitle, { color: t.text }]}>About a 20 L dry bag or less</Text>
              <Text style={[styles.logBody, { color: t.muted }]}>No large totes.</Text>
            </View>
          </View>
          <View style={{ height: 16 }} />
        </Section>

        <Section
          icon="bag-handle"
          title="Pack your bags"
          sub={`${BAG_STATIONS.length} stations with drop bags`}
          open={openSection === 'pack'}
          onToggle={() => toggleSection('pack')}
        >
          {BAG_STATIONS.map((st, n) => {
            const section = `bag:${st.id}`;
            const customs = saved.custom[section] ?? [];
            const items = [
              ...BAG_IDEAS.map((x) => ({ id: `${section}:i:${x}`, label: x, idx: -1 })),
              ...customs.map((x, i) => ({ id: `${section}:c:${x}`, label: x, idx: i })),
            ];
            const done = items.filter((x) => saved.checked[x.id]).length;
            const isOpen = openBag === section;
            return (
              <View key={st.id} style={n > 0 && { borderTopWidth: 1, borderTopColor: t.border }}>
                <Pressable
                  onPress={() => {
                    smooth();
                    setOpenBag(isOpen ? null : section);
                    setDraft('');
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  style={({ pressed }) => [styles.bagHead, pressed && { opacity: 0.7 }]}
                >
                  <View style={[styles.bagMile, { backgroundColor: tint(t.primary, 0.14) }]}>
                    <Text style={[styles.bagMileText, { color: t.primary }]}>{st.mile}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bagName, { color: t.text }]}>{stationName(st.name)}</Text>
                    <Text style={[styles.bagSub, { color: t.muted }]}>{done > 0 ? `${done} packed` : 'Nothing packed yet'}</Text>
                  </View>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={t.muted} />
                </Pressable>
                {isOpen && (
                  <View style={{ paddingBottom: 6 }}>
                    <Pressable onPress={() => router.push(`/aid/${st.id}`)} style={({ pressed }) => [styles.infoLink, pressed && { opacity: 0.6 }]} accessibilityRole="link">
                      <Ionicons name="information-circle" size={20} color={t.primary} />
                      <Text style={[styles.infoLinkText, { color: t.primary }]}>Aid station info</Text>
                      <Ionicons name="chevron-forward" size={16} color={t.primary} />
                    </Pressable>
                    {note('Ideas, not race rules. Long-press or tap the x to remove your own items.')}
                    {items.map((x, i) => row(x.id, x.label, i > 0, x.idx >= 0 ? () => removeCustom(section, x.idx) : undefined))}
                    {addBox(section)}
                  </View>
                )}
              </View>
            );
          })}
        </Section>

        <Pressable onPress={resetAll} style={[styles.reset, { borderColor: t.border }]}>
          <Text style={[styles.resetText, { color: t.muted }]}>Clear all checkmarks</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60 },
  note: { fontSize: 13, lineHeight: 19, paddingTop: 12, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 10 },
  rowText: { flex: 1, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  logRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  logLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  logTitle: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  logBody: { fontSize: 14, lineHeight: 20, marginTop: 3 },
  logLink: { fontSize: 14, fontWeight: '800', marginTop: 8 },
  bagHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 64 },
  bagMile: { width: 56, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  bagMileText: { fontSize: 16, fontWeight: '900' },
  bagName: { fontSize: 16, fontWeight: '800' },
  bagSub: { fontSize: 13, marginTop: 1 },
  infoLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  infoLinkText: { fontSize: 14, fontWeight: '800', flex: 1 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  input: { flex: 1, fontSize: 16, minHeight: 48, paddingHorizontal: 4 },
  addBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reset: { alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: 14, borderWidth: 1, marginTop: 4 },
  resetText: { fontSize: 15, fontWeight: '700' },
});
