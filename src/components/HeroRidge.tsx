import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import elevation from '../data/elevation.json';

// The real course elevation profile, drawn as a soft ridgeline for the Home header.
const W = 200;
const H = 60;
const STEP = 4; // ~90 points is plenty at this size
const sampled = (elevation.profile as number[][]).filter((_, i) => i % STEP === 0);
// Two light smoothing passes so the horizon reads as soft hills, not jagged teeth.
const smooth = (a: number[][]) => a.map(([mi, ft], i) => [mi, (a[Math.max(i - 1, 0)][1] + ft * 2 + a[Math.min(i + 1, a.length - 1)][1]) / 4]);
const pts = smooth(smooth(sampled));
const lo = elevation.minFt;
const span = elevation.maxFt - elevation.minFt;

function ridge(reverse: boolean, amplitude: number, base: number): string {
  const src = reverse ? [...pts].reverse() : pts;
  const last = src.length - 1;
  const line = src.map(([, ft], i) => {
    const x = (i / last) * W;
    const y = base - ((ft - lo) / span) * amplitude;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `${line.join(' ')} L${W} ${H} L0 ${H} Z`;
}

// Solid versions of the two blue tints over the cream hero, so the front color can continue below the mountains.
const RIDGE_BACK = '#eaece8';
export const RIDGE_FRONT = '#d0d9da';

const BACK = ridge(true, 34, 44);
const FRONT = ridge(false, 30, 54);

export function HeroRidge({ height }: { height: number }) {
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Path d={BACK} fill={RIDGE_BACK} />
        <Path d={FRONT} fill={RIDGE_FRONT} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { position: 'absolute', left: 0, right: 0 } });
