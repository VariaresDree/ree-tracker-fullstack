// src/features/lessons/figures/Blocks.jsx
//
// A block diagram on a grid: blocks, summing junctions with their signs, branch
// points, and arrows between them that turn only at right angles (through `via`
// grid points for a feedback path). For control loops, communication chains and
// power-plant flows.
//
//   { type: 'blocks', alt,
//     blocks: [{ id, at: [col, row], label, kind?: 'block' | 'sum' | 'point' }],
//     links: [[from, to, { label?, sign?: '+' | '−', via?: [[col, row], …] }]] }
// `from` / `to` is a block id, or a bare grid point for an input or output.
import { INK, TEXT, checkBlocks } from './figureMath';
import { Arrow, Svg, Text } from './kit';

const CW = 100;
const RH = 66;
const PAD_X = 58;
const PAD_Y = 36;
const BW = 76;
const BH = 36;
const SUM_R = 11;

const center = ([c, r]) => [PAD_X + c * CW, PAD_Y + r * RH];

// Where a link leaves (or enters) a block: the side facing the next point.
function port(node, toward) {
  const [x, y] = node.xy;
  if (!node.kind) return [x, y];
  const dx = toward[0] - x;
  const dy = toward[1] - y;
  if (node.kind === 'point') return [x, y];
  if (node.kind === 'sum') {
    return Math.abs(dx) >= Math.abs(dy) ? [x + Math.sign(dx) * SUM_R, y] : [x, y + Math.sign(dy) * SUM_R];
  }
  return Math.abs(dx) >= Math.abs(dy) ? [x + Math.sign(dx) * (BW / 2), y] : [x, y + Math.sign(dy) * (BH / 2)];
}

export default function Blocks({ alt, blocks = [], links = [] }) {
  if (blocks.length === 0) throw new Error('A block diagram needs a block.');
  checkBlocks(blocks, links);
  const byId = new Map(blocks.map((b) => [b.id, { ...b, kind: b.kind || 'block', xy: center(b.at) }]));
  const nodeOf = (end) => (typeof end === 'string' ? byId.get(end) : { xy: center(end) });

  let maxC = 0;
  let maxR = 0;
  const grow = ([c, r]) => { maxC = Math.max(maxC, c); maxR = Math.max(maxR, r); };
  blocks.forEach((b) => grow(b.at));
  links.forEach(([from, to, o]) => {
    [from, to].forEach((e) => typeof e !== 'string' && grow(e));
    (o?.via || []).forEach(grow);
  });

  const paths = links.map(([from, to, o = {}], i) => {
    const a = nodeOf(from);
    const b = nodeOf(to);
    const via = (o.via || []).map(center);
    const first = via[0] || b.xy;
    const last = via[via.length - 1] || a.xy;
    const start = port(a, first);
    const end = port(b, last);
    const pts = [start, ...via, end];
    // Turn a slanted step into a right angle: across first, then down.
    const square = [pts[0]];
    for (let k = 1; k < pts.length; k++) {
      const [px0, py0] = square[square.length - 1];
      const [px1, py1] = pts[k];
      if (px0 !== px1 && py0 !== py1) square.push([px1, py0]);
      square.push(pts[k]);
    }
    const lastSeg = [square[square.length - 2], square[square.length - 1]];
    // The label sits on the longest stretch.
    let best = 0;
    let bestLen = -1;
    for (let k = 1; k < square.length; k++) {
      const len = Math.hypot(square[k][0] - square[k - 1][0], square[k][1] - square[k - 1][1]);
      if (len > bestLen) { bestLen = len; best = k - 1; }
    }
    const [s0, s1] = [square[best], square[best + 1]];
    const flat = s0[1] === s1[1];
    // A sign sits just before the arrow, on the side it comes in from.
    const [ex, ey] = lastSeg[1];
    const fromLeft = lastSeg[0][0] < ex;
    const fromRight = lastSeg[0][0] > ex;
    const fromBelow = lastSeg[0][1] > ey;
    const signAt = fromLeft ? [ex - 12, ey - 10] : fromRight ? [ex + 12, ey - 10] : fromBelow ? [ex + 10, ey + 12] : [ex + 10, ey - 12];
    return (
      <g key={`l${i}`}>
        {square.length > 2 && <polyline points={square.slice(0, -1).map((p) => p.join(',')).join(' ')} fill="none" stroke={TEXT} strokeWidth="1.6" strokeLinejoin="round" />}
        <Arrow x1={lastSeg[0][0]} y1={lastSeg[0][1]} x2={ex} y2={ey} colour={TEXT} width={1.6} head={7} />
        {o.label && <Text x={flat ? (s0[0] + s1[0]) / 2 : s0[0] + 7} y={flat ? s0[1] - 9 : (s0[1] + s1[1]) / 2} anchor={flat ? 'middle' : 'start'} size={11.5} italic>{o.label}</Text>}
        {o.sign && <Text x={signAt[0]} y={signAt[1]} size={13} weight={700}>{o.sign}</Text>}
      </g>
    );
  });

  return (
    <Svg alt={alt} width={PAD_X * 2 + maxC * CW} height={PAD_Y * 2 + maxR * RH}>
      {paths}
      {[...byId.values()].map((b) => {
        const [x, y] = b.xy;
        if (b.kind === 'point') return <circle key={b.id} cx={x} cy={y} r="3.2" fill={TEXT} />;
        if (b.kind === 'sum') {
          return (
            <g key={b.id}>
              <circle cx={x} cy={y} r={SUM_R} fill="var(--color-surface)" stroke={INK} strokeWidth="2" />
              <line x1={x - 7.8} y1={y - 7.8} x2={x + 7.8} y2={y + 7.8} stroke={INK} strokeWidth="1.25" />
              <line x1={x - 7.8} y1={y + 7.8} x2={x + 7.8} y2={y - 7.8} stroke={INK} strokeWidth="1.25" />
            </g>
          );
        }
        return (
          <g key={b.id}>
            <rect x={x - BW / 2} y={y - BH / 2} width={BW} height={BH} rx="5" fill="var(--color-surface)" stroke={INK} strokeWidth="2" />
            <Text x={x} y={y + 0.5} size={12} weight={600} italic>{b.label}</Text>
          </g>
        );
      })}
    </Svg>
  );
}
