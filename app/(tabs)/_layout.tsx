import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useNotifications } from '../../src/data/notifications';
import { useTheme } from '../../src/theme';

// The system tab bar: on iOS 26 and later it is the floating Liquid Glass bar with a bubble behind the selected tab.
// The web build uses the JS tab bar in _layout.web.tsx.
export default function TabLayout() {
  const t = useTheme();
  const { unread } = useNotifications();
  return (
    <NativeTabs tintColor={t.accent}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="course">
        <NativeTabs.Trigger.Label>Course</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.xyaxis.line" md="show_chart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} md="map" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="planner">
        <NativeTabs.Trigger.Label>Pace</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="figure.run" md="directions_run" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bell', selected: 'bell.fill' }} md="notifications" />
        {unread > 0 && <NativeTabs.Trigger.Badge>{unread > 9 ? '9+' : String(unread)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
