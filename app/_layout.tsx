import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';
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
  // On a wide web window, keep the app a phone-width column in the middle instead of stretching it.
  const column = Platform.OS === 'web' ? { flex: 1, width: '100%' as const, maxWidth: 480, alignSelf: 'center' as const } : { flex: 1 };
  return (
    <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? t.border : t.bg }}>
      <View style={column}>
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
      </View>
    </View>
  );
}
