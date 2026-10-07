import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, DetailHeader, SectionTitle, tint } from '../src/components/ui';
import { AID_STATIONS } from '../src/data/aidStations';
import { MANDATORY_GEAR, RECOMMENDED_GEAR } from '../src/data/race';
import { useTheme } from '../src/theme';

const KEY = 'cm100.gear.v1';

// Ideas for drop bag contents. Not from the race, so they are labeled as ideas.
const BAG_IDEAS = ['Fresh socks', 'Dry shoes', 'Warm layer', 'Headlamp batteries', 'Favorite food', 'Anti-chafe', 'Phone battery'];
const BAG_STATIONS = AID_STATIONS.filter((s) => s.dropBags && s.kind !== 'cutoff');

interface Saved {
  checked: Record<string, boolean>;
  custom: Record<string, string[]>;
}

export default function GearScreen() {
  const t = useTheme();
  const [saved, setSaved] = useState<Saved>({ checked: {}, custom: {} });
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

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

  const row = (id: string, label: string, onRemove?: () => void) => {
    const on = !!saved.checked[id];
    return (
      <Pressable key={id} onPress={() => toggle(id)} onLongPress={onRemove} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
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
    <View style={[styles.addRow, { borderColor: t.border }]}>
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

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <DetailHeader title="Gear and drop bags" subtitle="Tap to check things off. Saved on your phone." />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.progressTop}>
            <Text style={[styles.progressTitle, { color: t.text }]}>Mandatory gear</Text>
            <Text style={[styles.progressCount, { color: mandatoryDone === MANDATORY_GEAR.length ? t.green : t.primary }]}>
              {mandatoryDone} of {MANDATORY_GEAR.length}
            </Text>
          </View>
          <View style={[styles.bar, { backgroundColor: t.primarySoft }]}>
            <View style={[styles.barFill, { width: `${(mandatoryDone / MANDATORY_GEAR.length) * 100}%`, backgroundColor: mandatoryDone === MANDATORY_GEAR.length ? t.green : t.primary }]} />
          </View>
          <Text style={[styles.note, { color: t.muted }]}>
            Checks may happen at the start. The race takes you at your word, so pack all of it. Do not put an EpiPen in a drop bag.
          </Text>
        </Card>

        <SectionTitle>Mandatory</SectionTitle>
        <Card style={{ paddingVertical: 4 }}>
          {MANDATORY_GEAR.map((g, i) => (
            <View key={g} style={i > 0 && { borderTopWidth: 1, borderTopColor: t.border }}>
              {row(`m:${g}`, g)}
            </View>
          ))}
        </Card>

        <SectionTitle>Highly recommended</SectionTitle>
        <Card style={{ paddingVertical: 4 }}>
          {RECOMMENDED_GEAR.map((g, i) => (
            <View key={g} style={i > 0 && { borderTopWidth: 1, borderTopColor: t.border }}>
              {row(`r:${g}`, g)}
            </View>
          ))}
          {(saved.custom.gear ?? []).map((g, i) => (
            <View key={`${g}-${i}`} style={{ borderTopWidth: 1, borderTopColor: t.border }}>
              {row(`gear:c:${g}`, g, () => removeCustom('gear', i))}
            </View>
          ))}
          {open === 'gear' ? addBox('gear') : (
            <Pressable onPress={() => { setOpen('gear'); setDraft(''); }} style={[styles.addLink, { borderTopColor: t.border }]}>
              <Ionicons name="add-circle" size={24} color={t.primary} />
              <Text style={[styles.addLinkText, { color: t.primary }]}>Add your own item</Text>
            </Pressable>
          )}
        </Card>

        <SectionTitle>Drop bags</SectionTitle>
        <View style={[styles.tip, { backgroundColor: t.accentSoft }]}>
          <Text style={[styles.tipText, { color: t.text }]}>
            Keep each bag small, about a 20 L dry bag or less. No large totes. Volunteers carry bags to and from aid stations. There are
            no race-day drop bags, so drop them at packet pickup on Thursday.
          </Text>
        </View>
        {BAG_STATIONS.map((st) => {
          const section = `bag:${st.id}`;
          const customs = saved.custom[section] ?? [];
          const items = [...BAG_IDEAS.map((x) => ({ id: `${section}:i:${x}`, label: x, custom: false, idx: -1 })), ...customs.map((x, i) => ({ id: `${section}:c:${x}`, label: x, custom: true, idx: i }))];
          const done = items.filter((x) => saved.checked[x.id]).length;
          const isOpen = open === section;
          return (
            <Card key={st.id} style={{ padding: 0, overflow: 'hidden' }}>
              <Pressable
                onPress={() => {
                  setOpen(isOpen ? null : section);
                  setDraft('');
                }}
                style={({ pressed }) => [styles.bagHead, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.bagMile, { backgroundColor: tint(t.primary, 0.14) }]}>
                  <Text style={[styles.bagMileText, { color: t.primary }]}>{st.mile}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bagName, { color: t.text }]}>{st.name.replace(/^(Start|Finish): /, '')}</Text>
                  <Text style={[styles.bagSub, { color: t.muted }]}>{done > 0 ? `${done} packed` : 'Nothing packed yet'}</Text>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={22} color={t.muted} />
              </Pressable>
              {isOpen && (
                <View style={{ borderTopWidth: 1, borderTopColor: t.border, paddingHorizontal: 16 }}>
                  <Text style={[styles.ideas, { color: t.muted }]}>Ideas, not race rules. Long-press or tap the x to remove your own items.</Text>
                  {items.map((x, i) => (
                    <View key={x.id} style={i > 0 && { borderTopWidth: 1, borderTopColor: t.border }}>
                      {row(x.id, x.label, x.custom ? () => removeCustom(section, x.idx) : undefined)}
                    </View>
                  ))}
                  {addBox(section)}
                </View>
              )}
            </Card>
          );
        })}

        <Pressable onPress={resetAll} style={[styles.reset, { borderColor: t.border }]}>
          <Text style={[styles.resetText, { color: t.muted }]}>Clear all checkmarks</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  progressTitle: { fontSize: 17, fontWeight: '800' },
  progressCount: { fontSize: 22, fontWeight: '900' },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 10 },
  barFill: { height: 10, borderRadius: 5 },
  note: { fontSize: 13, lineHeight: 19, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 10 },
  rowText: { flex: 1, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  tip: { borderRadius: 14, padding: 12, marginBottom: 12 },
  tipText: { fontSize: 14, lineHeight: 20 },
  bagHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 64 },
  bagMile: { minWidth: 48, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  bagMileText: { fontSize: 16, fontWeight: '900' },
  bagName: { fontSize: 17, fontWeight: '800' },
  bagSub: { fontSize: 13, marginTop: 1 },
  ideas: { fontSize: 12, paddingTop: 10, paddingBottom: 2 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, marginTop: 4 },
  input: { flex: 1, fontSize: 16, minHeight: 48, paddingHorizontal: 4 },
  addBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, borderTopWidth: 1 },
  addLinkText: { fontSize: 16, fontWeight: '800' },
  reset: { alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: 14, borderWidth: 1, marginTop: 12 },
  resetText: { fontSize: 15, fontWeight: '700' },
});
