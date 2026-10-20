// src/components/ui/logoGeometry.js
//
// The REE.ai mark: one source of truth for its geometry and colours, shared
// by <Logo>, the app-icon builder (scripts/brand/build-icons.mjs) and the
// fidelity check against the original artwork (scripts/brand/logo-fidelity.mjs).
//
// Every coordinate is on the original 1080×1080 artwork
// (design/brand/logo-source.png), measured from it and then cleaned up:
//   • the triangle is equilateral (edges at exactly ±60°, apex at 540,267);
//   • one gap width everywhere (24) and one stem width (58), each stem
//     parallel to the edge it follows;
//   • the gear is regular (8 teeth on 45°), with one clearance circle that
//     bites the top piece and the S alike;
//   • the bolt's opposite edges are parallel and its tips sit where drawn;
//   • the chip's walls repeat the notch it sits in (60° left, 45° right).
// The trefoil behind the letters only ever shows through them, so it is kept
// as the shape traced from the artwork and clipped to the letterforms.
//
// Pure data and string-building: no React, so Node scripts import it as is.

const T = Math.tan(Math.PI / 6); // the 60° edges: dx per unit of dy
const CX = 540;
const APEX = 267; // where the two edges would meet
const STEM = 58; // horizontal width of a stem that follows an edge
const xL = (y) => CX - (y - APEX) * T;
const xR = (y) => CX + (y - APEX) * T;

export const LOGO_VIEWBOX = '210 174 660 660';

/** Fixed brand colours. Only the ink (letterforms, gear, chip frame) follows the theme. */
export const LOGO_COLORS = {
  ink: '#ffffff',
  inkOnLight: '#0b0f1a',
  bolt: '#FDFC4A',
  boltCore: '#FEFD94',
  boltFlame: '#DE8218',
  boltAmber: '#FABC21',
  red: '#F20606',
  redShadow: '#E50F07',
  veil: '#FBFC3D',
  keyline: '#B45309',
};

// The gear and the clearance circle around it.
export const GEAR = { cx: 667.6, cy: 526.5, tip: 42.5, root: 32, hub: 11.9, bite: 50.5, teeth: 8 };

const f = (n) => Math.round(n * 10) / 10;
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
const poly = (points) => `M${points.map(pt).join('L')}Z`;

// The top piece's lower right is one cut parallel to the left edge.
const cutX = (y) => 628 - (y - 505) * T;
// Where a line x = a - T·y meets the gear's clearance circle (upper, lower).
function cutMeetsBite(a) {
  const { cx, cy, bite } = GEAR;
  const k = a - cx;
  const A = 1 + T * T;
  const B = -2 * (k * T + cy);
  const C = k * k + cy * cy - bite * bite;
  const d = Math.sqrt(B * B - 4 * A * C);
  return [(-B - d) / (2 * A), (-B + d) / (2 * A)].map((y) => [a - T * y, y]);
}

function topPiece() {
  const yC = 44 / T + 386; // the cut meets the right edge
  const [e1, e2] = cutMeetsBite(628 + 505 * T);
  const outer = `M${pt([xL(353), 353])}L${pt([xR(353), 353])}L${pt([xR(yC), yC])}L${pt(e1)}`
    + `A${GEAR.bite} ${GEAR.bite} 0 0 0 ${pt(e2)}L${pt([cutX(550), 550])}L${pt([xL(550), 550])}Z`;
  // The counter: the D's hole, its lower right cut by a stem parallel to the cut.
  const counter = poly([
    [xL(407) + STEM, 407], [xR(407) - STEM, 407], [xR(yC) - STEM, yC],
    [cutX(496) - STEM, 496], [xL(496) + STEM, 496],
  ]);
  return outer + counter;
}

function rPiece() {
  const outer = poly([
    [xL(574), 574], [528, 574], [528, 680], [491, 717], [528, 754], [528, 809],
    [476, 809], [476, 779], [440, 743], [xL(743) + STEM, 743], [xL(809) + STEM, 809], [xL(809), 809],
  ]);
  const counter = poly([[xL(627) + STEM, 627], [476, 627], [476, 655], [441, 690], [xL(690) + STEM, 690]]);
  return outer + counter;
}

function sPiece() {
  const { cx, cy, bite } = GEAR;
  const half = Math.sqrt(bite * bite - (574 - cy) ** 2);
  return `M552 574L${f(cx - half)} 574A${bite} ${bite} 0 0 0 ${f(cx + half)} 574`
    + `L${pt([xR(574), 574])}L${pt([xR(642), 642])}L700 642L683 625L605 625L605 664`
    + `L${pt([xR(664), 664])}L${pt([xR(809), 809])}L552 809L552 740L605 740L605 756`
    + `L${pt([xR(756) - STEM, 756])}L${pt([xR(717) - STEM, 717])}L552 717Z`;
}

function gearPath() {
  const { cx, cy, tip, root, teeth } = GEAR;
  const at = (deg, r) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const step = 360 / teeth;
  let d = '';
  for (let k = 0; k < teeth; k += 1) {
    const c = k * step;
    const pts = [at(c - 15, root), at(c - 12.5, tip), at(c + 12.5, tip), at(c + 15, root)];
    d += k === 0 ? `M${pt(pts[0])}` : `A${root} ${root} 0 0 1 ${pt(pts[0])}`;
    d += `L${pt(pts[1])}A${tip} ${tip} 0 0 1 ${pt(pts[2])}L${pt(pts[3])}`;
  }
  const first = at(-15, root);
  return `${d}A${root} ${root} 0 0 1 ${pt(first)}Z`;
}

// The bolt, as drawn: its outer edges run parallel to the triangle's left
// edge, its inner edges parallel to each other, the shelves parallel; both
// ends are rounded caps. Lines are x = x0 - (y - y0)·slope.
const INNER = 0.312; // slope of the inner edges
const boltEdge = {
  upperLeft: (y) => 568 - (y - 214) * T,
  upperRight: (y) => 556 + (291 - y) * INNER,
  lowerRight: (y) => 558 - (y - 361) * T,
  lowerLeft: (y) => 544 - (y - 336) * INNER,
};
const BOLT_OUTLINE = [
  [boltEdge.upperRight(214), 214], [556, 291], [596.4, 286.4], [boltEdge.lowerRight(431), 431],
  [boltEdge.lowerLeft(431), 431], [544, 336], [500.5, 342.3], [boltEdge.upperLeft(339), 339], [568, 214],
];

// The two shelf corners (BOLT_OUTLINE[2], [6]) are drawn rounded.
function boltPath() {
  const [tr, ir, , br, bl, il, , ul, tl] = BOLT_OUTLINE;
  return `M${pt(tl)}C569.5 205 577 201 ${pt(tr)}L${pt(ir)}L593 286.8Q598.5 286 ${pt([boltEdge.lowerRight(296), 296])}`
    + `L${pt(br)}Q516.5 440 ${pt(bl)}L${pt(il)}L503 341.9Q497 343.5 ${pt(ul)}Z`;
}

// The pale core: the bolt pulled 7 units in from every edge.
function insetPolygon(points, d) {
  const n = points.length;
  let area = 0;
  for (let i = 0; i < n; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  const s = area > 0 ? 1 : -1;
  const lines = points.map((p, i) => {
    const q = points[(i + 1) % n];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy);
    return { p: [p[0] - (dy / len) * s * d, p[1] + (dx / len) * s * d], u: [dx / len, dy / len] };
  });
  return lines.map((l, i) => {
    const m = lines[(i + n - 1) % n];
    const det = m.u[0] * -l.u[1] + l.u[0] * m.u[1];
    const t = ((l.p[0] - m.p[0]) * -l.u[1] + l.u[0] * (l.p[1] - m.p[1])) / det;
    return [m.p[0] + t * m.u[0], m.p[1] + t * m.u[1]];
  });
}

// The red edge along each right-hand edge of the bolt, tapering as drawn:
// the bolt's shadow side.
function edgeBand(edge, y0, y1, w0, w1) {
  const at = (y, w) => [edge(y) - w, y];
  return poly([at(y0, 0), at(y1, 0), at(y1, w1), at(y0, w0)]);
}

function chipTicks() {
  let d = '';
  for (let k = 0; k < 13; k += 1) {
    const x = 318.5 + 10 * k;
    const h = k % 2 ? 10.5 : 5;
    const top = 806 - h;
    d += `M${f(x)} 806V${f(top + 3.5)}a3.5 3.5 0 0 1 7 0V806Z`;
  }
  return d;
}

// The trefoil, as traced from the artwork; shown only through the letters.
const VEIL = 'M497 566c-17-1-81 0-98 1c-17 1-5 4-4 5c1 1 6-1 7 0c1 1 4 0 1 6c-3 6-14 25-18 30c-4 5-4 5-5-1c-1-6-4-28-3-34c1-6 6 0 7-1c1-1 4-4 0-5c-4-1-19-1-23-1c-4 0-2 0-3 3c-1 3-3 13-3 14c0 1 3-9 5-10c2-1 6-6 5 1c-1 7-7 21-8 40c-1 19 3 63 5 76c2 13 4-3 7 1c3 4 5 16 9 24c4 8 15 19 18 24c3 5 0 4-1 5c-1 1-6-1-7 0c-1 1-2 4 3 5c5 1 21 2 25 1c4-1 1-5 0-6c-1-1-4 5-7-2c-3-7-8-33-10-42c-2-9-1-8 0-10c1-2 6 0 7-1c1-1 6-4 0-5c-6-1-34 7-35-1c-1-8 17-41 26-49c9-8 25-1 31-2c6-1 5-4 4-5c-1-1-6 1-8 0c-2-1-3-3-1-6c2-3 9-7 15-10c6-3 12-5 19-7c7-2 13-4 22-2c9 2 23 7 31 12c8 5 16 12 19 16c3 4-1 5 0 6c1 1 5 5 6 0c1-5 1-24 0-30c-1-6-5-4-6-3c-1 1 0 7-1 8c-1 1-2 2-7-1c-5-3-18-13-23-18c-5-5-5-10-6-13c-1-3-1-5 0-6c1-1 6 0 7-1c1-1 15-5-2-6zM545 816c4 3 17 1 26 0c9-1 23-5 25-6c2-1-10 1-12 0c-2-1-9-1-1-5c8-4 38-13 51-19c13-6 19-13 25-18c6-5 7-11 10-13c3-2 5 1 6 0c1-1 11-5 0-6c-11-1-52 3-63 0c-11-3 8-13-3-16c-11-3-53-7-64 0c-11 7 0 36 1 43c1 7 3 2 4 1c1-1-8-7 1-8c9-1 43 3 52 4c9 1 6-1 0 4c-6 5-26 19-35 23c-9 4-14 5-17 4c-3-1 0-7-1-8c-1-1-4-1-5 2c-1 3-4 15 0 18zM544 607c-1 6-1 27 0 33c1 6 5 1 6 0c1-1-3-2 0-6c3-4 10-12 17-16c7-4 17-10 25-11c8-1 16 2 21 4c5 2 7 5 9 7c2 2 4 7 3 8c-1 1-8-1-9 0c-1 1-3 5 4 6c7 1 29 2 36 1c7-1 5-5 5-6c0-1-6 1-7 0c-1-1-2-1-1-5c1-4 8-14 10-21c2-7 0-20 1-24c1-4 6 0 7-1c1-1 3-4 0-6c-3-2-3-3-16-4c-13-1-49-1-59 0c-10 1-4 5-4 6c0 1 6-1 7 0c1 1 4 0 1 5c-3 5-12 17-19 23c-7 6-19 10-24 12c-5 2-5 1-6 0c-1-1 0-6-1-7c-1-1-5-4-6 2zM583 446c-5 2 2 11 0 16c-2 5-8 10-10 16c-2 6-1 16 0 18c1 2 2-5 3-6c1-1 3-1 5 0c2 1 4 2 7 7c3 5 10 15 13 23c3 8 2 22 4 27c2 5 7 2 10 0c3-2 5-5 8-12c3-7 4-20 9-28c5-8 16-15 19-22c3-7 1-15 0-17c-1-2 4 9-4 7c-8-2-39-17-46-21c-7-4-1-4 1-5c2-1 16 1 13 0c-3-1-27-5-32-3zM517 551c0-1-8 0-10-1c-2-1-1-2 0-4c1-2 7-4 8-5c1-1 5-3-2-4c-7-1-29-4-40-4c-11 0-19 4-25 6c-6 2-10 5-13 7c-3 2-1 4-2 5c-1 1-5-1-6 0c-1 1-13 4 0 5c13 1 65 2 80 1c15-1 10-5 10-6zM477 694c-3 2 3 16 5 22c2 6 6 12 10 17c4 5 10 12 16 16c6 4 16 5 20 8c4 3 0 6 1 7c1 1 4 3 5 0c1-3 4-12-1-19c-5-7-25-19-29-26c-4-7 3-17 2-19c-1-2-2 5-7 4c-5-1-19-12-22-10zM726 659c-3 0-17 2-19 3c-2 1 6 2 7 3c1 1 8-4 0 5c-8 9-37 40-46 48c-9 8-5-1-6 0c-1 1-8 5 0 6c8 1 38 0 46-1c8-1 4-4 3-5c-1-1-6 1-7 0c-1-1-3-1-1-6c2-5 8-14 11-22c3-8 3-21 5-25c2-4 6 0 7-1c1-1 3-5 0-5zM544 692c-1 5-5 26 0 31c5 5 24 2 29 1c5-1 1-5 0-6c-1-1-3 2-7-1c-4-3-13-15-16-19c-3-4 1 -5 0-6c-1-1-5-5-6 0zM374 532c-2 1-4 4-5 8c-1 4-3 14 0 17c3 3 15 1 18 0c3-1 4-5 3-6c-1-1-7 2-8-1c-1-3 3-15 2-18c-1-3-8-1-10 0zM481 445c-1 2 6 8 7 11c1 3-3 5-2 6c1 1 8 3 10 0c2-3 2-14 0-17c-2-3-14-2-15 0z';

/** Path data for every part of the mark, built once. */
export const LOGO_PATHS = (() => {
  // Straight-edged stand-in for the core: the outline without its caps.
  const core = insetPolygon(BOLT_OUTLINE.slice(0, 8), 7);
  return {
    top: topPiece(),
    r: rPiece(),
    s: sPiece(),
    gear: gearPath(),
    bolt: boltPath(),
    boltCore: poly(core),
    boltShadow: edgeBand(boltEdge.upperRight, 246, 290, 4, 8.5) + edgeBand(boltEdge.lowerRight, 298, 396, 5, 9.5)
      // The ember at the very tip.
      + 'M573.5 205.5C575.5 203 578.6 203.2 580.3 205.2L579.6 212.4C578.4 210.6 576 209.4 573.5 209.8Z',
    // One red trapezoid (60° left wall, 45° right), split by the ruler's
    // top rule and clipped by its frame below.
    chipBody: poly([[338, 766], [429, 766], [447, 784], [338 - 18 * T, 784]])
      + poly([[338 - 22 * T, 788], [450, 788], [450, 806], [338 - 40 * T, 806]]),
    chipTicks: chipTicks(),
    veil: VEIL,
  };
})();

/** The parts of the mark, back to front, for a given detail level. */
export function logoLayers(detail = 'full') {
  const small = detail === 'small';
  return { ticks: !small, boltCore: !small, flame: !small };
}

/**
 * The mark as a standalone SVG string (icons, favicons, the fidelity check).
 * @param {{ ink?: string, detail?: 'full'|'small', keyline?: string|null, background?: string|null,
 *   radius?: number, viewBox?: string, size?: number, padding?: number }} [opts]
 *   background + radius: a rounded tile behind the mark (radius as a share of the side);
 *   padding: extra space around the mark, as a share of the side.
 */
export function logoSvg({
  ink = LOGO_COLORS.ink, detail = 'full', keyline = null, background = null,
  radius = 0, viewBox = LOGO_VIEWBOX, size = null, padding = 0,
} = {}) {
  const c = LOGO_COLORS;
  const p = LOGO_PATHS;
  const layers = logoLayers(detail);
  let [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);
  if (padding) {
    const extra = (vw * padding) / (1 - 2 * padding);
    vx -= extra; vy -= extra; vw += 2 * extra; vh += 2 * extra;
  }
  const dim = size ? ` width="${size}" height="${size}"` : '';
  const tile = background
    ? `<rect x="${f(vx)}" y="${f(vy)}" width="${f(vw)}" height="${f(vh)}" rx="${f(vw * radius)}" fill="${background}"/>`
    : '';
  const stroke = keyline ? ` stroke="${keyline}" stroke-width="8" stroke-linejoin="round" paint-order="stroke"` : '';
  const boltFill = layers.flame ? 'url(#ree-bolt)' : c.bolt;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(vx)} ${f(vy)} ${f(vw)} ${f(vh)}"${dim}>`
    + `<defs><clipPath id="ree-letters"><path clip-rule="evenodd" d="${p.top}"/><path clip-rule="evenodd" d="${p.r}"/><path d="${p.s}"/></clipPath>`
    + `<linearGradient id="ree-bolt" gradientUnits="userSpaceOnUse" x1="0" y1="202" x2="0" y2="262"><stop offset="0" stop-color="${c.boltFlame}"/><stop offset="0.35" stop-color="${c.boltAmber}"/><stop offset="1" stop-color="${c.bolt}"/></linearGradient></defs>`
    + tile
    + `<g fill="${ink}"><path fill-rule="evenodd" d="${p.top}"/><path fill-rule="evenodd" d="${p.r}"/><path d="${p.s}"/><path d="${p.gear}"/></g>`
    + `<path clip-path="url(#ree-letters)" fill="${c.veil}" opacity="0.9" d="${p.veil}"/>`
    + `<circle cx="${GEAR.cx}" cy="${GEAR.cy}" r="${GEAR.hub}" fill="${c.red}"/>`
    + `<path fill="${c.red}" d="${p.chipBody}"/>`
    + (layers.ticks ? `<path fill="#ffffff" d="${p.chipTicks}"/>` : '')
    + `<rect x="313.5" y="787.5" width="139" height="19.5" fill="none" stroke="${ink}" stroke-width="3"/>`
    + `<path fill="${boltFill}" d="${p.bolt}"${stroke}/>`
    + (layers.boltCore ? `<path fill="${c.boltCore}" d="${p.boltCore}"/>` : '')
    + `<path fill="${c.redShadow}" d="${p.boltShadow}"/>`
    + '</svg>';
}
