export type Side = 'right' | 'left' | 'above' | 'below';

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

// Picks which side of each station point its name goes on, so labels stay off the trail and off each other.
// `trail` and the points are in the same screen-like coordinates; `w` is the label's estimated width.
export function placeLabels(
  points: { id: string; x: number; y: number; w: number; h?: number }[],
  trail: { x: number; y: number }[],
  box: { W: number; H: number },
): Record<string, Side> {
  const out: Record<string, Side> = {};
  const used: Rect[] = [];
  const rectFor = (p: { x: number; y: number; w: number; h?: number }, side: Side): Rect => {
    const h = p.h ?? 18;
    const gap = 12;
    if (side === 'right') return { x0: p.x + gap, y0: p.y - h / 2, x1: p.x + gap + p.w, y1: p.y + h / 2 };
    if (side === 'left') return { x0: p.x - gap - p.w, y0: p.y - h / 2, x1: p.x - gap, y1: p.y + h / 2 };
    if (side === 'above') return { x0: p.x - p.w / 2, y0: p.y - gap - h, x1: p.x + p.w / 2, y1: p.y - gap };
    return { x0: p.x - p.w / 2, y0: p.y + gap, x1: p.x + p.w / 2, y1: p.y + gap + h };
  };
  const hits = (r: Rect) => trail.reduce((n, q) => (q.x >= r.x0 - 3 && q.x <= r.x1 + 3 && q.y >= r.y0 - 3 && q.y <= r.y1 + 3 ? n + 1 : n), 0);
  const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  for (const p of points) {
    let best: Side = 'right';
    let bestScore = Infinity;
    for (const side of ['right', 'left', 'above', 'below'] as Side[]) {
      const r = rectFor(p, side);
      let score = hits(r);
      if (r.x0 < 0 || r.x1 > box.W || r.y0 < 0 || r.y1 > box.H) score += 50;
      if (used.some((u) => overlaps(u, r))) score += 30;
      if (score < bestScore) {
        bestScore = score;
        best = side;
      }
    }
    out[p.id] = best;
    used.push(rectFor(p, best));
  }
  return out;
}
