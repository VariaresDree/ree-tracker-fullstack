// src/features/lessons/figures/figureMath.js
//
// The kit's arithmetic and checks, apart from its components (2026-11-19): theme
// colours, arrowheads, tick steps and labels, a plot's samples, a phasor chain's
// ends, and the checks that make a wrong circuit or block diagram fail a test
// instead of drawing nonsense.

export const INK = 'var(--accent)';
export const SIGNAL = 'var(--accent-signal)';
export const GUIDE = 'var(--color-muted2)';
export const TEXT = 'var(--text-main)';
export const MUTED = 'var(--text-muted)';
// Series and vectors in turn: the accent, the signal colour, green, amber.
export const SERIES = ['var(--accent)', 'var(--accent-signal)', 'var(--accent-success)', 'var(--color-reeAmber)'];
// The same hues as TEXT (a label beside its line): the text forms where the theme
// has one, else the hue mixed into the text colour, as Badge does, so a label
// stays readable in every theme (src/test/textColors.test.js).
const mixText = (hue) => `color-mix(in srgb, var(${hue}) 45%, var(--text-main))`;
export const SERIES_TEXT = ['var(--accent-text)', mixText('--accent-signal'), mixText('--accent-success'), 'var(--color-reeAmber-text)'];
export const INK_TEXT = SERIES_TEXT[0];
export const SIGNAL_TEXT = SERIES_TEXT[1];
const wrap = (list, i) => list[((i % list.length) + list.length) % list.length];
export const colourOf = (i) => wrap(SERIES, i);
export const textColourOf = (i) => wrap(SERIES_TEXT, i);

export const FIGURE_TYPES = ['plot', 'phasor', 'circuit', 'blocks'];

/** The points of an arrowhead whose tip is (x2, y2), pointing away from (x1, y1). */
export function headPoints(x1, y1, x2, y2, size = 7) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (t) => `${(x2 - size * Math.cos(a + t)).toFixed(2)},${(y2 - size * Math.sin(a + t)).toFixed(2)}`;
  return `${x2.toFixed(2)},${y2.toFixed(2)} ${p(0.42)} ${p(-0.42)}`;
}

/** Round to a "nice" step (1, 2, 2.5, 5 × 10ⁿ) for ticks. */
export function niceStep(span, count = 5) {
  const raw = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
}

/** A tick label: no float noise, k/M for big numbers. */
export function formatTick(v) {
  if (Math.abs(v) < 1e-12) return '0';
  const a = Math.abs(v);
  if (a >= 1e6) return `${+(v / 1e6).toPrecision(3)}M`;
  if (a >= 1e4) return `${+(v / 1e3).toPrecision(3)}k`;
  return String(+v.toPrecision(4)).replace('-', '−');
}

const SAMPLES = 240;

/** A curve's points over the range: sampled from f (by decades on a log axis), or as given. */
export function samplesOf(series, [x0, x1], logX = false) {
  if (series.points) return series.points;
  return Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const t = i / SAMPLES;
    const x = logX ? 10 ** (Math.log10(x0) + t * (Math.log10(x1) - Math.log10(x0))) : x0 + t * (x1 - x0);
    return [x, series.f(x)];
  });
}

const rad = (deg) => (deg * Math.PI) / 180;

/** Each phasor's start and end, chained by `from` (tip to tail). */
export function phasorEnds(vectors) {
  const byName = new Map();
  return vectors.map((v, i) => {
    if (!(v.mag >= 0) || !Number.isFinite(v.angle)) throw new Error(`Phasor ${v.name || i}: needs mag and angle.`);
    let start = [0, 0];
    if (v.from != null) {
      if (!byName.has(v.from)) throw new Error(`Phasor ${v.name || i}: no vector named ${v.from} before it.`);
      start = byName.get(v.from).end;
    }
    const end = [start[0] + v.mag * Math.cos(rad(v.angle)), start[1] + v.mag * Math.sin(rad(v.angle))];
    const out = { start, end };
    if (v.name) byName.set(v.name, out);
    return out;
  });
}

// Circuit parts: how long each symbol is along its line (wire fills the rest).
export const BODY = {
  R: 30, L: 32, C: 8, V: 26, Vac: 26, I: 26, bat: 6, sw: 24, D: 14, lamp: 24, fuse: 26,
  ammeter: 24, voltmeter: 24, wattmeter: 24, xfmr: 32, cb: 12,
};
export const TWO_POINT = new Set([...Object.keys(BODY), 'wire', 'bus', 'i']);
export const ONE_POINT = new Set(['gnd', 'dot']);
export const WITH_LEAD = new Set(['gen', 'motor', 'load']);

const onGrid = (p) => Array.isArray(p) && p.length === 2 && p.every((v) => Number.isFinite(v) && v >= 0 && Math.abs(v * 2 - Math.round(v * 2)) < 1e-9);

/** Throws on a part that isn't on the grid, runs on a slant, or is of no known kind. */
export function checkCircuit(parts) {
  if (!Array.isArray(parts) || parts.length === 0) throw new Error('A circuit needs parts.');
  parts.forEach(([kind, a, b], i) => {
    const where = `part ${i + 1} (${kind})`;
    if (!TWO_POINT.has(kind) && !ONE_POINT.has(kind) && !WITH_LEAD.has(kind) && kind !== 'opamp') throw new Error(`${where}: unknown kind`);
    if (!onGrid(a)) throw new Error(`${where}: its point is off the grid`);
    if (TWO_POINT.has(kind) || WITH_LEAD.has(kind)) {
      if (!onGrid(b)) throw new Error(`${where}: its second point is off the grid`);
      if (a[0] === b[0] && a[1] === b[1]) throw new Error(`${where}: both ends at one point`);
      if (a[0] !== b[0] && a[1] !== b[1]) throw new Error(`${where}: runs on a slant; parts run across or down`);
    }
  });
}

/** Throws on a link to a block that isn't there. */
export function checkBlocks(blocks, links) {
  const ids = new Set(blocks.map((b) => b.id));
  for (const [from, to] of links) {
    for (const end of [from, to]) {
      if (typeof end === 'string' && !ids.has(end)) throw new Error(`Block diagram: no block "${end}".`);
      if (typeof end !== 'string' && !(Array.isArray(end) && end.length === 2)) throw new Error('Block diagram: a link end is a block id or a grid point.');
    }
  }
}
