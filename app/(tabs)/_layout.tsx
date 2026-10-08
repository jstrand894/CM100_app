import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';
import { useTheme } from '../../src/theme';

const icon = (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} size={size} color={color} />;

const mciIcon = (name: keyof typeof MaterialCommunityIcons.glyphMap) =>
  ({ color, size }: { color: ColorValue; size: number }) => <MaterialCommunityIcons name={name} size={size + 2} color={color} />;

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
      <Tabs.Screen name="course" options={{ title: 'Course', headerShown: false, tabBarIcon: mciIcon('chart-areaspline') }} />
      <Tabs.Screen name="map" options={{ title: 'Map', headerShown: false, tabBarIcon: icon('map') }} />
      <Tabs.Screen name="planner" options={{ title: 'Planner', headerShown: false, tabBarIcon: icon('timer') }} />
      {/* Still a route (Home links to it), just not a tab. */}
      <Tabs.Screen name="lottery" options={{ href: null }} />
    </Tabs>
  );
}
