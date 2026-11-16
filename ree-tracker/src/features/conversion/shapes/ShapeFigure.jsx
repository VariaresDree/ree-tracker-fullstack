// src/features/conversion/shapes/ShapeFigure.jsx
//
// One drawing per shape, in theme colours: the shape in the accent, what's
// measured (heights, radii) in the signal colour, guides and hidden edges
// dashed. Flat solids are drawn from their corners (shapes.js finds the faces,
// so the back edges dash themselves); round ones by hand.
import { MAX_SIDES, MIN_SIDES, PLATONIC, POLYGON_NAMES, convexEdges, convexFaces, polygonPoints, viewOf } from './shapes';

const INK = 'var(--accent)';
const MEASURE = 'var(--accent-signal)';
const GUIDE = 'var(--color-muted2)';
const TEXT = 'var(--text-main)';
const fill = { fill: INK, fillOpacity: 0.1 };
const line = { fill: 'none', stroke: INK, strokeWidth: 2.25, strokeLinejoin: 'round', strokeLinecap: 'round' };
const dashed = { fill: 'none', stroke: GUIDE, strokeWidth: 1.25, strokeDasharray: '4 4' };
const measure = { fill: 'none', stroke: MEASURE, strokeWidth: 1.75, strokeDasharray: '5 3' };
const pts = (list) => list.map((p) => p.join(',')).join(' ');
const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];

function Svg({ label, viewBox = '0 0 240 160', children, className = 'max-w-[15rem]' }) {
  return (
    <svg viewBox={viewBox} role="img" aria-label={label} className={`w-full h-auto ${className}`}>
      {children}
    </svg>
  );
}

const T = ({ x, y, children, anchor = 'middle', size = 13 }) => (
  <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight="600" fontStyle="italic" fill={TEXT}>{children}</text>
);
const Dot = ({ at, colour = TEXT }) => <circle cx={at[0]} cy={at[1]} r="2.6" fill={colour} />;

// A right-angle mark at corner `at`, along unit directions u and v.
function RightAngle({ at, u, v, size = 9 }) {
  const p = (k, l) => `${at[0] + u[0] * k + v[0] * l},${at[1] + u[1] * k + v[1] * l}`;
  return <polyline points={`${p(size, 0)} ${p(size, size)} ${p(0, size)}`} fill="none" stroke={GUIDE} strokeWidth="1.25" />;
}

// A short stroke across a side's middle: equal ticks, equal sides.
function Tick({ from, to }) {
  const [mx, my] = mid(from, to);
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * 5;
  const ny = (dx / len) * 5;
  return <line x1={mx - nx} y1={my - ny} x2={mx + nx} y2={my + ny} stroke={INK} strokeWidth="1.5" />;
}

// ---- Plane figures ----------------------------------------------------------

function Triangle() {
  const A = [28, 140];
  const B = [212, 140];
  const C = [150, 28];
  return (
    <Svg label="Triangle ABC: side a faces A, b faces B, c faces C, with the height h onto c">
      <polygon points={pts([A, B, C])} {...fill} />
      <line x1={C[0]} y1={C[1]} x2={C[0]} y2={B[1]} {...measure} />
      <RightAngle at={[C[0], B[1]]} u={[1, 0]} v={[0, -1]} />
      <polygon points={pts([A, B, C])} {...line} />
      <T x={18} y={154}>A</T><T x={222} y={154}>B</T><T x={150} y={20}>C</T>
      <T x={192} y={84}>a</T><T x={80} y={80}>b</T><T x={110} y={156}>c</T><T x={160} y={100} anchor="start">h</T>
    </Svg>
  );
}

const KIND_POINTS = {
  equilateral: { points: [[50, 8], [14, 70], [86, 70]], ticks: [[0, 1], [1, 2], [2, 0]] },
  isosceles: { points: [[50, 6], [26, 70], [74, 70]], ticks: [[0, 1], [0, 2]] },
  scalene: { points: [[30, 10], [8, 70], [94, 70]], ticks: [] },
  acute: { points: [[58, 8], [12, 70], [90, 70]], ticks: [] },
  right: { points: [[16, 10], [16, 70], [90, 70]], ticks: [], right: true },
  obtuse: { points: [[30, 44], [6, 70], [96, 70]], ticks: [] },
};

function TriangleKind({ kind, name }) {
  const k = KIND_POINTS[kind];
  return (
    <Svg label={`${name} triangle`} viewBox="0 0 100 76" className="max-w-[6.5rem]">
      <polygon points={pts(k.points)} {...fill} />
      {k.right && <RightAngle at={[16, 70]} u={[1, 0]} v={[0, -1]} size={8} />}
      <polygon points={pts(k.points)} {...line} strokeWidth="2" />
      {k.ticks.map(([i, j]) => <Tick key={`${i}${j}`} from={k.points[i]} to={k.points[j]} />)}
    </Svg>
  );
}

// The four centres, worked out for the triangle drawn.
function TriangleCentres() {
  // Scalene, so the four centres sit apart.
  const A = [20, 150];
  const B = [220, 150];
  const C = [80, 20];
  const len = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const a = len(B, C);
  const b = len(C, A);
  const c = len(A, B);
  const area = Math.abs((B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1])) / 2;
  const G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
  const I = [(a * A[0] + b * B[0] + c * C[0]) / (a + b + c), (a * A[1] + b * B[1] + c * C[1]) / (a + b + c)];
  const r = (2 * area) / (a + b + c);
  const R = (a * b * c) / (4 * area);
  const d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
  const sq = (p) => p[0] ** 2 + p[1] ** 2;
  const O = [
    (sq(A) * (B[1] - C[1]) + sq(B) * (C[1] - A[1]) + sq(C) * (A[1] - B[1])) / d,
    (sq(A) * (C[0] - B[0]) + sq(B) * (A[0] - C[0]) + sq(C) * (B[0] - A[0])) / d,
  ];
  const H = [A[0] + B[0] + C[0] - 2 * O[0], A[1] + B[1] + C[1] - 2 * O[1]];
  const pad = 14;
  return (
    <Svg
      label="A triangle with its inscribed circle (centre I, radius r), its circumscribed circle (centre O, radius R), the centroid G and the orthocentre H on the Euler line"
      viewBox={`${O[0] - R - pad} ${O[1] - R - pad} ${2 * (R + pad)} ${2 * (R + pad)}`}
    >
      <circle cx={O[0]} cy={O[1]} r={R} {...dashed} />
      <polygon points={pts([A, B, C])} {...fill} />
      <polygon points={pts([A, B, C])} {...line} />
      <circle cx={I[0]} cy={I[1]} r={r} {...measure} strokeDasharray="none" />
      <line x1={O[0]} y1={O[1]} x2={H[0]} y2={H[1]} {...dashed} />
      {[[G, 'G', -2, 16, 'end'], [I, 'I', -7, 4, 'end'], [O, 'O', 7, -5, 'start'], [H, 'H', -7, -4, 'end']].map(([p, name, dx, dy, anchor]) => (
        <g key={name}>
          <Dot at={p} />
          <T x={p[0] + dx} y={p[1] + dy} anchor={anchor} size={12}>{name}</T>
        </g>
      ))}
    </Svg>
  );
}

function Square() {
  return (
    <Svg label="Square with side a and diagonal d">
      <rect x="70" y="30" width="100" height="100" {...fill} />
      <line x1="70" y1="130" x2="170" y2="30" {...measure} />
      <rect x="70" y="30" width="100" height="100" {...line} />
      <T x={120} y={148}>a</T><T x={130} y={72} anchor="start">d</T>
    </Svg>
  );
}

function Rectangle() {
  return (
    <Svg label="Rectangle with base b, height h and diagonal d">
      <rect x="40" y="35" width="160" height="90" {...fill} />
      <line x1="40" y1="125" x2="200" y2="35" {...measure} />
      <rect x="40" y="35" width="160" height="90" {...line} />
      <T x={120} y={143}>b</T><T x={210} y={84} anchor="start">h</T><T x={118} y={72}>d</T>
    </Svg>
  );
}

function Parallelogram() {
  const P = [[30, 130], [170, 130], [210, 40], [70, 40]];
  return (
    <Svg label="Parallelogram with base b, side a, angle θ and height h">
      <polygon points={pts(P)} {...fill} />
      <line x1="70" y1="40" x2="70" y2="130" {...measure} />
      <RightAngle at={[70, 130]} u={[1, 0]} v={[0, -1]} />
      <polygon points={pts(P)} {...line} />
      <T x={120} y={148}>b</T><T x={38} y={84} anchor="end">a</T><T x={76} y={92} anchor="start">h</T><T x={52} y={124} size={12}>θ</T>
    </Svg>
  );
}

function Rhombus() {
  const P = [[120, 18], [200, 82], [120, 146], [40, 82]];
  return (
    <Svg label="Rhombus with equal sides a and diagonals d1 and d2 crossing at right angles">
      <polygon points={pts(P)} {...fill} />
      <line x1="40" y1="82" x2="200" y2="82" {...measure} />
      <line x1="120" y1="18" x2="120" y2="146" {...measure} />
      <RightAngle at={[120, 82]} u={[1, 0]} v={[0, -1]} size={8} />
      <polygon points={pts(P)} {...line} />
      {[[0, 1], [1, 2], [2, 3], [3, 0]].map(([i, j]) => <Tick key={i} from={P[i]} to={P[j]} />)}
      <T x={162} y={76} anchor="start" size={12}>d₁</T><T x={126} y={120} anchor="start" size={12}>d₂</T><T x={68} y={44} anchor="end">a</T>
    </Svg>
  );
}

function Trapezoid() {
  const P = [[20, 135], [220, 135], [165, 40], [75, 40]];
  return (
    <Svg label="Trapezoid with parallel sides a and b, legs c and d, and height h">
      <polygon points={pts(P)} {...fill} />
      <line x1="75" y1="40" x2="75" y2="135" {...measure} />
      <RightAngle at={[75, 135]} u={[1, 0]} v={[0, -1]} />
      <polygon points={pts(P)} {...line} />
      <T x={120} y={153}>a</T><T x={120} y={32}>b</T><T x={81} y={95} anchor="start">h</T><T x={38} y={86} anchor="end">d</T><T x={200} y={86} anchor="start">c</T>
    </Svg>
  );
}

function Kite() {
  const P = [[120, 14], [176, 58], [120, 150], [64, 58]];
  return (
    <Svg label="Kite with sides a, a, b, b and diagonals p and q crossing at right angles">
      <polygon points={pts(P)} {...fill} />
      <line x1="64" y1="58" x2="176" y2="58" {...measure} />
      <line x1="120" y1="14" x2="120" y2="150" {...measure} />
      <polygon points={pts(P)} {...line} />
      <T x={84} y={30} anchor="end">a</T><T x={156} y={30} anchor="start">a</T><T x={84} y={112} anchor="end">b</T><T x={156} y={112} anchor="start">b</T>
      <T x={150} y={74} size={12}>p</T><T x={128} y={104} anchor="start" size={12}>q</T>
    </Svg>
  );
}

function Cyclic() {
  const c = [120, 82];
  const r = 66;
  const at = (degrees) => [c[0] + r * Math.cos((degrees * Math.PI) / 180), c[1] - r * Math.sin((degrees * Math.PI) / 180)];
  const P = [200, 300, 15, 115].map(at);
  const names = ['a', 'b', 'c', 'd'];
  return (
    <Svg label="Cyclic quadrilateral: four sides a, b, c and d with every corner on one circle">
      <circle cx={c[0]} cy={c[1]} r={r} {...dashed} />
      <polygon points={pts(P)} {...fill} />
      <polygon points={pts(P)} {...line} />
      {P.map((p, i) => {
        const m = mid(p, P[(i + 1) % 4]);
        const k = 1 + 16 / Math.hypot(m[0] - c[0], m[1] - c[1]);
        return <T key={names[i]} x={c[0] + (m[0] - c[0]) * k} y={c[1] + (m[1] - c[1]) * k + 4}>{names[i]}</T>;
      })}
    </Svg>
  );
}

function Ngon({ n }) {
  const sides = Math.min(MAX_SIDES, Math.max(MIN_SIDES, Math.round(n) || 6));
  const c = [120, 84];
  const R = 70;
  const P = polygonPoints(sides, c[0], c[1], R);
  const foot = mid(P[0], P[1]);
  const name = POLYGON_NAMES[sides].replace(/ \(.*\)/, '');
  return (
    <Svg label={`${name}, ${sides} sides: side s, apothem a from the centre to a side's middle, circumradius R to a corner`} viewBox="0 0 240 168">
      <polygon points={pts(P)} {...fill} />
      <polygon points={pts(P)} {...line} />
      <line x1={c[0]} y1={c[1]} x2={P[0][0]} y2={P[0][1]} {...measure} />
      <line x1={c[0]} y1={c[1]} x2={foot[0]} y2={foot[1]} {...measure} />
      <Dot at={c} />
      <T x={(c[0] + P[0][0]) / 2 - 6} y={(c[1] + P[0][1]) / 2} anchor="end">R</T>
      <T x={(c[0] + foot[0]) / 2 + 4} y={(c[1] + foot[1]) / 2 + 14} anchor="start">a</T>
      <T x={foot[0] + (foot[0] - c[0]) * 0.22} y={foot[1] + (foot[1] - c[1]) * 0.22 + 4}>s</T>
    </Svg>
  );
}

function CircleFigure() {
  return (
    <Svg label="Circle with radius r and diameter d">
      <circle cx="120" cy="80" r="64" {...fill} />
      <line x1="120" y1="16" x2="120" y2="144" {...dashed} />
      <line x1="120" y1="80" x2="184" y2="80" {...measure} />
      <circle cx="120" cy="80" r="64" {...line} />
      <Dot at={[120, 80]} />
      <T x={152} y={74}>r</T><T x={110} y={44} anchor="end">d</T>
    </Svg>
  );
}

function Sector() {
  const c = [70, 135];
  const r = 120;
  const t = Math.PI / 3;
  const p2 = [c[0] + r * Math.cos(t), c[1] - r * Math.sin(t)];
  return (
    <Svg label="Sector: two radii r with angle θ between them and the arc s">
      <path d={`M${c} L${c[0] + r},${c[1]} A${r},${r} 0 0 0 ${p2} Z`} {...fill} />
      <path d={`M${c} L${c[0] + r},${c[1]} A${r},${r} 0 0 0 ${p2} Z`} {...line} />
      <path d={`M${c[0] + 22},${c[1]} A22,22 0 0 0 ${c[0] + 22 * Math.cos(t)},${c[1] - 22 * Math.sin(t)}`} fill="none" stroke={GUIDE} strokeWidth="1.25" />
      <T x={130} y={152}>r</T><T x={98} y={122} size={12}>θ</T><T x={202} y={62} anchor="start">s</T><T x={92} y={78} anchor="end">r</T>
    </Svg>
  );
}

function Segment() {
  const c = [120, 100];
  const r = 70;
  const p1 = [c[0] - r * Math.SQRT1_2, c[1] - r * Math.SQRT1_2];
  const p2 = [c[0] + r * Math.SQRT1_2, c[1] - r * Math.SQRT1_2];
  return (
    <Svg label="Segment: the part of a circle above a chord c, with height h and central angle θ" viewBox="0 0 240 168">
      <circle cx={c[0]} cy={c[1]} r={r} {...dashed} />
      <path d={`M${p1} A${r},${r} 0 0 1 ${p2} Z`} {...fill} />
      <path d={`M${p1} A${r},${r} 0 0 1 ${p2} Z`} {...line} />
      <polyline points={pts([p1, c, p2])} {...dashed} />
      <line x1={c[0]} y1={p1[1]} x2={c[0]} y2={c[1] - r} {...measure} />
      <Dot at={c} />
      <T x={126} y={46} anchor="start">h</T><T x={102} y={66}>c</T><T x={120} y={90} size={12}>θ</T><T x={150} y={84} anchor="start">r</T>
    </Svg>
  );
}

function Annulus() {
  const ring = 'M50,82 A70,70 0 1 0 190,82 A70,70 0 1 0 50,82 Z M82,82 A38,38 0 1 1 158,82 A38,38 0 1 1 82,82 Z';
  return (
    <Svg label="Annulus: the ring between an outer circle of radius R and an inner circle of radius r">
      <path d={ring} fillRule="evenodd" {...fill} />
      <circle cx="120" cy="82" r="70" {...line} />
      <circle cx="120" cy="82" r="38" {...line} />
      <line x1="120" y1="82" x2="190" y2="82" {...measure} />
      <line x1="120" y1="82" x2="93" y2="55" {...measure} />
      <Dot at={[120, 82]} />
      <T x={172} y={76}>R</T><T x={100} y={74} anchor="end">r</T>
    </Svg>
  );
}

function Chords() {
  const c = [92, 84];
  const r = 62;
  const at = (degrees) => [c[0] + r * Math.cos((degrees * Math.PI) / 180), c[1] - r * Math.sin((degrees * Math.PI) / 180)];
  const [p1, p2, q1, q2] = [at(125), at(250), at(170), at(300)];
  const cross = (() => {
    const d = (p2[0] - p1[0]) * (q2[1] - q1[1]) - (p2[1] - p1[1]) * (q2[0] - q1[0]);
    const k = ((q1[0] - p1[0]) * (q2[1] - q1[1]) - (q1[1] - p1[1]) * (q2[0] - q1[0])) / d;
    return [p1[0] + k * (p2[0] - p1[0]), p1[1] + k * (p2[1] - p1[1])];
  })();
  const P = [226, 84];
  const dist = P[0] - c[0];
  const phi = Math.acos(r / dist);
  const Tp = [c[0] + r * Math.cos(phi), c[1] - r * Math.sin(phi)];
  const u = [(Tp[0] - c[0]) / r, (Tp[1] - c[1]) / r];
  const v = [(P[0] - Tp[0]) / Math.hypot(P[0] - Tp[0], P[1] - Tp[1]), (P[1] - Tp[1]) / Math.hypot(P[0] - Tp[0], P[1] - Tp[1])];
  return (
    <Svg label="Two chords crossing inside a circle, cut into a and b, and c and d; and a tangent t from a point P at distance d, at right angles to the radius r">
      <circle cx={c[0]} cy={c[1]} r={r} {...fill} />
      <circle cx={c[0]} cy={c[1]} r={r} {...line} />
      <line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} {...line} strokeWidth="1.75" />
      <line x1={q1[0]} y1={q1[1]} x2={q2[0]} y2={q2[1]} {...line} strokeWidth="1.75" />
      <line x1={c[0]} y1={c[1]} x2={Tp[0]} y2={Tp[1]} {...dashed} />
      <line x1={c[0]} y1={c[1]} x2={P[0]} y2={P[1]} {...dashed} />
      <RightAngle at={Tp} u={[-u[0], -u[1]]} v={v} size={8} />
      <line x1={Tp[0]} y1={Tp[1]} x2={P[0]} y2={P[1]} {...measure} strokeDasharray="none" />
      <Dot at={cross} /><Dot at={c} /><Dot at={P} />
      <T x={60} y={50} size={12}>a</T><T x={84} y={136} size={12}>b</T><T x={42} y={92} size={12}>c</T><T x={110} y={116} size={12}>d</T>
      <T x={180} y={52}>t</T><T x={128} y={58} size={12}>r</T><T x={232} y={100}>P</T><T x={170} y={98} size={12}>d</T>
    </Svg>
  );
}

// ---- Solids drawn from their corners -------------------------------------------

const cube = (x, y, z) => [-1, 1].flatMap((i) => [-1, 1].flatMap((j) => [-1, 1].map((k) => [i * x, j * y, k * z])));
const square = (half, y) => [[-half, y, -half], [half, y, -half], [half, y, half], [-half, y, half]];

const POLYHEDRA = {
  prism: { points: cube(1.2, 0.7, 0.7), labels: [[[0, -0.7, 0.7], 'l', [0, 16]], [[1.2, -0.7, 0], 'w', [12, 10]], [[1.2, 0, 0.7], 'h', [-12, 4]]], label: 'Box with length l, width w and height h' },
  pyramid: { points: [...square(1, -0.8), [0, 1, 0]], height: [[0, 1, 0], [0, -0.8, 0]], labels: [[[0, -0.8, 1], 'a', [0, 16]], [[0, 0.1, 0], 'h', [8, 4]]], label: 'Square pyramid with base side a and height h from the apex to the base' },
  'pyramid-frustum': { points: [...square(1, -0.7), ...square(0.5, 0.7)], height: [[0, 0.7, 0], [0, -0.7, 0]], labels: [[[0, -0.7, 1], 'A₁', [0, 18]], [[0, 0.7, 0], 'A₂', [0, -10]], [[0, 0, 0], 'h', [8, 4]]], label: 'Frustum of a square pyramid: bottom base A1, top base A2, height h' },
  prismatoid: {
    points: [[-1.2, -0.7, -0.6], [1.2, -0.7, -0.6], [1.2, -0.7, 0.6], [-1.2, -0.7, 0.6], [-0.5, 0.7, -0.9], [0.5, 0.7, -0.9], [0.5, 0.7, 0.9], [-0.5, 0.7, 0.9]],
    height: [[0, 0.7, 0], [0, -0.7, 0]],
    labels: [[[0, -0.7, 0.6], 'A₁', [0, 18]], [[0, 0.7, -0.9], 'A₂', [0, -10]], [[0, 0, 0], 'h', [8, 4]]],
    label: 'Prismatoid: a rectangle below and a narrower, deeper rectangle above, height h apart',
  },
};
for (const p of PLATONIC) POLYHEDRA[p.id] = { points: p.points, label: `${p.name}: ${p.faces} ${p.face.toLowerCase()} faces, ${p.vertices} vertices, ${p.edges} edges` };

const solidCache = new Map();
function solidOf(id) {
  if (!solidCache.has(id)) {
    const { points } = POLYHEDRA[id];
    const faces = convexFaces(points);
    solidCache.set(id, { faces, edges: convexEdges(points, faces) });
  }
  return solidCache.get(id);
}

function Polyhedron({ id }) {
  const spec = POLYHEDRA[id];
  const { faces, edges } = solidOf(id);
  const seen = spec.points.map((p) => viewOf(p));
  const xs = seen.map((p) => p[0]);
  const ys = seen.map((p) => p[1]);
  const scale = Math.min(184 / (Math.max(...xs) - Math.min(...xs)), 124 / (Math.max(...ys) - Math.min(...ys)));
  const ox = 120 - ((Math.max(...xs) + Math.min(...xs)) / 2) * scale;
  const oy = 90 - ((Math.max(...ys) + Math.min(...ys)) / 2) * scale;
  const toPage = (p) => [ox + p[0] * scale, oy + p[1] * scale];
  const page = seen.map(toPage);
  const facing = faces.map((face) => viewOf(face.normal)[2] > 1e-9);
  const ordered = (face) => {
    const c = face.vertices.reduce((s, i) => [s[0] + page[i][0] / face.vertices.length, s[1] + page[i][1] / face.vertices.length], [0, 0]);
    return [...face.vertices].sort((i, j) => Math.atan2(page[i][1] - c[1], page[i][0] - c[0]) - Math.atan2(page[j][1] - c[1], page[j][0] - c[0]));
  };
  return (
    <Svg label={spec.label} viewBox="0 0 240 180">
      {faces.map((face, i) => (facing[i] ? <polygon key={face.vertices.join()} points={pts(ordered(face).map((v) => page[v]))} {...fill} /> : null))}
      {edges.filter((e) => !e.faces.some((face) => facing[faces.indexOf(face)])).map(({ ends: [i, j] }) => (
        <line key={`${i}-${j}`} x1={page[i][0]} y1={page[i][1]} x2={page[j][0]} y2={page[j][1]} {...dashed} />
      ))}
      {spec.height && (() => {
        const [p, q] = spec.height.map((h) => toPage(viewOf(h)));
        return <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} {...measure} />;
      })()}
      {edges.filter((e) => e.faces.some((face) => facing[faces.indexOf(face)])).map(({ ends: [i, j] }) => (
        <line key={`${i}-${j}`} x1={page[i][0]} y1={page[i][1]} x2={page[j][0]} y2={page[j][1]} {...line} />
      ))}
      {spec.labels?.map(([at, text, [dx, dy]]) => {
        const [x, y] = toPage(viewOf(at));
        return <T key={text} x={x + dx} y={y + dy}>{text}</T>;
      })}
    </Svg>
  );
}

// ---- Round solids -------------------------------------------------------------

// The front half of a level ellipse solid, the back half dashed.
function Rim({ cx, cy, rx, ry }) {
  return (
    <>
      <path d={`M${cx - rx},${cy} A${rx},${ry} 0 0 1 ${cx + rx},${cy}`} {...dashed} />
      <path d={`M${cx - rx},${cy} A${rx},${ry} 0 0 0 ${cx + rx},${cy}`} {...line} />
    </>
  );
}

function Cylinder() {
  return (
    <Svg label="Cylinder with radius r and height h" viewBox="0 0 240 180">
      <path d="M65,35 A55,14 0 0 1 175,35 L175,145 A55,14 0 0 1 65,145 Z" {...fill} />
      <ellipse cx="120" cy="35" rx="55" ry="14" {...line} />
      <line x1="65" y1="35" x2="65" y2="145" {...line} />
      <line x1="175" y1="35" x2="175" y2="145" {...line} />
      <Rim cx={120} cy={145} rx={55} ry={14} />
      <line x1="120" y1="35" x2="175" y2="35" {...measure} />
      <line x1="196" y1="35" x2="196" y2="145" {...measure} />
      <T x={148} y={30}>r</T><T x={204} y={94} anchor="start">h</T>
    </Svg>
  );
}

function Cone() {
  return (
    <Svg label="Cone with base radius r, height h and slant height ℓ" viewBox="0 0 240 180">
      <path d="M120,22 L180,145 A60,14 0 0 1 60,145 Z" {...fill} />
      <polyline points="60,145 120,22 180,145" {...line} />
      <Rim cx={120} cy={145} rx={60} ry={14} />
      <line x1="120" y1="22" x2="120" y2="145" {...measure} />
      <line x1="120" y1="145" x2="180" y2="145" {...measure} />
      <T x={126} y={96} anchor="start">h</T><T x={150} y={140}>r</T><T x={158} y={78} anchor="start">ℓ</T>
    </Svg>
  );
}

function ConeFrustum() {
  return (
    <Svg label="Frustum of a cone with bottom radius R, top radius r, height h and slant height ℓ" viewBox="0 0 240 180">
      <path d="M90,40 A30,8 0 0 1 150,40 L185,145 A65,15 0 0 1 55,145 Z" {...fill} />
      <ellipse cx="120" cy="40" rx="30" ry="8" {...line} />
      <line x1="90" y1="40" x2="55" y2="145" {...line} />
      <line x1="150" y1="40" x2="185" y2="145" {...line} />
      <Rim cx={120} cy={145} rx={65} ry={15} />
      <line x1="120" y1="40" x2="120" y2="145" {...measure} />
      <line x1="120" y1="40" x2="150" y2="40" {...measure} />
      <line x1="120" y1="145" x2="185" y2="145" {...measure} />
      <T x={135} y={34}>r</T><T x={152} y={140}>R</T><T x={114} y={98} anchor="end">h</T><T x={176} y={90} anchor="start">ℓ</T>
    </Svg>
  );
}

function SphereFigure() {
  return (
    <Svg label="Sphere with radius r" viewBox="0 0 240 180">
      <circle cx="120" cy="90" r="70" {...fill} />
      <circle cx="120" cy="90" r="70" {...line} />
      <Rim cx={120} cy={90} rx={70} ry={18} />
      <line x1="120" y1="90" x2="166" y2="37" {...measure} />
      <Dot at={[120, 90]} />
      <T x={150} y={70} anchor="start">r</T>
    </Svg>
  );
}

// A cap above the plane y = 65 of a sphere centred at (120, 95), radius 70.
const CAP = { left: [120 - 63.25, 65], right: [120 + 63.25, 65] };

function SphericalSegment() {
  return (
    <Svg label="Spherical segment of one base (a cap) of height h and base radius a, cut from a sphere of radius r" viewBox="0 0 240 180">
      <circle cx="120" cy="95" r="70" {...dashed} />
      <path d={`M${CAP.left} A70,70 0 0 1 ${CAP.right} A63.25,14 0 0 1 ${CAP.left} Z`} {...fill} />
      <path d={`M${CAP.left} A70,70 0 0 1 ${CAP.right}`} {...line} />
      <Rim cx={120} cy={65} rx={63.25} ry={14} />
      <line x1="120" y1="25" x2="120" y2="65" {...measure} />
      <line x1="120" y1="65" x2={CAP.right[0]} y2="65" {...measure} />
      <line x1="120" y1="95" x2={CAP.right[0]} y2="65" {...dashed} />
      <Dot at={[120, 95]} />
      <T x={114} y={50} anchor="end">h</T><T x={150} y={60}>a</T><T x={156} y={96}>r</T>
    </Svg>
  );
}

function SphericalSector() {
  return (
    <Svg label="Spherical sector: a cone from the centre of a sphere of radius r, capped by a cap of height h" viewBox="0 0 240 180">
      <circle cx="120" cy="95" r="70" {...dashed} />
      <path d={`M120,95 L${CAP.left} A70,70 0 0 1 ${CAP.right} Z`} {...fill} />
      <path d={`M${CAP.right} L120,95 L${CAP.left} A70,70 0 0 1 ${CAP.right}`} {...line} />
      <Rim cx={120} cy={65} rx={63.25} ry={14} />
      <line x1="120" y1="25" x2="120" y2="65" {...measure} />
      <Dot at={[120, 95]} />
      <T x={114} y={50} anchor="end">h</T><T x={160} y={92}>r</T>
    </Svg>
  );
}

function Zone() {
  const top = [63.25, 60];
  const bottom = [67.08, 110];
  return (
    <Svg label="Zone: the band of a sphere of radius r between two parallel planes h apart" viewBox="0 0 240 180">
      <circle cx="120" cy="90" r="70" {...line} strokeWidth="1.5" />
      <path d={`M${120 - top[0]},${top[1]} A${top[0]},13 0 0 0 ${120 + top[0]},${top[1]} A70,70 0 0 1 ${120 + bottom[0]},${bottom[1]} A${bottom[0]},14 0 0 1 ${120 - bottom[0]},${bottom[1]} A70,70 0 0 1 ${120 - top[0]},${top[1]} Z`} {...fill} />
      <Rim cx={120} cy={top[1]} rx={top[0]} ry={13} />
      <Rim cx={120} cy={bottom[1]} rx={bottom[0]} ry={14} />
      <line x1="212" y1={top[1]} x2="212" y2={bottom[1]} {...measure} />
      <line x1="120" y1="90" x2="120" y2="20" {...dashed} />
      <T x={220} y={89} anchor="start">h</T><T x={126} y={44} anchor="start">r</T>
    </Svg>
  );
}

function Lune() {
  return (
    <Svg label="Lune and wedge: the part of a sphere of radius r between two half-planes through its axis at angle θ" viewBox="0 0 240 180">
      <circle cx="120" cy="90" r="70" {...line} strokeWidth="1.5" />
      <path d="M120,20 A62,70 0 0 1 120,160 A20,70 0 0 0 120,20 Z" {...fill} fillOpacity="0.22" />
      <path d="M120,20 A62,70 0 0 1 120,160" {...line} />
      <path d="M120,20 A20,70 0 0 1 120,160" {...line} />
      <Rim cx={120} cy={90} rx={70} ry={16} />
      <line x1="120" y1="20" x2="120" y2="160" {...dashed} />
      <T x={152} y={60} size={12}>θ</T><T x={84} y={84}>r</T>
      <line x1="120" y1="90" x2="50" y2="90" {...measure} />
    </Svg>
  );
}

function Torus() {
  return (
    <Svg label="Torus: a tube of radius r swept round a circle of radius R" viewBox="0 0 240 180">
      <ellipse cx="120" cy="90" rx="100" ry="52" {...fill} />
      <ellipse cx="120" cy="90" rx="100" ry="52" {...line} />
      <path d="M65,82 A55,20 0 0 0 175,82" {...line} />
      <path d="M80,96 A40,12 0 0 1 160,96" {...line} />
      <circle cx="193" cy="90" r="27" {...dashed} />
      <line x1="120" y1="90" x2="193" y2="90" {...measure} />
      <line x1="193" y1="90" x2="193" y2="63" {...measure} />
      <Dot at={[120, 90]} /><Dot at={[193, 90]} />
      <T x={156} y={106}>R</T><T x={199} y={78} anchor="start">r</T>
    </Svg>
  );
}

function Ellipsoid() {
  return (
    <Svg label="Ellipsoid with semi-axes a, b and c" viewBox="0 0 240 180">
      <ellipse cx="120" cy="90" rx="96" ry="58" {...fill} />
      <ellipse cx="120" cy="90" rx="96" ry="58" {...line} />
      <Rim cx={120} cy={90} rx={96} ry={18} />
      <line x1="120" y1="90" x2="216" y2="90" {...measure} />
      <line x1="120" y1="90" x2="120" y2="32" {...measure} />
      <line x1="120" y1="90" x2="96" y2="106" {...measure} />
      <T x={170} y={84}>a</T><T x={92} y={124}>b</T><T x={126} y={58} anchor="start">c</T>
    </Svg>
  );
}

// ---- Conics (2026-11-16, for Lessons › Analytic Geometry) -------------------
const curve = (n, f) => Array.from({ length: n + 1 }, (_, i) => f(i / n)).map((p) => p.map((v) => Math.round(v * 10) / 10));
const pathOf = (points) => `M${points.map((p) => p.join(',')).join(' L')}`;

function Parabola() {
  // y² = 4ax opening right: vertex V, focus F a to its right, directrix a to its left.
  const V = [70, 80];
  const s = 24; // pixels per unit, a = 1
  const points = curve(48, (u) => { const y = -3 + 6 * u; return [V[0] + s * (y * y) / 4, V[1] - s * y]; });
  const F = [V[0] + s, V[1]];
  return (
    <Svg label="Parabola: vertex V, focus F a distance a away, directrix the same distance behind the vertex, and the latus rectum through the focus">
      <line x1="28" y1={V[1]} x2="226" y2={V[1]} {...dashed} />
      <line x1={V[0] - s} y1="10" x2={V[0] - s} y2="150" {...dashed} />
      <line x1={F[0]} y1={V[1] - 2 * s} x2={F[0]} y2={V[1] + 2 * s} {...measure} />
      <path d={pathOf(points)} {...line} />
      <Dot at={V} /><Dot at={F} />
      <T x={V[0] - 5} y={V[1] + 15} anchor="end">V</T>
      <T x={F[0] + 6} y={V[1] + 15} anchor="start">F</T>
      <T x={F[0] + 6} y={V[1] - 30} anchor="start" size={11}>LR</T>
      <T x={V[0] - s - 4} y="22" anchor="end" size={11}>directrix</T>
      <T x={(V[0] + F[0]) / 2} y={V[1] - 6} size={12}>a</T>
    </Svg>
  );
}

function EllipseFigure() {
  const C = [120, 84];
  const [a, b] = [96, 56];
  const c = Math.sqrt(a * a - b * b);
  const F1 = [C[0] - c, C[1]];
  const F2 = [C[0] + c, C[1]];
  const t = 1.1;
  const P = [C[0] + a * Math.cos(t), C[1] - b * Math.sin(t)];
  return (
    <Svg label="Ellipse with semi-major axis a, semi-minor axis b and foci F1 and F2; from any point P the distances to the foci add to 2a" viewBox="0 0 240 168">
      <ellipse cx={C[0]} cy={C[1]} rx={a} ry={b} {...fill} />
      <line x1={C[0] - a} y1={C[1]} x2={C[0] + a} y2={C[1]} {...dashed} />
      <line x1={C[0]} y1={C[1] - b} x2={C[0]} y2={C[1] + b} {...dashed} />
      <polyline points={pts([F1, P, F2])} {...dashed} />
      <line x1={C[0]} y1={C[1] + 1} x2={C[0] + a} y2={C[1] + 1} {...measure} />
      <line x1={C[0] - 1} y1={C[1]} x2={C[0] - 1} y2={C[1] - b} {...measure} />
      <ellipse cx={C[0]} cy={C[1]} rx={a} ry={b} {...line} />
      <Dot at={F1} /><Dot at={F2} /><Dot at={P} />
      <T x={F1[0]} y={C[1] + 16}>F₁</T><T x={F2[0]} y={C[1] + 16}>F₂</T>
      <T x={P[0] + 6} y={P[1] - 4} anchor="start">P</T>
      <T x={C[0] + a / 2 + 10} y={C[1] - 5} size={12}>a</T>
      <T x={C[0] - 7} y={C[1] - b / 2} anchor="end" size={12}>b</T>
    </Svg>
  );
}

function HyperbolaFigure() {
  const C = [120, 84];
  const [a, b] = [36, 28];
  const c = Math.sqrt(a * a + b * b);
  const branch = (side) => curve(40, (u) => { const t = -1.7 + 3.4 * u; return [C[0] + side * a * Math.cosh(t), C[1] - b * Math.sinh(t)]; });
  const k = b / a;
  return (
    <Svg label="Hyperbola: two branches between the asymptotes y = ±(b/a)x, vertices a from the centre, foci F1 and F2 c from the centre" viewBox="0 0 240 168">
      <line x1="20" y1={C[1] + 100 * k} x2="220" y2={C[1] - 100 * k} {...dashed} />
      <line x1="20" y1={C[1] - 100 * k} x2="220" y2={C[1] + 100 * k} {...dashed} />
      <line x1="16" y1={C[1]} x2="224" y2={C[1]} {...dashed} />
      <line x1={C[0]} y1={C[1] - 1} x2={C[0] + a} y2={C[1] - 1} {...measure} />
      <path d={pathOf(branch(1))} {...line} />
      <path d={pathOf(branch(-1))} {...line} />
      <Dot at={[C[0] - c, C[1]]} /><Dot at={[C[0] + c, C[1]]} />
      <T x={C[0] - c} y={C[1] + 16}>F₁</T><T x={C[0] + c} y={C[1] + 16}>F₂</T>
      <T x={C[0] + a / 2} y={C[1] - 6} size={12}>a</T>
    </Svg>
  );
}

const FIGURES = {
  triangle: Triangle,
  'triangle-centres': TriangleCentres,
  square: Square,
  rectangle: Rectangle,
  parallelogram: Parallelogram,
  rhombus: Rhombus,
  trapezoid: Trapezoid,
  kite: Kite,
  cyclic: Cyclic,
  circle: CircleFigure,
  sector: Sector,
  segment: Segment,
  annulus: Annulus,
  chords: Chords,
  cylinder: Cylinder,
  cone: Cone,
  'cone-frustum': ConeFrustum,
  sphere: SphereFigure,
  'spherical-segment': SphericalSegment,
  'spherical-sector': SphericalSector,
  zone: Zone,
  lune: Lune,
  torus: Torus,
  ellipsoid: Ellipsoid,
  parabola: Parabola,
  ellipse: EllipseFigure,
  hyperbola: HyperbolaFigure,
};

export default function ShapeFigure({ figure, n, kind, name }) {
  if (figure === 'ngon') return <Ngon n={n} />;
  if (figure === 'kind') return <TriangleKind kind={kind} name={name} />;
  if (POLYHEDRA[figure]) return <Polyhedron id={figure} />;
  const Figure = FIGURES[figure];
  return Figure ? <Figure /> : null;
}


