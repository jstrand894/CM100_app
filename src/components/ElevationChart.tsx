import { useMemo, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { AidStation } from '../data/aidStations';
import elevation from '../data/elevation.json';
import { useTheme } from '../theme';

const HEIGHT = 230;
const PAD = { left: 44, right: 12, top: 14, bottom: 26 };

// Chart x-axis uses race-official miles (100 total), scaled from GPX distance.
const SCALE = 100 / elevation.gpxMiles;
const PROFILE = (elevation.profile as number[][]).map(([mi, ft]) => ({ mile: mi * SCALE, ft }));

export function ElevationChart({ stations }: { stations: AidStation[] }) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const [probe, setProbe] = useState<number | null>(null); // mile

  const yMin = Math.floor(elevation.minFt / 500) * 500;
  const yMax = Math.ceil(elevation.maxFt / 500) * 500;
  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (mile: number) => PAD.left + (mile / 100) * plotW;
  const y = (ft: number) => PAD.top + (1 - (ft - yMin) / (yMax - yMin)) * plotH;

  const { line, area } = useMemo(() => {
    const pts = PROFILE.map((p) => `${x(p.mile).toFixed(1)},${y(p.ft).toFixed(1)}`);
    const l = 'M' + pts.join(' L');
    return { line: l, area: `${l} L${x(100).toFixed(1)},${y(yMin)} L${x(0).toFixed(1)},${y(yMin)} Z` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const elevAt = (mile: number) => {
    let lo = 0;
    while (lo < PROFILE.length - 2 && PROFILE[lo + 1].mile < mile) lo++;
    const a = PROFILE[lo], b = PROFILE[lo + 1];
    const w = b.mile === a.mile ? 0 : Math.min(Math.max((mile - a.mile) / (b.mile - a.mile), 0), 1);
    return a.ft + (b.ft - a.ft) * w;
  };

  const onTouch = (e: GestureResponderEvent) => {
    const mile = ((e.nativeEvent.locationX - PAD.left) / plotW) * 100;
    setProbe(Math.min(Math.max(mile, 0), 100));
  };

  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax; v += 1000) yTicks.push(v);
  const xTicks = [0, 20, 40, 60, 80, 100];
  const near = probe == null ? null : stations.find((s) => Math.abs(s.mile - probe) < 1.2);
  const aid = stations.filter((s) => s.kind !== 'cutoff');

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.readout}>
        {probe == null ? (
          <Text style={[styles.readText, { color: t.muted }]}>Touch and drag the chart to read elevation</Text>
        ) : (
          <Text style={[styles.readText, { color: t.text }]}>
            Mile {probe.toFixed(1)} · {Math.round(elevAt(probe)).toLocaleString()} ft{near ? ` · ${near.name}` : ''}
          </Text>
        )}
      </View>
      {width > 0 && (
        <View onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={onTouch} onResponderMove={onTouch} onResponderRelease={() => setProbe(null)}>
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={t.accent} stopOpacity={0.55} />
                <Stop offset="1" stopColor={t.accent} stopOpacity={0.05} />
              </LinearGradient>
            </Defs>
            {yTicks.map((v) => (
              <G key={v}>
                <Line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={t.border} strokeWidth={1} />
                <SvgText x={PAD.left - 6} y={y(v) + 4} fontSize={10} fill={t.muted} textAnchor="end">
                  {v / 1000}k
                </SvgText>
              </G>
            ))}
            {xTicks.map((m) => (
              <SvgText key={m} x={x(m)} y={HEIGHT - 8} fontSize={10} fill={t.muted} textAnchor="middle">
                {m}
              </SvgText>
            ))}
            <Path d={area} fill="url(#fill)" />
            <Path d={line} stroke={t.accent} strokeWidth={2} fill="none" strokeLinejoin="round" />
            {aid.map((s) => (
              <Circle key={s.id} cx={x(s.mile)} cy={y(elevAt(s.mile))} r={4} fill={t.card} stroke={t.primary} strokeWidth={2} />
            ))}
            {probe != null && (
              <G>
                <Line x1={x(probe)} x2={x(probe)} y1={PAD.top} y2={y(yMin)} stroke={t.primary} strokeWidth={1.5} />
                <Circle cx={x(probe)} cy={y(elevAt(probe))} r={5} fill={t.primary} />
              </G>
            )}
          </Svg>
        </View>
      )}
      <Text style={[styles.axis, { color: t.muted }]}>Miles</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { height: 24, justifyContent: 'center', paddingHorizontal: 4 },
  readText: { fontSize: 13, fontWeight: '700' },
  axis: { fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: -2 },
});
