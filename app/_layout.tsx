import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/theme';

export default function RootLayout() {
  const t = useTheme();
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
        <Stack.Screen name="planner" options={{ title: 'Pace planner' }} />
        <Stack.Screen name="elevation" options={{ title: 'Elevation' }} />
      </Stack>
    </>
  );
}
