// src/features/lessons/figures/Phasor.jsx
//
// A phasor diagram: vectors by magnitude and angle (degrees, counter-clockwise
// from the reference), each from the origin or from another's tip (tip to tail:
// a KVL sum, the power triangle), with angle arcs. Drawn to scale, fitted to the
// frame.
//
//   { type: 'phasor', alt, axes?: true | 'reim' | false,
//     vectors: [{ name?, mag, angle, from?: name, label, colour?: n, dashed?, labelAt?: 'tip' | 'mid' }],
//     arcs?: [{ from: deg, to: deg, label, r?: px }] }
import { GUIDE, MUTED, colourOf, phasorEnds, textColourOf } from './figureMath';
import { Arrow, Svg, Text } from './kit';

const W = 320;
const H = 240;
const PAD = 34;
const rad = (deg) => (deg * Math.PI) / 180;

export default function Phasor({ alt, vectors = [], arcs = [], axes = true }) {
  if (vectors.length === 0) throw new Error('A phasor diagram needs a vector.');
  const ends = phasorEnds(vectors);
  const pts = [[0, 0], ...ends.flatMap((e) => [e.start, e.end])];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((W - 2 * PAD) / Math.max(maxX - minX, 1e-9), (H - 2 * PAD) / Math.max(maxY - minY, 1e-9));
  // Centre the drawing in the frame.
  const ox = W / 2 - ((minX + maxX) / 2) * k;
  const oy = H / 2 + ((minY + maxY) / 2) * k;
  const at = ([px, py]) => [ox + px * k, oy - py * k];
  const [cx, cy] = at([0, 0]);

  return (
    <Svg alt={alt} width={W} height={H}>
      {axes && (
        <g stroke={GUIDE} strokeWidth="1" strokeDasharray="3 4">
          <line x1={8} x2={W - 8} y1={cy} y2={cy} />
          <line y1={8} y2={H - 8} x1={cx} x2={cx} />
        </g>
      )}
      {axes === 'reim' && (
        <>
          <Text x={W - 10} y={cy - 9} anchor="end" size={11} colour={MUTED}>Re</Text>
          <Text x={cx + 6} y={14} anchor="start" size={11} colour={MUTED}>Im</Text>
        </>
      )}
      {arcs.map((a, i) => {
        const r = a.r ?? 30;
        const [x1, y1] = [cx + r * Math.cos(rad(a.from)), cy - r * Math.sin(rad(a.from))];
        const [x2, y2] = [cx + r * Math.cos(rad(a.to)), cy - r * Math.sin(rad(a.to))];
        const sweep = a.to > a.from ? 0 : 1;
        const large = Math.abs(a.to - a.from) > 180 ? 1 : 0;
        const mid = rad((a.from + a.to) / 2);
        return (
          <g key={`a${i}`}>
            <path d={`M${x1},${y1} A${r},${r} 0 ${large} ${sweep} ${x2},${y2}`} fill="none" stroke={GUIDE} strokeWidth="1.25" />
            {a.label && <Text x={cx + (r + 11) * Math.cos(mid)} y={cy - (r + 11) * Math.sin(mid)} size={11.5} italic>{a.label}</Text>}
          </g>
        );
      })}
      {vectors.map((v, i) => {
        const [x1, y1] = at(ends[i].start);
        const [x2, y2] = at(ends[i].end);
        const colour = colourOf(v.colour ?? i);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const mid = (v.labelAt ?? (v.from != null ? 'mid' : 'tip')) === 'mid';
        // At the tip: a little beyond it, or just under it for a vector along the
        // axis, where beyond would sit on the axis line. At the middle: off to the side.
        const flat = Math.abs(dy / len) < 0.2;
        const [lx, ly] = mid
          ? [(x1 + x2) / 2 + (-dy / len) * 13, (y1 + y2) / 2 + (dx / len) * 13]
          : flat ? [x2 - (dx / len) * 6, y2 + 14] : [x2 + (dx / len) * 13, y2 + (dy / len) * 13];
        const anchor = mid ? 'middle' : flat ? (dx > 0 ? 'end' : 'start') : dx / len > 0.35 ? 'start' : dx / len < -0.35 ? 'end' : 'middle';
        return (
          <g key={i}>
            <Arrow x1={x1} y1={y1} x2={x2} y2={y2} colour={colour} width={2.25} dashed={v.dashed} head={8} />
            {v.label && <Text x={lx} y={ly} anchor={anchor} size={12} colour={textColourOf(v.colour ?? i)} weight={700}>{v.label}</Text>}
          </g>
        );
      })}
    </Svg>
  );
}
