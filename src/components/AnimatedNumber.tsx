import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, Text, TextStyle } from 'react-native';

/** Counts from the previous value to the new one whenever `value` changes. */
export function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '', style }: { value: number; decimals?: number; prefix?: string; suffix?: string; style?: StyleProp<TextStyle> }) {
  const [shown, setShown] = useState(value);
  const anim = useRef(new Animated.Value(value)).current;

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setShown(v));
    return () => anim.removeListener(id);
  }, [anim]);
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [anim, value]);

  const text = shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <Text style={[style, { fontVariant: ['tabular-nums'] }]}>{`${prefix}${text}${suffix}`}</Text>;
}
