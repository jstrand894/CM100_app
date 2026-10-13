import { Platform } from 'react-native';

// On iOS 26 and later the system tab bar is a floating glass bar that sits over the bottom of each screen instead of
// reserving space, so scrolling screens need extra room at the bottom to clear it. The web bar floats the same way.
// Older iOS and Android reserve the space themselves.
export const TAB_BAR_CLEARANCE =
  Platform.OS === 'web' || (Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26) ? 84 : 0;
