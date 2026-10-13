import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ColorValue, View } from 'react-native';
import { useNotifications } from '../../src/data/notifications';
import { useTheme } from '../../src/theme';

const icon = (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} size={size} color={color} />;

const mciIcon = (name: keyof typeof MaterialCommunityIcons.glyphMap) =>
  ({ color, size }: { color: ColorValue; size: number }) => <MaterialCommunityIcons name={name} size={size + 2} color={color} />;

export default function TabLayout() {
  const t = useTheme();
  const { unread } = useNotifications();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        // A floating, rounded bar over a blurred translucent card, like the iOS glass bar. Screens clear it via TAB_BAR_CLEARANCE.
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 12,
          height: 64,
          paddingTop: 6,
          paddingBottom: 6,
          borderRadius: 32,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: t.border,
          backgroundColor: 'transparent',
          overflow: 'hidden',
          boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
        },
        tabBarBackground: () => (
          <View
            style={[
              { flex: 1, backgroundColor: `${t.card}b8` },
              { backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' } as object,
            ]}
          />
        ),
        headerStyle: { backgroundColor: t.bg },
        headerTintColor: t.text,
        headerShadowVisible: false,
        animation: 'none',
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarIcon: icon('home') }} />
      <Tabs.Screen name="course" options={{ title: 'Course', headerShown: false, tabBarIcon: mciIcon('chart-areaspline') }} />
      <Tabs.Screen name="map" options={{ title: 'Map', headerShown: false, tabBarIcon: icon('map') }} />
      <Tabs.Screen name="planner" options={{ title: 'Pace', headerShown: false, tabBarIcon: mciIcon('run') }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Inbox',
          headerShown: false,
          tabBarBadge: unread > 0 ? (unread > 9 ? '9+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: t.accent, color: '#ffffff', fontWeight: '800' },
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
