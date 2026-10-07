// Looks up USGS 10 m elevations (via OpenTopoData's free "ned10m" dataset) for every point of the
// course GPX, caches the raw result in data/elevation-raw.json, and writes src/data/elevation.json
// (smoothed profile + gain/loss). Re-run only if the GPX changes.
import fs from 'node:fs';

const RAW = 'data/elevation-raw.json';
const gpx = fs.readFileSync('data/CM100.gpx', 'utf8');
const pts = [...gpx.matchAll(/<trkpt lat="([-\d.]+)" lon="([-\d.]+)"/g)].map((m) => [+m[1], +m[2]]);

const R = 6371000, rad = (x) => (x * Math.PI) / 180;
const dist = (a, b) => {
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

let elev; // meters
if (fs.existsSync(RAW)) {
  elev = JSON.parse(fs.readFileSync(RAW, 'utf8'));
  console.log('using cached', elev.length);
} else {
  elev = [];
  for (let i = 0; i < pts.length; i += 100) {
    const batch = pts.slice(i, i + 100);
    const loc = batch.map((p) => `${p[0]},${p[1]}`).join('|');
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`https://api.opentopodata.org/v1/ned10m?interpolation=bilinear&locations=${loc}`);
      if (res.ok) {
        const j = await res.json();
        elev.push(...j.results.map((r) => r.elevation));
        break;
      }
      if (attempt > 4) throw new Error(`HTTP ${res.status} at batch ${i}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
    process.stdout.write(`\r${Math.min(i + 100, pts.length)}/${pts.length}`);
    await new Promise((r) => setTimeout(r, 1100));
  }
  fs.writeFileSync(RAW, JSON.stringify(elev));
  console.log('\nfetched', elev.length);
}

// fill gaps (null = no data), then smooth with a ~150 m moving window
for (let i = 0; i < elev.length; i++) if (elev[i] == null) elev[i] = elev[i - 1] ?? elev.find((x) => x != null);
const cum = [0];
for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
const smooth = elev.map((_, i) => {
  let s = 0, n = 0;
  for (let j = i; j >= 0 && cum[i] - cum[j] <= 75; j--) { s += elev[j]; n++; }
  for (let j = i + 1; j < elev.length && cum[j] - cum[i] <= 75; j++) { s += elev[j]; n++; }
  return s / n;
});

// gain/loss with a hysteresis threshold so DEM noise isn't counted as climbing
const THRESH = 3; // meters
let gain = 0, loss = 0, ref = smooth[0];
for (const e of smooth) {
  if (e - ref >= THRESH) { gain += e - ref; ref = e; }
  else if (ref - e >= THRESH) { loss += ref - e; ref = e; }
}
const ft = (m) => m * 3.28084;

// profile for charting: ~every 0.25 mi
const totalMi = cum[cum.length - 1] / 1609.344;
const profile = [];
let nextMi = 0;
for (let i = 0; i < pts.length; i++) {
  const mi = cum[i] / 1609.344;
  if (mi >= nextMi || i === pts.length - 1) {
    profile.push([+mi.toFixed(2), Math.round(ft(smooth[i]))]);
    nextMi = mi + 0.25;
  }
}
const eFt = smooth.map(ft);
const out = {
  gpxMiles: +totalMi.toFixed(1),
  gainFt: Math.round(ft(gain)),
  lossFt: Math.round(ft(loss)),
  minFt: Math.round(Math.min(...eFt)),
  maxFt: Math.round(Math.max(...eFt)),
  profile, // [gpxMile, elevationFt]
};
fs.writeFileSync('src/data/elevation.json', JSON.stringify(out));
console.log({ ...out, profile: out.profile.length });
