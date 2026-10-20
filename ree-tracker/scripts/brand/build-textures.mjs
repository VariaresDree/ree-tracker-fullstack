// scripts/brand/build-textures.mjs
//
// Writes the page textures' tiles (public/textures/*.svg). Each tile is a
// one-colour shape used as a CSS mask: styles/index.css paints it in the
// theme's --texture-ink at --texture-opacity, so one tile serves any colour.
// The simple patterns (dot grid, graph paper, scanlines, blueprint grid) are
// CSS gradients and have no file.
//
// Tiles repeat edge to edge: a shape that crosses an edge is drawn again on
// the far side, and line patterns leave each edge where they enter the next
// tile. Shapes come from a seeded generator, so a rerun writes the same files.
//
//   node scripts/brand/build-textures.mjs          (from ree-tracker/)
//
// Dev-only: nothing here ships but its output.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = resolve(root, 'public/textures');
mkdirSync(out, { recursive: true });

const f = (n) => String(Math.round(n * 10) / 10);
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}" height="${f(h)}" viewBox="0 0 ${f(w)} ${f(h)}">${body}</svg>\n`;
// Copies of a shape at (x, y) reaching r past an edge, so the tile wraps.
const wrap = (x, y, r, w, h) => {
  const xs = [x, ...(x < r ? [x + w] : []), ...(x > w - r ? [x - w] : [])];
  const ys = [y, ...(y < r ? [y + h] : []), ...(y > h - r ? [y - h] : [])];
  return xs.flatMap((a) => ys.map((b) => [a, b]));
};
// Spread points with a minimum gap (on the torus, so the tile wraps too).
function scatter(rand, n, w, h, gap) {
  const pts = [];
  for (let tries = 0; pts.length < n && tries < n * 200; tries += 1) {
    const p = [rand() * w, rand() * h];
    const ok = pts.every(([x, y]) => {
      const dx = Math.min(Math.abs(x - p[0]), w - Math.abs(x - p[0]));
      const dy = Math.min(Math.abs(y - p[1]), h - Math.abs(y - p[1]));
      return Math.hypot(dx, dy) >= gap;
    });
    if (ok) pts.push(p);
  }
  return pts;
}

const tiles = {};

// Midnight: sparse stars, a few brighter ones.
{
  const rand = rng(11);
  const W = 280;
  const stars = scatter(rand, 16, W, W, 48).map(([x, y], i) => ({ x, y, r: i < 3 ? 1.3 : 0.55 + rand() * 0.45 }));
  tiles.stars = svg(W, W, stars.flatMap(({ x, y, r }) => wrap(x, y, r, W, W).map(([a, b]) => `<circle cx="${f(a)}" cy="${f(b)}" r="${f(r)}"/>`)).join(''));
}

// Paper: short fibres, every way.
{
  const rand = rng(23);
  const W = 220;
  const d = [];
  for (const [x, y] of scatter(rand, 34, W, W, 22)) {
    const a = rand() * Math.PI;
    const len = 7 + rand() * 9;
    const bend = (rand() - 0.5) * 6;
    const [dx, dy] = [Math.cos(a) * len / 2, Math.sin(a) * len / 2];
    for (const [cx, cy] of wrap(x, y, len / 2, W, W)) {
      d.push(`M${f(cx - dx)} ${f(cy - dy)}q${f(dx - dy * bend / len)} ${f(dy + dx * bend / len)} ${f(2 * dx)} ${f(2 * dy)}`);
    }
  }
  tiles.fibre = svg(W, W, `<path d="${d.join('')}" fill="none" stroke="#000" stroke-width=".7" stroke-linecap="round"/>`);
}

// Cyberpunk: a honeycomb of pointy-top hexagons.
{
  const s = 16;
  const w = Math.sqrt(3) * s;
  const h = 3 * s;
  tiles.hex = svg(w, h, `<path d="M${f(w / 2)} 0L${f(w)} ${f(s / 2)}V${f(1.5 * s)}L${f(w / 2)} ${f(2 * s)}L0 ${f(1.5 * s)}V${f(s / 2)}ZM${f(w / 2)} ${f(2 * s)}V${f(h)}" fill="none" stroke="#000" stroke-width="1"/>`);
}

// Forest: topographic contours, traced from a height field that repeats with
// the tile (marching squares, joined into lines and thinned).
{
  const W = 240;
  const N = 48;
  const rand = rng(37);
  const waves = Array.from({ length: 5 }, () => ({
    k: 1 + Math.floor(rand() * 2), l: Math.floor(rand() * 3) - 1, ph: rand() * Math.PI * 2, a: 0.5 + rand(),
  }));
  const field = (x, y) => waves.reduce((t, { k, l, ph, a }) => t + a * Math.sin((2 * Math.PI * (k * x + l * y)) / W + ph)
    + 0.6 * a * Math.cos((2 * Math.PI * (l * x - k * y)) / W + ph * 1.7), 0);
  const step = W / N;
  const at = (i, j) => field(i * step, j * step);
  const vals = [];
  for (let j = 0; j <= N; j += 1) for (let i = 0; i <= N; i += 1) vals.push(at(i, j));
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const levels = Array.from({ length: 7 }, (_, k) => lo + ((k + 1) * (hi - lo)) / 8);
  const key = ([x, y]) => `${Math.round(x * 100)},${Math.round(y * 100)}`;
  const lines = [];
  for (const L of levels) {
    const segs = [];
    for (let j = 0; j < N; j += 1) {
      for (let i = 0; i < N; i += 1) {
        const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => ({ x: a * step, y: b * step, v: at(a, b) }));
        const cross = [];
        for (let e = 0; e < 4; e += 1) {
          const p = c[e];
          const q = c[(e + 1) % 4];
          if ((p.v < L) !== (q.v < L)) {
            const t = (L - p.v) / (q.v - p.v);
            cross.push([p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t]);
          }
        }
        if (cross.length === 2) segs.push(cross);
        else if (cross.length === 4) segs.push([cross[0], cross[1]], [cross[2], cross[3]]);
      }
    }
    // Join segments into polylines.
    const ends = new Map();
    segs.forEach((s, n) => s.forEach((p) => { const k = key(p); ends.set(k, [...(ends.get(k) || []), n]); }));
    const used = new Set();
    for (let n = 0; n < segs.length; n += 1) {
      if (used.has(n)) continue;
      used.add(n);
      const line = [...segs[n]];
      for (const dir of [1, 0]) {
        for (;;) {
          const tip = dir ? line[line.length - 1] : line[0];
          const next = (ends.get(key(tip)) || []).find((m) => !used.has(m));
          if (next === undefined) break;
          used.add(next);
          const [a, b] = segs[next];
          const far = key(a) === key(tip) ? b : a;
          if (dir) line.push(far); else line.unshift(far);
        }
      }
      lines.push(line);
    }
  }
  // Thin each line (Ramer–Douglas–Peucker, 0.6 px).
  const thin = (pts) => {
    if (pts.length < 3) return pts;
    const [a, b] = [pts[0], pts[pts.length - 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let far = 0; let at2 = 0;
    for (let i = 1; i < pts.length - 1; i += 1) {
      const d = Math.abs((b[0] - a[0]) * (a[1] - pts[i][1]) - (a[0] - pts[i][0]) * (b[1] - a[1])) / len;
      if (d > far) { far = d; at2 = i; }
    }
    return far > 0.6 ? [...thin(pts.slice(0, at2 + 1)).slice(0, -1), ...thin(pts.slice(at2))] : [a, b];
  };
  const d = lines.filter((l) => l.length > 2).map((l) => thin(l).map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('')).join('');
  tiles.topo = svg(W, W, `<path d="${d}" fill="none" stroke="#000" stroke-width=".8" stroke-linejoin="round"/>`);
}

// Ocean: two rows of swell, half a wave apart.
tiles.waves = svg(120, 36, '<path d="M0 9c15 0 15-6 30-6s15 6 30 6 15-6 30-6 15 6 30 6M0 27c15 0 15 6 30 6s15-6 30-6 15 6 30 6 15-6 30-6" fill="none" stroke="#000" stroke-width="1"/>');

// Sakura: scattered petals, each with the notch at its tip.
{
  const rand = rng(53);
  const W = 260;
  const petal = 'M0 0c3-5 9-6 12-3l-1.6 3 1.6 3c-3 3-9 2-12-3z';
  tiles.petals = svg(W, W, scatter(rand, 9, W, W, 70).flatMap(([x, y]) => {
    const a = Math.round(rand() * 360);
    const k = (0.8 + rand() * 0.5).toFixed(2);
    return wrap(x, y, 14, W, W).map(([px, py]) => `<path transform="translate(${f(px)} ${f(py)}) rotate(${a}) scale(${k})" d="${petal}"/>`);
  }).join(''));
}

// Organs: cells, each with its nucleus.
{
  const rand = rng(71);
  const W = 200;
  tiles.cells = svg(W, W, scatter(rand, 10, W, W, 52).flatMap(([x, y]) => {
    const r = 14 + rand() * 8;
    const ry = r * (0.75 + rand() * 0.25);
    const a = Math.round(rand() * 180);
    const [nx, ny] = [(rand() - 0.5) * r * 0.5, (rand() - 0.5) * ry * 0.5];
    return wrap(x, y, r + 1, W, W).map(([px, py]) => `<g transform="translate(${f(px)} ${f(py)}) rotate(${a})"><ellipse rx="${f(r)}" ry="${f(ry)}" fill="none" stroke="#000"/><circle cx="${f(nx)}" cy="${f(ny)}" r="2.6"/></g>`);
  }).join(''));
}

// Electrical: circuit-board traces with 45° bends, vias and pads. Each trace
// leaves the tile at the height (or across) where it came in.
tiles.pcb = svg(160, 160, '<g fill="none" stroke="#000" stroke-width="1.2" stroke-linejoin="round">'
  + '<path d="M0 22h46l14 14h52l12-12h36M0 92h24l18 18h40M118 110h42M0 140h70l10-10h30M80 0v12l10 10M140 0v52l-12 12v40l12 12v44"/>'
  + '<path d="M28 160v-30M28 30v-30M100 160v-24M100 54v-18"/>'
  + '</g><g fill="none" stroke="#000" stroke-width="1.2"><circle cx="86" cy="110" r="3.2"/><circle cx="114" cy="110" r="3.2"/><circle cx="114" cy="130" r="3.2"/><circle cx="28" cy="126" r="3.2"/><circle cx="28" cy="34" r="3.2"/><circle cx="100" cy="132" r="3.2"/><circle cx="100" cy="58" r="3.2"/><circle cx="93" cy="25" r="3.2"/></g>'
  + '<g><circle cx="60" cy="36" r="1.6"/><circle cx="24" cy="92" r="1.6"/><circle cx="140" cy="52" r="1.6"/><circle cx="70" cy="140" r="1.6"/></g>');

// Retrowave: a synth grid in perspective, laid along the bottom of the
// screen and stretched to its width (non-scaling strokes stay 1 px). It
// fades out toward the horizon.
{
  const H = 40;
  const rows = Array.from({ length: 9 }, (_, i) => f(H * ((i + 1) / 9) ** 1.9));
  const cols = Array.from({ length: 17 }, (_, i) => i - 8);
  const d = rows.map((y) => `M0 ${y}H100`).join('')
    + cols.map((c) => `M${f(50 + c * 2.2)} 0L${f(50 + c * 26)} ${H}`).join('');
  tiles['synth-grid'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${H}" preserveAspectRatio="none">`
    + `<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-opacity="0"/><stop offset=".7" stop-opacity="1"/></linearGradient></defs>`
    + `<path d="${d}" fill="none" stroke="url(#f)" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>\n`;
}

for (const [name, body] of Object.entries(tiles)) {
  writeFileSync(resolve(out, `${name}.svg`), body);
  console.log(`wrote public/textures/${name}.svg (${body.length} bytes)`);
}
