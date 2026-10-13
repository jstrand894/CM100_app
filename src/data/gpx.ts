import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

// The race website hosts the official course file. Rather than copy it here, the app reads the course page,
// finds the current GPX link, and works out when that file was last updated, so a website update shows up
// without an app update. A copy bundled in the app is the fallback when the site can't be reached.
export const COURSE_PAGE_URL = 'https://www.crazymountainultra.com/map-course-description';
const CACHE_KEY = 'cm100.gpx.info';
const MIN_REAL_BYTES = 20000; // a real course file is hundreds of KB; anything tiny is an error page or empty stub

export interface GpxInfo {
  url: string; // final, direct file URL
  updatedAt: number | null; // ms since epoch, when the site's file was last replaced
  bytes: number | null;
  usable: boolean; // false when the site's file looks broken, so the bundled copy should be offered instead
  checkedAt: number;
}

async function timedFetch(url: string, init?: RequestInit, ms = 9000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Squarespace stores each upload under a path containing the upload time in milliseconds.
const uploadTime = (url: string): number | null => {
  const m = url.match(/\/(1[5-9]\d{11})\//);
  return m ? Number(m[1]) : null;
};

export async function checkWebsiteGpx(): Promise<GpxInfo> {
  const page = await (await timedFetch(COURSE_PAGE_URL)).text();
  const link = page.match(/href="([^"]+\.gpx)"/i)?.[1];
  if (!link) throw new Error('No GPX link on the course page');
  const abs = new URL(link, COURSE_PAGE_URL).toString();
  const head = await timedFetch(abs, { method: 'HEAD' });
  const finalUrl = head.url || abs;
  const modified = head.headers.get('last-modified');
  const bytes = Number(head.headers.get('content-length')) || null;
  const updatedAt = uploadTime(finalUrl) ?? (modified ? Date.parse(modified) || null : null);
  return { url: finalUrl, updatedAt, bytes, usable: head.ok && (bytes == null || bytes >= MIN_REAL_BYTES), checkedAt: Date.now() };
}

export function useGpxInfo() {
  const [info, setInfo] = useState<GpxInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const next = await checkWebsiteGpx();
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
      if (mounted.current) setInfo(next);
    } catch {
      if (mounted.current) setFailed(true); // keep whatever was saved from last time
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(CACHE_KEY)
      .then((v) => v && mounted.current && setInfo(JSON.parse(v)))
      .catch(() => {})
      .finally(refresh);
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  return { info, loading, failed, refresh };
}
