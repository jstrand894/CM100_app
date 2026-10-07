import { useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { AidStation } from '../data/aidStations';
import elevation from '../data/elevation.json';
import { BRAND_BLUE, useTheme } from '../theme';


// Chart x-axis uses race-official miles (100 total), scaled from GPX distance.
const SCALE = 100 / elevation.gpxMiles;
const RAW = (elevation.profile as number[][]).map(([mi, ft]) => ({ mile: mi * SCALE, ft }));
// Light 3-point smoothing so the line reads cleanly without flattening the peaks.
const PROFILE = RAW.map((p, i) => {
  const a = RAW[Math.max(i - 1, 0)].ft, b = RAW[Math.min(i + 1, RAW.length - 1)].ft;
  return { mile: p.mile, ft: (a + p.ft * 2 + b) / 4 };
});

interface Props {
  stations: AidStation[];
  height?: number;
  /** Station to highlight (e.g. the one being viewed in a list). */
  activeStationId?: string | null;
  /** When set, touching the chart selects the nearest station instead of showing a free readout. */
  onSelectStation?: (id: string) => void;
  /** 'dark' draws light-on-dark for use directly on the blue header. */
  tone?: 'light' | 'dark';
  /** Visible window in miles (default: the whole course). Lets the chart zoom and pan along the route. */
  viewStart?: number;
  viewSpan?: number;
}

const shortName = (n: string) => n.replace(/^(Start|Finish): /, '').replace(/ \((first|second) visit\)/, ' ($1)');

export function ElevationChart({ stations, height = 230, activeStationId = null, onSelectStation, tone = 'light', viewStart = 0, viewSpan = 100 }: Props) {
  const theme = useTheme();
  const dark = tone === 'dark';
  // On the blue header the chart uses its own light-on-dark palette.
  const t = dark
    ? { ...theme, accent: '#ff8a3d', border: 'rgba(255,255,255,0.14)', muted: 'rgba(255,255,255,0.7)', card: BRAND_BLUE, primary: '#ffffff', text: '#ffffff' }
    : theme;
  const HEIGHT = height;
  const selectable = !!onSelectStation;
  const PAD = { left: selectable ? 48 : 40, right: selectable ? 18 : 12, top: selectable ? 32 : 14, bottom: 24 };
  const [width, setWidth] = useState(0);
  const [probe, setProbe] = useState<number | null>(null); // mile

  const yMin = Math.floor(elevation.minFt / 500) * 500;
  const yMax = Math.ceil(elevation.maxFt / 500) * 500;
  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (mile: number) => PAD.left + ((mile - viewStart) / viewSpan) * plotW;
  const inView = (mile: number, slack = 0.5) => mile >= viewStart - slack && mile <= viewStart + viewSpan + slack;
  const y = (ft: number) => PAD.top + (1 - (ft - yMin) / (yMax - yMin)) * plotH;

  const { line, area } = useMemo(() => {
    // Only the visible stretch (plus a little margin) is drawn.
    const vis = PROFILE.filter((p) => p.mile >= viewStart - 2 && p.mile <= viewStart + viewSpan + 2);
    const pts = vis.map((p) => `${x(p.mile).toFixed(1)},${y(p.ft).toFixed(1)}`);
    const l = 'M' + pts.join(' L');
    const first = vis[0], last = vis[vis.length - 1];
    return { line: l, area: `${l} L${x(last.mile).toFixed(1)},${y(yMin)} L${x(first.mile).toFixed(1)},${y(yMin)} Z` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, viewStart, viewSpan]);

  const elevAt = (mile: number) => {
    let lo = 0;
    while (lo < PROFILE.length - 2 && PROFILE[lo + 1].mile < mile) lo++;
    const a = PROFILE[lo], b = PROFILE[lo + 1];
    const w = b.mile === a.mile ? 0 : Math.min(Math.max((mile - a.mile) / (b.mile - a.mile), 0), 1);
    return a.ft + (b.ft - a.ft) * w;
  };

  const nearest = (mile: number) => stations.reduce((b, s) => (Math.abs(s.mile - mile) < Math.abs(b.mile - mile) ? s : b), stations[0]);
  const touch = useRef<{ x: number; moved: boolean } | null>(null);
  const select = (locX: number) => {
    const mile = Math.min(Math.max(viewStart + ((locX - PAD.left) / plotW) * viewSpan, 0), 100);
    if (onSelectStation) onSelectStation(nearest(mile).id);
    else setProbe(mile);
  };
  // In selectable mode a touch only selects on a tap or a horizontal drag, so a vertical pull-down
  // gesture on the parent never changes the selected station.
  const onGrant = (e: GestureResponderEvent) => {
    touch.current = { x: e.nativeEvent.locationX, moved: false };
    if (!onSelectStation) select(e.nativeEvent.locationX);
  };
  const onMove = (e: GestureResponderEvent) => {
    if (!touch.current) return;
    if (!onSelectStation) return select(e.nativeEvent.locationX);
    if (Math.abs(e.nativeEvent.locationX - touch.current.x) > 6) {
      touch.current.moved = true;
      select(e.nativeEvent.locationX);
    }
  };
  const onRelease = () => {
    if (onSelectStation && touch.current && !touch.current.moved) select(touch.current.x);
    touch.current = null;
    if (!onSelectStation) setProbe(null);
  };

  const yTicks: number[] = [];
  if (selectable) [6000, 8000, 10000].forEach((v) => v >= yMin && v <= yMax && yTicks.push(v));
  else for (let v = yMin; v <= yMax; v += 1000) yTicks.push(v);
  const tickStep = viewSpan > 70 ? (selectable ? 25 : 20) : viewSpan > 30 ? 10 : 5;
  const xTicks: number[] = [];
  for (let m = Math.ceil(viewStart / tickStep) * tickStep; m <= viewStart + viewSpan + 0.001; m += tickStep) xTicks.push(m);
  const near = probe == null ? null : stations.find((s) => Math.abs(s.mile - probe) < 1.2);
  const active = stations.find((s) => s.id === activeStationId) ?? null;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {!selectable && <View style={styles.readout}>
        {probe == null ? (
          <Text style={[styles.readText, { color: t.muted }]}>Touch and drag the chart to read elevation</Text>
        ) : (
          <Text style={[styles.readText, { color: t.text }]}>
            Mile {probe.toFixed(1)} · {Math.round(elevAt(probe)).toLocaleString()} ft{near ? ` · ${near.name}` : ''}
          </Text>
        )}
      </View>}
      {width > 0 && (
        <View onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={onGrant} onResponderMove={onMove} onResponderRelease={onRelease} onResponderTerminate={() => (touch.current = null)}>
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={dark ? '#ffffff' : t.accent} stopOpacity={dark ? 0.28 : 0.55} />
                <Stop offset="1" stopColor={dark ? '#ffffff' : t.accent} stopOpacity={0} />
              </LinearGradient>
              <ClipPath id="plot">
                <Rect x={PAD.left} y={0} width={plotW} height={HEIGHT} />
              </ClipPath>
            </Defs>
            {yTicks.map((v) => (
              <G key={v}>
                <Line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={t.border} strokeWidth={1} strokeDasharray={selectable ? '2 4' : undefined} />
                <SvgText x={PAD.left - 8} y={y(v) + 3.5} fontSize={10} fill={t.muted} textAnchor="end">
                  {`${v / 1000}k`}
                </SvgText>
              </G>
            ))}
            {xTicks.map((m) => (
              <SvgText key={m} x={x(m)} y={HEIGHT - 8} fontSize={10} fill={t.muted} textAnchor="middle">
                {m}
              </SvgText>
            ))}
            <G clipPath="url(#plot)">
              <Path d={area} fill="url(#fill)" />
              <Path d={line} stroke={t.accent} strokeWidth={selectable ? 2.5 : 2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </G>
            {stations.filter((st) => inView(st.mile)).map((st) => (
              <Circle
                key={st.id}
                cx={x(st.mile)}
                cy={y(elevAt(st.mile))}
                r={st.id === activeStationId ? 0 : selectable ? 3 : 3.5}
                fill={dark ? BRAND_BLUE : t.card}
                stroke={st.kind === 'cutoff' ? t.amber : dark ? '#ffffff' : t.primary}
                strokeWidth={selectable ? 1.75 : 2}
              />
            ))}
            {active && (() => {
              const ax = x(active.mile);
              const ay = y(elevAt(active.mile));
              const label = `${shortName(active.name)} · mi ${active.mile}`;
              const w = label.length * 6.6 + 18;
              const lx = Math.min(Math.max(ax - w / 2, PAD.left - 30), width - PAD.right - w);
              return (
                <G>
                  <Line x1={ax} x2={ax} y1={PAD.top - 4} y2={y(yMin)} stroke={dark ? '#ffffff' : t.accent} strokeOpacity={dark ? 0.55 : 1} strokeWidth={1.25} strokeDasharray="3 3" />
                  <Rect x={lx} y={4} width={w} height={22} rx={11} fill={dark ? '#ffffff' : t.accent} />
                  <SvgText x={lx + w / 2} y={19} fontSize={12} fontWeight="700" fill={dark ? BRAND_BLUE : theme.accentText} textAnchor="middle">
                    {label}
                  </SvgText>
                  <Circle cx={ax} cy={ay} r={11} fill={t.accent} opacity={0.22} />
                  <Circle cx={ax} cy={ay} r={6} fill={t.accent} stroke="#ffffff" strokeWidth={2.5} />
                </G>
              );
            })()}
            {probe != null && (
              <G>
                <Line x1={x(probe)} x2={x(probe)} y1={PAD.top} y2={y(yMin)} stroke={t.primary} strokeWidth={1.5} />
                <Circle cx={x(probe)} cy={y(elevAt(probe))} r={5} fill={t.primary} />
              </G>
            )}
          </Svg>
        </View>
      )}
      {!selectable && <Text style={[styles.axis, { color: t.muted }]}>Miles</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { height: 24, justifyContent: 'center', paddingHorizontal: 4 },
  readText: { fontSize: 13, fontWeight: '700' },
  axis: { fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: -2 },
});
