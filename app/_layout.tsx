import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { applyTheme, loadThemePref } from '../src/settings';
import { useTheme } from '../src/theme';

export default function RootLayout() {
  const t = useTheme();
  // Restore the light/dark choice made in Settings.
  useEffect(() => {
    loadThemePref().then(applyTheme);
  }, []);
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.text,
          headerShadowVisible: false,
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="aid/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="info/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="gear" options={{ headerShown: false }} />
        <Stack.Screen name="news" options={{ headerShown: false }} />
        <Stack.Screen name="weather" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="elevation" options={{ title: 'Elevation' }} />
      </Stack>
    </>
  );
}
