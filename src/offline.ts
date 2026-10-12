import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { CACHE_KEY as NOTICES_KEY, refreshNotifications } from './data/notifications';
import { NEWS_CSV_URL, useNews } from './data/news';
import { useWeather } from './data/weather';

const NEWS_KEY = 'cm100.news.cache';
const WEATHER_KEY = 'cm100.weather.v1';

async function isReady(): Promise<boolean> {
  try {
    const [notices, news, weather] = await Promise.all([NOTICES_KEY, NEWS_KEY, WEATHER_KEY].map((k) => AsyncStorage.getItem(k)));
    return !!notices && !!weather && (!NEWS_CSV_URL || !!news);
  } catch {
    return false;
  }
}

/** Saves news, weather and announcements to the phone so they still show without signal. */
export function useOfflinePrep() {
  const news = useNews();
  const weather = useWeather();
  const [ready, setReady] = useState<boolean | null>(null);
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    isReady().then(setReady);
  }, []);

  const run = useCallback(async () => {
    setWorking(true);
    setFailed(false);
    await Promise.all([news.refresh(), weather.refresh(), refreshNotifications()]);
    const ok = await isReady();
    setReady(ok);
    setFailed(!ok);
    setWorking(false);
  }, [news.refresh, weather.refresh]);

  return { ready, working, failed, run };
}
