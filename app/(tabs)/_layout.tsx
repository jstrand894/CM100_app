import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';
import { useTheme } from '../../src/theme';

const icon = (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} size={size} color={color} />;

export default function TabLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
        headerStyle: { backgroundColor: t.bg },
        headerTintColor: t.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarIcon: icon('home') }} />
      <Tabs.Screen name="map" options={{ title: 'Map', headerShown: false, tabBarIcon: icon('map') }} />
      <Tabs.Screen name="aid" options={{ title: 'Aid stations', tabBarIcon: icon('medkit') }} />
      <Tabs.Screen name="track" options={{ title: 'Tracking', tabBarIcon: icon('locate') }} />
    </Tabs>
  );
}
