import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { elevationAtMile, profileBetween } from '../data/elevationUtil';
import { useTheme } from '../theme';

const HEIGHT = 110;
const PAD = { left: 10, right: 10, top: 14, bottom: 10 };
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

interface Station { name: string; mile: number }
interface Props {
  prev: Station | null;
  station: Station;
  next: Station | null;
  /** Which leg the plot window is on. Changing it pans the graph so `station` slides from one edge to the other. */
  mode: 'from' | 'to';
  color: string;
}

/**
 * Elevation profile around the current station. The frame stays put and the graph slides under it:
 * "from previous" puts the station on the right edge, "to next" puts it on the left.
 */
export function LegProfile({ prev, station, next, mode, color }: Props) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const target = mode === 'to' ? 1 : 0;
  const [p, setP] = useState(target);
  const [sizes, setSizes] = useState<Record<string, number>>({}); // measured label line widths
  const anim = useRef(new Animated.Value(target)).current;

  useEffect(() => {
    const id = anim.addListener(({ value }) => setP(value));
    return () => anim.removeListener(id);
  }, [anim]);
  useEffect(() => {
    Animated.timing(anim, { toValue: target, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start();
  }, [anim, target]);

  const lo = prev ?? station, hi = next ?? station;
  const pts = useMemo(() => profileBetween(lo.mile, hi.mile), [lo.mile, hi.mile]);

  // The two windows the plot slides between. When a neighbour is missing (start or finish) both are the same.
  const wFrom = prev ? [prev.mile, station.mile] : [station.mile, next!.mile];
  const wTo = next ? [station.mile, next.mile] : [prev!.mile, station.mile];
  const range = (w: number[]) => {
    const f = pts.filter((q) => q.mile >= w[0] && q.mile <= w[1]).map((q) => q.ft);
    return [Math.min(...f), Math.max(...f)];
  };
  const [rFrom, rTo] = useMemo(() => [range(wFrom), range(wTo)], [pts, wFrom[0], wFrom[1], wTo[0], wTo[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const vs = lerp(wFrom[0], wTo[0], p), ve = lerp(wFrom[1], wTo[1], p);
  const yLo = lerp(rFrom[0], rTo[0], p), yHi = lerp(rFrom[1], rTo[1], p);
  const ySpan = Math.max(yHi - yLo, 200);
  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (m: number) => PAD.left + ((m - vs) / (ve - vs)) * plotW;
  const y = (ft: number) => PAD.top + (1 - (ft - yLo) / ySpan) * plotH;

  // Draw just the visible stretch plus one point either side so the line runs cleanly off the edges.
  let i0 = pts.findIndex((q) => q.mile >= vs);
  i0 = Math.max((i0 < 0 ? pts.length - 1 : i0) - 1, 0);
  let i1 = pts.findIndex((q) => q.mile > ve);
  i1 = i1 < 0 ? pts.length - 1 : i1;
  const vis = pts.slice(i0, i1 + 1);
  const line = 'M' + vis.map((q) => `${x(q.mile).toFixed(1)},${y(q.ft).toFixed(1)}`).join(' L');
  const area = `${line} L${x(vis[vis.length - 1].mile).toFixed(1)},${HEIGHT} L${x(vis[0].mile).toFixed(1)},${HEIGHT} Z`;

  const dots = [prev, station, next].filter(Boolean) as Station[];
  const fmt = (n: number) => Math.round(n).toLocaleString();
  // Interpolate exactly like the line does, so each dot sits on it rather than on the nearest data point.
  const ftAt = elevationAtMile;
  const shortFit = (n: string) => (n.length * 8 > (width - 12) / 2 - 4 ? n.replace(/ \(.*\)$/, '') : n);
  const measure = (key: string) => (e: LayoutChangeEvent) => {
    const w = Math.ceil(e.nativeEvent.layout.width);
    setSizes((prev0) => (prev0[key] === w ? prev0 : { ...prev0, [key]: w }));
  };

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id="legFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0.03} />
            </LinearGradient>
            <ClipPath id="legClip">
              <Rect x={PAD.left} y={0} width={plotW} height={HEIGHT} />
            </ClipPath>
          </Defs>
          <Path d={area} fill="url(#legFill)" clipPath="url(#legClip)" />
          <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" clipPath="url(#legClip)" />
          {dots.map((s) => {
            const cx = x(s.mile);
            // A station fades out as the graph carries it past the edge of the frame.
            const outside = Math.max(PAD.left - cx, cx - (PAD.left + plotW), 0);
            const here = s === station;
            return (
              <Circle
                key={s.mile}
                cx={cx}
                cy={y(ftAt(s.mile))}
                r={here ? 5.5 : 4.5}
                fill={here ? color : t.bg}
                stroke={here ? t.bg : color}
                strokeWidth={here ? 2 : 2.5}
                opacity={clamp01(1 - outside / 10)}
              />
            );
          })}
        </Svg>
      )}
      <View style={styles.labels}>
        {dots.map((s) => {
          // Each label rides under its station dot. Near the left edge it hangs to the right of the dot, near the right edge to the left,
          // and in between each line eases across, so the text slides with the graph instead of swapping sides.
          const cx = x(s.mile);
          const frac = clamp01((cx - PAD.left) / plotW);
          const outside = Math.max(PAD.left - cx, cx - (PAD.left + plotW), 0);
          const nameW = sizes[`${s.mile}n`] ?? 0, subW = sizes[`${s.mile}s`] ?? 0;
          const boxW = Math.max(nameW, subW);
          const shift = (w: number) => frac * (boxW - w);
          return (
            <View
              key={s.mile}
              pointerEvents="none"
              style={[styles.tag, { left: cx - frac * boxW, width: boxW || undefined, opacity: boxW ? clamp01(1 - outside / 24) : 0 }]}
            >
              <Text onLayout={measure(`${s.mile}n`)} style={[styles.name, { color: t.text, transform: [{ translateX: shift(nameW) }] }]} numberOfLines={1}>
                {shortFit(s.name)}
              </Text>
              <Text onLayout={measure(`${s.mile}s`)} style={[styles.label, { color: t.muted, transform: [{ translateX: shift(subW) }] }]} numberOfLines={1}>
                Mile {s.mile} · {fmt(ftAt(s.mile))} ft
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { height: 36, marginTop: 6, overflow: 'hidden' },
  tag: { position: 'absolute', top: 0 },
  name: { fontSize: 14, fontWeight: '800', alignSelf: 'flex-start' },
  label: { fontSize: 11, fontWeight: '700', alignSelf: 'flex-start' },
});
