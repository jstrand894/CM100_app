import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

// True unless the phone reports no usable connection. Starts true so screens don't flash a warning on launch.
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)), []);
  return online;
}
