// src/features/lessons/figures/Circuit.jsx
//
// A schematic (or a one-line diagram) on a grid. Each part runs between two grid
// points, across or down only (half steps allowed): the symbol sits in the
// middle and wire fills the rest, so a circuit is laid out like graph paper.
//
//   { type: 'circuit', alt,
//     parts: [[kind, [col, row], [col, row], label?, { side?: 'below' | 'left', closed? }]],
//     nodes?: [{ at: [col, row], label, side?: 'ne' | 'nw' | 'se' | 'sw' }] }
//
// Two-point kinds: wire, R, L, C, V (dc source, + at the second point), Vac,
//   I (current source, arrow first → second), bat (long plate at the second
//   point), sw, D (anode first), lamp, fuse, ammeter, voltmeter, wattmeter,
//   and for one-line diagrams xfmr, cb, bus; i is a current arrow drawn over a wire.
// One-point kinds: gnd and dot at [col, row]; pole, a coil's polarity dot beside the
//   point (label 'left' or 'right'); text, a free label there; gen, motor and load at a point
//   with a lead to the second (load is an arrow ending there); opamp with its
//   output at the point, − input one row-half up and two columns left, + below.
import { BODY, INK, INK_TEXT, ONE_POINT as ONE, SIGNAL, SIGNAL_TEXT, TEXT, TWO_POINT, WITH_LEAD as LEAD, checkCircuit, headPoints } from './figureMath';
import { Svg, Text } from './kit';

const G = 48;
// Between the lines of a two-line label.
const LINE = 16;
const PAD_X = 44;
const PAD_Y = 30;
const WIRE = { stroke: TEXT, strokeWidth: 1.6, strokeLinecap: 'round', fill: 'none' };
const PART = { stroke: INK, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };

const METER = { ammeter: 'A', voltmeter: 'V', wattmeter: 'W' };

const px = ([c, r]) => [PAD_X + c * G, PAD_Y + r * G];

// A symbol drawn along +x, centred on 0: rotated into place by its part.
function Body({ kind, closed }) {
  switch (kind) {
    case 'R': return <polyline points="-15,0 -12.5,-6 -7.5,6 -2.5,-6 2.5,6 7.5,-6 12.5,6 15,0" {...PART} />;
    case 'L': return <path d="M-16,0 a4,4 0 0 1 8,0 a4,4 0 0 1 8,0 a4,4 0 0 1 8,0 a4,4 0 0 1 8,0" {...PART} />;
    case 'C': return <g {...PART}><line x1={-4} x2={-4} y1={-11} y2={11} /><line x1={4} x2={4} y1={-11} y2={11} /></g>;
    case 'bat': return <g {...PART}><line x1={-3} x2={-3} y1={-6} y2={6} strokeWidth="3" /><line x1={3} x2={3} y1={-12} y2={12} /></g>;
    case 'V': case 'Vac': case 'lamp': case 'ammeter': case 'voltmeter': case 'wattmeter':
      return (
        <g {...PART}>
          <circle r={kind === 'V' || kind === 'Vac' ? 13 : 12} />
          {kind === 'lamp' && <><line x1={-8.5} y1={-8.5} x2={8.5} y2={8.5} /><line x1={-8.5} y1={8.5} x2={8.5} y2={-8.5} /></>}
        </g>
      );
    case 'I': return <g {...PART}><circle r={13} /><line x1={-7} x2={5} y1={0} y2={0} /><polygon points={headPoints(-7, 0, 8, 0, 6)} fill={INK} stroke="none" /></g>;
    case 'sw': return <g {...PART}><circle cx={-12} r={2.2} /><circle cx={12} r={2.2} /><line x1={-10} y1={0} x2={closed ? 10 : 9} y2={closed ? 0 : -10} /></g>;
    case 'D': return <g {...PART}><polygon points="-7,-8 -7,8 7,0" fill={INK} fillOpacity="0.15" /><line x1={7} x2={7} y1={-8} y2={8} /></g>;
    case 'fuse': return <g {...PART}><rect x={-13} y={-5} width={26} height={10} rx={2} /><line x1={-13} x2={13} y1={0} y2={0} strokeWidth="1.25" /></g>;
    case 'xfmr': return <g {...PART}><circle cx={-6} r={10} /><circle cx={6} r={10} /></g>;
    case 'cb': return <rect x={-6} y={-6} width={12} height={12} {...PART} />;
    default: return null;
  }
}

function TwoPoint({ kind, a, b, label, opts = {}, index }) {
  const [x1, y1] = px(a);
  const [x2, y2] = px(b);
  const len = Math.hypot(x2 - x1, y2 - y1);
  const [ux, uy] = [(x2 - x1) / len, (y2 - y1) / len];
  const [cx, cy] = [(x1 + x2) / 2, (y1 + y2) / 2];
  const across = uy === 0;
  if (kind === 'wire') return <line x1={x1} y1={y1} x2={x2} y2={y2} {...WIRE} />;

  // Where the label goes: above a part across the page, right of one down it.
  const flip = opts.side === 'below' || opts.side === 'left';
  const off = kind === 'i' ? 11 : kind === 'bus' ? 12 : 20;
  const lines = Array.isArray(label) ? label : label ? [label] : [];
  const labelEl = lines.length > 0 && (
    <g>
      {lines.map((t, j) => {
        const lx = across ? cx : cx + (flip ? -off : off);
        const ly = across
          ? cy + (flip ? off + j * LINE : -off - (lines.length - 1 - j) * LINE)
          : cy + (j - (lines.length - 1) / 2) * LINE;
        return <Text key={j} x={lx} y={ly} anchor={across ? 'middle' : flip ? 'end' : 'start'} size={12} colour={kind === 'i' ? SIGNAL_TEXT : TEXT}>{t}</Text>;
      })}
    </g>
  );

  if (kind === 'bus') {
    return (
      <g data-part={index}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth="5" strokeLinecap="round" />
        {labelEl}
      </g>
    );
  }
  if (kind === 'i') {
    return (
      <g data-part={index}>
        <polygon points={headPoints(cx - ux * 8, cy - uy * 8, cx + ux * 5, cy + uy * 5, 9)} fill={SIGNAL} />
        {labelEl}
      </g>
    );
  }

  const half = BODY[kind] / 2;
  const angle = (Math.atan2(uy, ux) * 180) / Math.PI;
  return (
    <g data-part={index}>
      <line x1={x1} y1={y1} x2={cx - ux * half} y2={cy - uy * half} {...WIRE} />
      <line x1={cx + ux * half} y1={cy + uy * half} x2={x2} y2={y2} {...WIRE} />
      <g transform={`translate(${cx} ${cy}) rotate(${angle})`}><Body kind={kind} closed={opts.closed} /></g>
      {/* Signs and letters stay upright, whichever way the part runs. */}
      {kind === 'V' && (
        <g stroke={INK} strokeWidth="1.6" strokeLinecap="round">
          <line x1={cx + ux * 6 - 3} x2={cx + ux * 6 + 3} y1={cy + uy * 6} y2={cy + uy * 6} />
          <line x1={cx + ux * 6} x2={cx + ux * 6} y1={cy + uy * 6 - 3} y2={cy + uy * 6 + 3} />
          <line x1={cx - ux * 6 - 3} x2={cx - ux * 6 + 3} y1={cy - uy * 6} y2={cy - uy * 6} />
        </g>
      )}
      {kind === 'Vac' && <path d={`M${cx - 8},${cy} q4,-8 8,0 q4,8 8,0`} {...PART} strokeWidth="1.6" />}
      {METER[kind] && <Text x={cx} y={cy + 0.5} size={12} colour={INK_TEXT} weight={700}>{METER[kind]}</Text>}
      {labelEl}
    </g>
  );
}

function OnePoint({ kind, a, b, label, index }) {
  const [x, y] = px(a);
  if (kind === 'dot') return <circle cx={x} cy={y} r="3.2" fill={TEXT} data-part={index} />;
  if (kind === 'pole') return <circle cx={x + (label === 'left' ? -9 : 9)} cy={y} r="3" fill={TEXT} data-part={index} />;
  if (kind === 'text') return <g data-part={index}><Text x={x} y={y} size={12} weight={700} italic>{label}</Text></g>;
  if (kind === 'gnd') {
    return (
      <g {...WIRE} data-part={index}>
        <line x1={x} x2={x} y1={y} y2={y + 9} />
        <line x1={x - 10} x2={x + 10} y1={y + 9} y2={y + 9} />
        <line x1={x - 6} x2={x + 6} y1={y + 13} y2={y + 13} />
        <line x1={x - 2.5} x2={x + 2.5} y1={y + 17} y2={y + 17} />
      </g>
    );
  }
  const [x2, y2] = px(b);
  const len = Math.hypot(x2 - x, y2 - y);
  const [ux, uy] = [(x2 - x) / len, (y2 - y) / len];
  const across = uy === 0;
  // A label sits on the far side of the symbol from its lead.
  const labelAt = across
    ? { x: x - ux * 24, y: y - 2, anchor: ux > 0 ? 'end' : 'start' }
    : { x: x + 22, y: y - uy * 22, anchor: 'start' };
  if (kind === 'load') {
    return (
      <g data-part={index}>
        <line x1={x} y1={y} x2={x2 - ux * 6} y2={y2 - uy * 6} {...WIRE} />
        <polygon points={headPoints(x, y, x2, y2, 9)} fill={TEXT} />
        {label && <Text x={x2 + (across ? ux * 6 : 10)} y={y2 + (across ? 0 : uy * 8)} anchor={across ? (ux > 0 ? 'start' : 'end') : 'start'} size={12}>{label}</Text>}
      </g>
    );
  }
  return (
    <g data-part={index}>
      <line x1={x + ux * 14} y1={y + uy * 14} x2={x2} y2={y2} {...WIRE} />
      <circle cx={x} cy={y} r={14} {...PART} />
      {kind === 'gen'
        ? <path d={`M${x - 8},${y} q4,-8 8,0 q4,8 8,0`} {...PART} strokeWidth="1.6" />
        : <Text x={x} y={y + 0.5} size={12} colour={INK_TEXT} weight={700}>M</Text>}
      {label && <Text x={labelAt.x} y={labelAt.y} anchor={labelAt.anchor} size={12}>{label}</Text>}
    </g>
  );
}

function OpAmp({ a, label, index }) {
  const [ox, oy] = px(a);
  const left = ox - 2 * G;
  const base = left + 0.4 * G;
  const tip = ox - 0.25 * G;
  const half = 0.85 * G;
  return (
    <g data-part={index}>
      <line x1={left} x2={base} y1={oy - G / 2} y2={oy - G / 2} {...WIRE} />
      <line x1={left} x2={base} y1={oy + G / 2} y2={oy + G / 2} {...WIRE} />
      <line x1={tip} x2={ox} y1={oy} y2={oy} {...WIRE} />
      <polygon points={`${base},${oy - half} ${base},${oy + half} ${tip},${oy}`} {...PART} />
      <g stroke={INK} strokeWidth="1.6" strokeLinecap="round">
        <line x1={base + 6} x2={base + 13} y1={oy - G / 2} y2={oy - G / 2} />
        <line x1={base + 6} x2={base + 13} y1={oy + G / 2} y2={oy + G / 2} />
        <line x1={base + 9.5} x2={base + 9.5} y1={oy + G / 2 - 3.5} y2={oy + G / 2 + 3.5} />
      </g>
      {label && <Text x={(base + tip) / 2 - 2} y={oy - half + 2} anchor="start" size={11}>{label}</Text>}
    </g>
  );
}

const NODE_SIDES = { ne: [6, -10, 'start'], nw: [-6, -10, 'end'], se: [6, 14, 'start'], sw: [-6, 14, 'end'] };

export default function Circuit({ alt, parts = [], nodes = [] }) {
  checkCircuit(parts);
  let maxC = 0;
  let maxR = 0;
  for (const [kind, a, b] of parts) {
    for (const p of [a, b]) {
      if (!Array.isArray(p)) continue;
      maxC = Math.max(maxC, p[0]);
      maxR = Math.max(maxR, p[1]);
    }
    if (kind === 'gnd') maxR = Math.max(maxR, a[1] + 0.5);
  }
  // A label beside a part down the page can reach past the frame sideways, and a
  // stack of label lines over (or under) a part across it past the top (or
  // bottom): grow the frame to fit (about 7 px a character at this size).
  let left = 0;
  let right = PAD_X * 2 + maxC * G;
  let top = 0;
  let bottom = PAD_Y * 2 + maxR * G;
  for (const [kind, a, b, label, opts] of parts) {
    if (!TWO_POINT.has(kind) || !label) continue;
    const lines = Array.isArray(label) ? label : [label];
    if (a[0] === b[0]) {
      const longest = Math.max(...lines.map((t) => String(t).replace(/_/g, '').length));
      const x = px(a)[0];
      if (opts?.side === 'left') left = Math.min(left, x - 20 - longest * 7 - 6);
      else right = Math.max(right, x + 20 + longest * 7 + 6);
    } else {
      const y = px(a)[1];
      const off = kind === 'i' ? 11 : 20;
      if (opts?.side === 'below') bottom = Math.max(bottom, y + off + (lines.length - 1) * LINE + 14);
      else top = Math.min(top, y - off - (lines.length - 1) * LINE - 14);
    }
  }
  return (
    <Svg alt={alt} x={left} y={top} width={right - left} height={bottom - top}>
      {parts.map(([kind, a, b, label, opts], i) => {
        if (kind === 'opamp') return <OpAmp key={i} a={a} label={label ?? b} index={i} />;
        if (ONE.has(kind)) return <OnePoint key={i} kind={kind} a={a} label={label ?? b} index={i} />;
        if (LEAD.has(kind)) return <OnePoint key={i} kind={kind} a={a} b={b} label={label} index={i} />;
        return <TwoPoint key={i} kind={kind} a={a} b={b} label={label} opts={opts} index={i} />;
      })}
      {nodes.map((n, i) => {
        const [x, y] = px(n.at);
        const [dx, dy, anchor] = NODE_SIDES[n.side || 'ne'];
        return (
          <g key={`n${i}`}>
            <circle cx={x} cy={y} r="3.2" fill={TEXT} />
            {n.label && <Text x={x + dx} y={y + dy} anchor={anchor} size={12} weight={700}>{n.label}</Text>}
          </g>
        );
      })}
    </Svg>
  );
}
