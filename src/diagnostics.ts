import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorageGroup {
  label: string;
  bytes: number;
}

const GROUPS: { label: string; match: (k: string) => boolean }[] = [
  { label: 'Runners, goals and logged times', match: (k) => k.startsWith('cm100.runners') || k.startsWith('cm100.goalMinutes') || k.startsWith('cm100.liveLogs') },
  { label: 'Gear checklist', match: (k) => k.startsWith('cm100.gear') },
  { label: 'Saved news, weather and announcements', match: (k) => /^cm100\.(news|weather|notifications\.cache|entrants)/.test(k) },
];

const byteLength = (s: string) => unescape(encodeURIComponent(s)).length;

/** Size of what the app has saved on this phone (its own storage, not the phone's total app size). */
export async function getStorageUsage(): Promise<{ total: number; groups: StorageGroup[] }> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('cm100.'));
  const pairs = await AsyncStorage.multiGet(keys);
  const sums = new Map<string, number>();
  let total = 0;
  for (const [k, v] of pairs) {
    const bytes = byteLength(k) + byteLength(v ?? '');
    total += bytes;
    const label = GROUPS.find((g) => g.match(k))?.label ?? 'Settings and other';
    sums.set(label, (sums.get(label) ?? 0) + bytes);
  }
  const groups = [...GROUPS.map((g) => g.label), 'Settings and other'].map((label) => ({ label, bytes: sums.get(label) ?? 0 })).filter((g) => g.bytes > 0);
  return { total, groups };
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}
