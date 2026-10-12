import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Alert } from '../alert';
import { MAX_RUNNERS, Runner } from '../runners';
import { useTheme } from '../theme';
import { Button } from './ui';

type Props = {
  runners: Runner[];
  activeId: string;
  onPick: (id: string) => void;
  onAdd: (name: string, bib: string) => void;
  onUpdate: (id: string, name: string, bib: string) => void;
  onRemove: (id: string) => void;
};

/** Chips for choosing which runner the planner is about, plus a sheet to add, rename or remove one. */
export function RunnerBar({ runners, activeId, onPick, onAdd, onUpdate, onRemove }: Props) {
  const t = useTheme();
  const [editing, setEditing] = useState<Runner | 'new' | null>(null);
  const [name, setName] = useState('');
  const [bib, setBib] = useState('');

  const open = (r: Runner | 'new') => {
    setName(r === 'new' ? '' : r.name);
    setBib(r === 'new' ? '' : r.bib);
    setEditing(r);
  };
  const save = () => {
    if (editing === 'new') onAdd(name, bib);
    else if (editing) onUpdate(editing.id, name, bib);
    setEditing(null);
  };
  const confirmRemove = (r: Runner) =>
    Alert.alert(`Remove ${r.name}?`, 'Their goal time and logged times are deleted from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          onRemove(r.id);
          setEditing(null);
        },
      },
    ]);

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
        {runners.map((r) => {
          const on = r.id === activeId;
          return (
            <Pressable
              key={r.id}
              onPress={() => (on ? open(r) : onPick(r.id))}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={on ? `${r.name}, tracking. Tap to edit` : `Track ${r.name}`}
              style={[styles.chip, on ? { backgroundColor: '#ffffff' } : { backgroundColor: 'rgba(255,255,255,0.18)' }]}
            >
              <Ionicons name="person" size={14} color={on ? '#0b4a6b' : '#dbe9f2'} />
              <Text style={[styles.chipText, { color: on ? '#0b4a6b' : '#ffffff' }]} numberOfLines={1}>
                {r.name}
                {r.bib ? ` #${r.bib}` : ''}
              </Text>
              {on && <Ionicons name="create-outline" size={14} color="#0b4a6b" />}
            </Pressable>
          );
        })}
        {runners.length < MAX_RUNNERS && (
          <Pressable onPress={() => open('new')} style={[styles.chip, styles.addChip]} accessibilityRole="button" accessibilityLabel="Add a runner">
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text style={[styles.chipText, { color: '#ffffff' }]}>Add runner</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[styles.title, { color: t.text }]}>{editing === 'new' ? 'Add a runner' : 'Edit runner'}</Text>
            <Text style={[styles.hint, { color: t.muted }]}>Each runner has their own goal time and logged times, kept on this phone.</Text>
            <Text style={[styles.label, { color: t.muted }]}>NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Runner's name"
              placeholderTextColor={t.muted}
              autoFocus
              maxLength={24}
              style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.bg }]}
            />
            <Text style={[styles.label, { color: t.muted }]}>BIB NUMBER (OPTIONAL)</Text>
            <TextInput
              value={bib}
              onChangeText={setBib}
              placeholder="e.g. 42"
              placeholderTextColor={t.muted}
              maxLength={6}
              keyboardType="number-pad"
              style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.bg }]}
            />
            <View style={styles.actions}>
              <View style={{ flex: 1 }}>
                <Button label="Cancel" variant="ghost" onPress={() => setEditing(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Save" onPress={save} />
              </View>
            </View>
            {editing !== 'new' && editing && runners.length > 1 && (
              <Pressable onPress={() => confirmRemove(editing)} style={styles.remove} accessibilityRole="button">
                <Ionicons name="trash-outline" size={16} color={t.red} />
                <Text style={[styles.removeText, { color: t.red }]}>Remove this runner</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { marginTop: 10, marginHorizontal: -16 },
  row: { paddingHorizontal: 16, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17, maxWidth: 220 },
  addChip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'transparent' },
  chipText: { fontSize: 14, fontWeight: '800', flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  sheet: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 6 },
  title: { fontSize: 20, fontWeight: '900' },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 46, fontSize: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  remove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 14 },
  removeText: { fontSize: 14, fontWeight: '800' },
});
