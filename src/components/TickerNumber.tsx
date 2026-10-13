import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';

const REPEAT = 3; // three copies of 0-9 stacked, so a digit can roll past 9 or 0 and keep going
const DIGITS = Array.from({ length: 10 * REPEAT }, (_, i) => i % 10);

// One digit that rolls like an odometer wheel: it takes the shortest way round to its new value.
function Wheel({ digit, style, ms }: { digit: number; style?: StyleProp<TextStyle>; ms: number }) {
  const [h, setH] = useState(0);
  const pos = useRef(new Animated.Value(10 + digit)).current;
  const cur = useRef(digit);
  useEffect(() => {
    if (digit === cur.current) return;
    let delta = (digit - cur.current + 10) % 10;
    if (delta > 5) delta -= 10; // counting down rolls the wheel the other way
    const from = cur.current;
    cur.current = digit;
    Animated.timing(pos, { toValue: 10 + from + delta, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) pos.setValue(10 + digit); // back to the middle copy, unseen
    });
  }, [digit, pos, ms]);

  return (
    <View style={{ height: h || undefined, overflow: 'hidden' }}>
      {/* The invisible zero gives the wheel its width and height. */}
      <Text style={[style, styles.sizer]} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
        0
      </Text>
      {h > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: Animated.multiply(pos, -h) }] }]}>
          {DIGITS.map((d, i) => (
            <Text key={i} style={[style, { height: h }]}>
              {d}
            </Text>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

/** A number whose digits roll up and down like a ticker whenever it changes. */
export function TickerNumber({ value, style, ms = 380 }: { value: string; style?: StyleProp<TextStyle>; ms?: number }) {
  const chars = value.split('');
  return (
    <View style={styles.row} accessibilityLabel={value} accessible>
      {chars.map((c, i) =>
        /\d/.test(c) ? (
          // Keyed from the right so the ones place keeps its wheel when the length changes.
          <Wheel key={chars.length - i} digit={Number(c)} style={style} ms={ms} />
        ) : (
          <Text key={`s${i}`} style={style}>
            {c}
          </Text>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  sizer: { opacity: 0 },
});
