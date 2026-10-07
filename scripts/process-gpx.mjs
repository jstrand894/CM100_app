// Converts data/CM100.gpx into src/data/course.json (simplified track + cumulative miles)
// and copies the full GPX to assets/ for in-app download/sharing.
import fs from 'node:fs';

const gpx = fs.readFileSync('data/CM100.gpx', 'utf8');
const pts = [...gpx.matchAll(/<trkpt lat="([-\d.]+)" lon="([-\d.]+)"/g)].map((m) => [+m[1], +m[2]]);

const R = 6371000;
const rad = (x) => (x * Math.PI) / 180;
const dist = (a, b) => {
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Douglas-Peucker on a local equirectangular projection (meters)
const lat0 = pts[0][0];
const proj = ([la, lo]) => [lo * Math.cos(rad(lat0)) * 111320, la * 110540];
const xy = pts.map(proj);
const keep = new Uint8Array(pts.length);
keep[0] = keep[pts.length - 1] = 1;
const stack = [[0, pts.length - 1]];
const TOL = 4; // meters
while (stack.length) {
  const [s, e] = stack.pop();
  let max = 0, idx = -1;
  const [ax, ay] = xy[s], [bx, by] = xy[e];
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  for (let i = s + 1; i < e; i++) {
    const d = Math.abs(dy * xy[i][0] - dx * xy[i][1] + bx * ay - by * ax) / len;
    if (d > max) { max = d; idx = i; }
  }
  if (max > TOL) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
}

let cum = 0;
const cumulative = [0];
for (let i = 1; i < pts.length; i++) cumulative.push((cum += dist(pts[i - 1], pts[i])));

const coords = [];
pts.forEach((p, i) => { if (keep[i]) coords.push([+p[0].toFixed(5), +p[1].toFixed(5), +(cumulative[i] / 1609.344).toFixed(2)]); });

const lats = pts.map((p) => p[0]), lons = pts.map((p) => p[1]);
const out = {
  name: 'Crazy Mountain 100',
  totalMiles: +(cum / 1609.344).toFixed(1),
  bounds: { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLon: Math.min(...lons), maxLon: Math.max(...lons) },
  // [lat, lon, cumulativeMiles]
  coordinates: coords,
};
fs.writeFileSync('src/data/course.json', JSON.stringify(out));
fs.mkdirSync('assets/data', { recursive: true });
fs.copyFileSync('data/CM100.gpx', 'assets/data/CM100.gpx');
console.log(`${pts.length} pts -> ${coords.length} pts, ${out.totalMiles} mi`);
