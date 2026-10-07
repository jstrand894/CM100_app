import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

// The race director edits a Google Sheet; File > Share > Publish to web > CSV gives a URL.
// Paste that URL here (see docs/NEWS_GUIDE.md). Changing the sheet never needs an app update.
export const NEWS_CSV_URL: string = '';

const CACHE_KEY = 'cm100.news.cache';
const SEEN_KEY = 'cm100.news.seen';

export interface Post {
  id: string;
  date: string; // yyyy-mm-dd
  title: string;
  body: string;
  link: string;
  urgent: boolean;
}

// Shown only while developing and no sheet URL is set, so the screens can be seen and tested.
const SAMPLE_POSTS: Post[] = [
  {
    id: 'sample-1',
    date: '2026-10-05',
    title: 'Sample: lottery opens December 1',
    body: 'This is a sample post. Applications open Dec 1 at 6:00 AM Mountain. Make your UltraSignup account ahead of time.',
    link: '',
    urgent: false,
  },
  {
    id: 'sample-2',
    date: '2026-09-28',
    title: 'Sample: trail work day',
    body: 'This is a sample post. Join us for a trail work day. Hours count toward the 8-hour requirement.',
    link: 'https://www.crazymountainultra.com',
    urgent: false,
  },
];

// Small RFC 4180 CSV parser (quoted fields, escaped quotes, newlines inside quotes).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

export function postsFromCsv(text: string): Post[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => head.indexOf(name);
  const [iDate, iTitle, iBody, iLink, iUrgent, iShow] = ['date', 'title', 'body', 'link', 'urgent', 'show'].map(col);
  const truthy = (v?: string) => ['true', 'yes', 'y', '1', 'x'].includes((v ?? '').trim().toLowerCase());
  return rows
    .slice(1)
    .filter((r) => (r[iTitle] ?? '').trim() !== '' && (iShow < 0 || (r[iShow] ?? '').trim() === '' || truthy(r[iShow])))
    .map((r) => ({
      id: `${(r[iDate] ?? '').trim()}|${(r[iTitle] ?? '').trim()}`,
      date: (r[iDate] ?? '').trim(),
      title: r[iTitle].trim(),
      body: (r[iBody] ?? '').trim(),
      link: (r[iLink] ?? '').trim(),
      urgent: iUrgent >= 0 && truthy(r[iUrgent]),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function formatPostDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function agoLabel(ts: number | null): string {
  if (!ts) return 'never';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} hr ago`;
  return `${Math.round(h / 24)} days ago`;
}

export function useNews() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [seenId, setSeenId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const mounted = useRef(true);

  const isSample = !NEWS_CSV_URL && __DEV__;

  const refresh = useCallback(async () => {
    if (!NEWS_CSV_URL) return;
    setRefreshing(true);
    setFailed(false);
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000);
      const res = await fetch(`${NEWS_CSV_URL}${NEWS_CSV_URL.includes('?') ? '&' : '?'}t=${Date.now()}`, { signal: ctl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = postsFromCsv(await res.text());
      const now = Date.now();
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ posts: next, at: now })).catch(() => {});
      if (mounted.current) {
        setPosts(next);
        setUpdatedAt(now);
      }
    } catch {
      if (mounted.current) setFailed(true); // keep showing whatever is cached
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      if (isSample) {
        setPosts(SAMPLE_POSTS);
        setUpdatedAt(Date.now());
      } else {
        try {
          const raw = await AsyncStorage.getItem(CACHE_KEY);
          if (raw) {
            const c = JSON.parse(raw);
            setPosts(c.posts ?? []);
            setUpdatedAt(c.at ?? null);
          }
        } catch {}
      }
      setReady(true);
      refresh();
    })();
    return () => {
      mounted.current = false;
    };
  }, [isSample, refresh]);

  // Re-read the "last seen" marker whenever a screen using this hook regains focus.
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(SEEN_KEY)
        .then((v) => setSeenId(v))
        .catch(() => {});
    }, []),
  );

  const latestId = posts[0]?.id ?? null;
  const unread = (() => {
    if (!posts.length) return 0;
    if (seenId == null) return posts.length;
    const i = posts.findIndex((p) => p.id === seenId);
    return i < 0 ? posts.length : i;
  })();
  const markSeen = useCallback(() => {
    if (!latestId) return;
    setSeenId(latestId);
    AsyncStorage.setItem(SEEN_KEY, latestId).catch(() => {});
  }, [latestId]);

  return { posts, updatedAt, refreshing, failed, refresh, unread, markSeen, isSample, ready, configured: !!NEWS_CSV_URL };
}
