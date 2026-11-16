// src/features/conversion/shapes/shapes.js
//
// Plane figures and solids: their names, formulas (LaTeX) and small calculators,
// as data and pure maths. ShapesPanel draws it; shapes.test.js checks every
// formula against known values. A calculator's `solve` takes numbers already
// parsed and above zero, and returns `{ error }` or `{ results }`, each result
// with its working: the formula, then the numbers put in.
import { formatNumber } from '../calc';

const tex = String.raw;
const { PI, sqrt, sin, cos, tan, acos } = Math;
const rad = (degrees) => (degrees * PI) / 180;
const deg = (radians) => (radians * 180) / PI;
const f = (n) => formatNumber(n, 6);
const clamp = (x) => Math.min(1, Math.max(-1, x));
// Equal to a part in a billion: sides typed as 1 and 1.0000000001 are one length.
const same = (x, y) => Math.abs(x - y) <= 1e-9 * Math.max(Math.abs(x), Math.abs(y));

// One answer with its working, "A = ½bh = ½ × 6 × 4 = 12".
export function out(label, symbol, formula, put, value, unit = '') {
  const steps = [formula, put].filter((step, i, all) => step && all.indexOf(step) === i);
  return { label, value, unit, working: `${symbol} = ${[...steps, `${f(value)}${unit}`].join(' = ')}` };
}
const fact = (label, text) => ({ label, text });
const capital = (word) => word[0].toUpperCase() + word.slice(1);
const fail = (error) => ({ error });
const DEGREE = '°';

// ---- Triangles --------------------------------------------------------------

export function kindBySides(a, b, c) {
  const pairs = [same(a, b), same(b, c), same(a, c)].filter(Boolean).length;
  if (pairs === 3) return 'equilateral';
  return pairs >= 1 ? 'isosceles' : 'scalene';
}

export function kindByAngles(a, b, c) {
  const [x, y, z] = [a, b, c].sort((p, q) => p - q);
  if (same(x * x + y * y, z * z)) return 'right';
  return x * x + y * y > z * z ? 'acute' : 'obtuse';
}

export const closes = (sides) => {
  const total = sides.reduce((sum, s) => sum + s, 0);
  return sides.every((s) => s < total - s);
};

export function triangleFromSides(a, b, c) {
  if (!closes([a, b, c])) return null;
  const s = (a + b + c) / 2;
  const area = sqrt(s * (s - a) * (s - b) * (s - c));
  const angle = (opposite, x, y) => deg(acos(clamp((x * x + y * y - opposite * opposite) / (2 * x * y))));
  const A = angle(a, b, c);
  const B = angle(b, a, c);
  return {
    s, perimeter: a + b + c, area, A, B, C: 180 - A - B,
    r: area / s, R: (a * b * c) / (4 * area),
    medians: [sqrt(2 * b * b + 2 * c * c - a * a) / 2, sqrt(2 * a * a + 2 * c * c - b * b) / 2, sqrt(2 * a * a + 2 * b * b - c * c) / 2],
  };
}

const SIDES_CLOSE = 'Those sides can’t close: each has to be shorter than the other two together.';
const UNDER_180 = 'The angle has to be under 180°.';
const UP_TO_360 = 'The angle can be at most 360°.';

const sss = { id: 'sss', label: 'Three sides', inputs: [['a', 'Side a', '3'], ['b', 'Side b', '4'], ['c', 'Side c', '5']] };

const triangle = {
  id: 'triangle',
  name: 'Any triangle',
  figure: 'triangle',
  about: 'Side a faces corner A, b faces B, c faces C.',
  formulas: [
    ['Area, base and height', tex`A = \tfrac{1}{2}bh`],
    ['Area, two sides and the angle between', tex`A = \tfrac{1}{2}ab\sin C`],
    ['Area, three sides (Heron)', tex`A = \sqrt{s(s-a)(s-b)(s-c)},\quad s = \tfrac{a+b+c}{2}`],
    ['Perimeter', tex`P = a + b + c`],
    ['Law of cosines', tex`c^2 = a^2 + b^2 - 2ab\cos C`],
    ['Law of sines', tex`\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C} = 2R`],
  ],
  calcs: [
    {
      ...sss,
      solve: ({ a, b, c }) => {
        const t = triangleFromSides(a, b, c);
        if (!t) return fail(SIDES_CLOSE);
        return {
          results: [
            fact('By its sides', capital(kindBySides(a, b, c))),
            fact('By its angles', capital(kindByAngles(a, b, c))),
            out('Half the perimeter', 's', '(a + b + c) ÷ 2', `(${f(a)} + ${f(b)} + ${f(c)}) ÷ 2`, t.s),
            out('Area', 'A', '√(s(s − a)(s − b)(s − c))', `√(${f(t.s)} × ${f(t.s - a)} × ${f(t.s - b)} × ${f(t.s - c)})`, t.area),
            out('Perimeter', 'P', 'a + b + c', `${f(a)} + ${f(b)} + ${f(c)}`, t.perimeter),
            out('Angle A', 'A', 'cos⁻¹((b² + c² − a²) ÷ 2bc)', `cos⁻¹((${f(b)}² + ${f(c)}² − ${f(a)}²) ÷ (2 × ${f(b)} × ${f(c)}))`, t.A, DEGREE),
            out('Angle B', 'B', 'cos⁻¹((a² + c² − b²) ÷ 2ac)', `cos⁻¹((${f(a)}² + ${f(c)}² − ${f(b)}²) ÷ (2 × ${f(a)} × ${f(c)}))`, t.B, DEGREE),
            out('Angle C', 'C', '180° − A − B', `180° − ${f(t.A)}° − ${f(t.B)}°`, t.C, DEGREE),
          ],
        };
      },
    },
    {
      id: 'sas',
      label: 'Two sides, angle',
      inputs: [['a', 'Side a', '5'], ['b', 'Side b', '7'], ['C', 'Angle C between them (°)', '60']],
      solve: ({ a, b, C }) => {
        if (C >= 180) return fail(UNDER_180);
        const c = sqrt(a * a + b * b - 2 * a * b * cos(rad(C)));
        return {
          results: [
            out('Area', 'A', '½ab sin C', `½ × ${f(a)} × ${f(b)} × sin ${f(C)}°`, (a * b * sin(rad(C))) / 2),
            out('Third side', 'c', '√(a² + b² − 2ab cos C)', `√(${f(a)}² + ${f(b)}² − 2 × ${f(a)} × ${f(b)} × cos ${f(C)}°)`, c),
            out('Perimeter', 'P', 'a + b + c', `${f(a)} + ${f(b)} + ${f(c)}`, a + b + c),
          ],
        };
      },
    },
    {
      id: 'bh',
      label: 'Base, height',
      inputs: [['b', 'Base b', '6'], ['h', 'Height h', '4']],
      solve: ({ b, h }) => ({ results: [out('Area', 'A', '½bh', `½ × ${f(b)} × ${f(h)}`, (b * h) / 2)] }),
    },
  ],
};

const triangleKinds = {
  id: 'triangle-kinds',
  name: 'Kinds of triangle',
  figure: 'triangle-kinds',
  kinds: [
    { by: 'By sides', items: [
      { id: 'equilateral', name: 'Equilateral', rule: 'Three equal sides; every angle is 60°.' },
      { id: 'isosceles', name: 'Isosceles', rule: 'Two equal sides; the angles facing them are equal.' },
      { id: 'scalene', name: 'Scalene', rule: 'No two sides equal.' },
    ] },
    { by: 'By angles', items: [
      { id: 'acute', name: 'Acute', rule: 'Every angle under 90°.', tex: tex`c^2 < a^2 + b^2` },
      { id: 'right', name: 'Right', rule: 'One angle of 90°.', tex: tex`c^2 = a^2 + b^2` },
      { id: 'obtuse', name: 'Obtuse', rule: 'One angle over 90°.', tex: tex`c^2 > a^2 + b^2` },
    ] },
  ],
  about: 'For the angle tests, c is the longest side.',
  formulas: [['Angles add to', tex`A + B + C = 180^\circ`]],
};

const triangleCentres = {
  id: 'triangle-centres',
  name: 'Centres of a triangle',
  figure: 'triangle-centres',
  formulas: [
    ['Centroid G: where the medians meet, ⅔ of the way from each corner', tex`G = \left(\tfrac{x_1+x_2+x_3}{3},\ \tfrac{y_1+y_2+y_3}{3}\right)`],
    ['Median to side a', tex`m_a = \tfrac{1}{2}\sqrt{2b^2 + 2c^2 - a^2}`],
    ['Incentre I: where the angle bisectors meet; the inscribed circle', tex`r = \frac{A}{s}`],
    ['Circumcentre O: where the perpendicular bisectors meet; the circle through the corners', tex`R = \frac{abc}{4A}`],
    ['Orthocentre H: where the altitudes meet', tex`h_a = \frac{2A}{a}`],
    ['Euler line: O, G and H in a row', tex`OG : GH = 1 : 2,\quad OI^2 = R(R - 2r)`],
  ],
  calcs: [{
    ...sss,
    solve: ({ a, b, c }) => {
      const t = triangleFromSides(a, b, c);
      if (!t) return fail(SIDES_CLOSE);
      const [ma, mb, mc] = t.medians;
      return {
        results: [
          out('Area', 'A', '√(s(s − a)(s − b)(s − c))', `√(${f(t.s)} × ${f(t.s - a)} × ${f(t.s - b)} × ${f(t.s - c)})`, t.area),
          out('Inradius', 'r', 'A ÷ s', `${f(t.area)} ÷ ${f(t.s)}`, t.r),
          out('Circumradius', 'R', 'abc ÷ 4A', `${f(a)} × ${f(b)} × ${f(c)} ÷ (4 × ${f(t.area)})`, t.R),
          out('Median to a', 'mₐ', '½√(2b² + 2c² − a²)', `½√(2 × ${f(b)}² + 2 × ${f(c)}² − ${f(a)}²)`, ma),
          out('Median to b', 'm_b', '½√(2a² + 2c² − b²)', `½√(2 × ${f(a)}² + 2 × ${f(c)}² − ${f(b)}²)`, mb),
          out('Median to c', 'm_c', '½√(2a² + 2b² − c²)', `½√(2 × ${f(a)}² + 2 × ${f(b)}² − ${f(c)}²)`, mc),
          out('Incentre to circumcentre', 'OI', '√(R(R − 2r))', `√(${f(t.R)} × (${f(t.R)} − 2 × ${f(t.r)}))`, sqrt(Math.max(0, t.R * (t.R - 2 * t.r)))),
        ],
      };
    },
  }],
};

// ---- Quadrilaterals ---------------------------------------------------------

export const brahmagupta = (a, b, c, d) => {
  const s = (a + b + c + d) / 2;
  return sqrt((s - a) * (s - b) * (s - c) * (s - d));
};

const quadrilaterals = [
  {
    id: 'square', name: 'Square', figure: 'square',
    formulas: [['Area', tex`A = a^2`], ['Perimeter', tex`P = 4a`], ['Diagonal', tex`d = a\sqrt{2}`]],
    calcs: [{ id: 'a', label: 'Side', inputs: [['a', 'Side a', '5']], solve: ({ a }) => ({ results: [
      out('Area', 'A', 'a²', `${f(a)}²`, a * a),
      out('Perimeter', 'P', '4a', `4 × ${f(a)}`, 4 * a),
      out('Diagonal', 'd', 'a√2', `${f(a)} × √2`, a * Math.SQRT2),
    ] }) }],
  },
  {
    id: 'rectangle', name: 'Rectangle', figure: 'rectangle',
    formulas: [['Area', tex`A = bh`], ['Perimeter', tex`P = 2(b + h)`], ['Diagonal', tex`d = \sqrt{b^2 + h^2}`]],
    calcs: [{ id: 'bh', label: 'Sides', inputs: [['b', 'Base b', '6'], ['h', 'Height h', '4']], solve: ({ b, h }) => ({ results: [
      out('Area', 'A', 'bh', `${f(b)} × ${f(h)}`, b * h),
      out('Perimeter', 'P', '2(b + h)', `2 × (${f(b)} + ${f(h)})`, 2 * (b + h)),
      out('Diagonal', 'd', '√(b² + h²)', `√(${f(b)}² + ${f(h)}²)`, sqrt(b * b + h * h)),
    ] }) }],
  },
  {
    id: 'parallelogram', name: 'Parallelogram', figure: 'parallelogram',
    formulas: [
      ['Area', tex`A = bh = ab\sin\theta`], ['Perimeter', tex`P = 2(a + b)`],
      ['Diagonals', tex`d_{1,2} = \sqrt{a^2 + b^2 \pm 2ab\cos\theta}`], ['Diagonals together', tex`d_1^2 + d_2^2 = 2(a^2 + b^2)`],
    ],
    calcs: [{ id: 'abt', label: 'Sides, angle', inputs: [['a', 'Side a', '5'], ['b', 'Base b', '8'], ['t', 'Angle θ (°)', '60']], solve: ({ a, b, t }) => {
      if (t >= 180) return fail(UNDER_180);
      const k = 2 * a * b * cos(rad(t));
      return { results: [
        out('Height', 'h', 'a sin θ', `${f(a)} × sin ${f(t)}°`, a * sin(rad(t))),
        out('Area', 'A', 'ab sin θ', `${f(a)} × ${f(b)} × sin ${f(t)}°`, a * b * sin(rad(t))),
        out('Perimeter', 'P', '2(a + b)', `2 × (${f(a)} + ${f(b)})`, 2 * (a + b)),
        out('Long diagonal', 'd₁', '√(a² + b² + 2ab cos θ)', `√(${f(a)}² + ${f(b)}² + 2 × ${f(a)} × ${f(b)} × cos ${f(t)}°)`, sqrt(a * a + b * b + Math.abs(k))),
        out('Short diagonal', 'd₂', '√(a² + b² − 2ab cos θ)', `√(${f(a)}² + ${f(b)}² − 2 × ${f(a)} × ${f(b)} × cos ${f(t)}°)`, sqrt(a * a + b * b - Math.abs(k))),
      ] };
    } }],
  },
  {
    id: 'rhombus', name: 'Rhombus', figure: 'rhombus',
    about: 'Four equal sides; the diagonals cross at right angles and halve each other.',
    formulas: [['Area', tex`A = \tfrac{1}{2}d_1 d_2 = a^2\sin\theta`], ['Side', tex`a = \sqrt{(d_1/2)^2 + (d_2/2)^2}`], ['Perimeter', tex`P = 4a`]],
    calcs: [{ id: 'dd', label: 'Diagonals', inputs: [['p', 'Diagonal d₁', '6'], ['q', 'Diagonal d₂', '8']], solve: ({ p, q }) => {
      const a = sqrt((p / 2) ** 2 + (q / 2) ** 2);
      return { results: [
        out('Area', 'A', '½d₁d₂', `½ × ${f(p)} × ${f(q)}`, (p * q) / 2),
        out('Side', 'a', '√((d₁/2)² + (d₂/2)²)', `√(${f(p / 2)}² + ${f(q / 2)}²)`, a),
        out('Perimeter', 'P', '4a', `4 × ${f(a)}`, 4 * a),
      ] };
    } }],
  },
  {
    id: 'trapezoid', name: 'Trapezoid', figure: 'trapezoid',
    about: 'One pair of parallel sides, a and b.',
    formulas: [
      ['Area', tex`A = \frac{a + b}{2}\,h`], ['Median (midline)', tex`m = \frac{a + b}{2}`],
      ['Perimeter', tex`P = a + b + c + d`], ['Isosceles: each leg', tex`c = \sqrt{h^2 + \left(\tfrac{a - b}{2}\right)^2}`],
    ],
    calcs: [{ id: 'abh', label: 'Bases, height', inputs: [['a', 'Base a', '8'], ['b', 'Base b', '4'], ['h', 'Height h', '3']], solve: ({ a, b, h }) => {
      const leg = sqrt(h * h + ((a - b) / 2) ** 2);
      return { results: [
        out('Area', 'A', '(a + b) h ÷ 2', `(${f(a)} + ${f(b)}) × ${f(h)} ÷ 2`, ((a + b) * h) / 2),
        out('Median', 'm', '(a + b) ÷ 2', `(${f(a)} + ${f(b)}) ÷ 2`, (a + b) / 2),
        out('Leg, if isosceles', 'c', '√(h² + ((a − b) ÷ 2)²)', `√(${f(h)}² + (${f(Math.abs(a - b) / 2)})²)`, leg),
        out('Perimeter, if isosceles', 'P', 'a + b + 2c', `${f(a)} + ${f(b)} + 2 × ${f(leg)}`, a + b + 2 * leg),
      ] };
    } }],
  },
  {
    id: 'kite', name: 'Kite', figure: 'kite',
    about: 'Two pairs of equal sides next to each other; the diagonals cross at right angles.',
    formulas: [['Area', tex`A = \tfrac{1}{2}pq`], ['Area, sides and the angle between', tex`A = ab\sin\theta`], ['Perimeter', tex`P = 2(a + b)`]],
    calcs: [
      { id: 'pq', label: 'Diagonals', inputs: [['p', 'Diagonal p', '6'], ['q', 'Diagonal q', '9']], solve: ({ p, q }) => ({ results: [
        out('Area', 'A', '½pq', `½ × ${f(p)} × ${f(q)}`, (p * q) / 2),
      ] }) },
      { id: 'abt', label: 'Sides, angle', inputs: [['a', 'Side a', '5'], ['b', 'Side b', '7'], ['t', 'Angle θ between a and b (°)', '90']], solve: ({ a, b, t }) => {
        if (t >= 180) return fail(UNDER_180);
        return { results: [
          out('Area', 'A', 'ab sin θ', `${f(a)} × ${f(b)} × sin ${f(t)}°`, a * b * sin(rad(t))),
          out('Perimeter', 'P', '2(a + b)', `2 × (${f(a)} + ${f(b)})`, 2 * (a + b)),
        ] };
      } },
    ],
  },
  {
    id: 'cyclic', name: 'Cyclic quadrilateral', figure: 'cyclic',
    about: 'Its four corners lie on one circle.',
    formulas: [
      ['Area (Brahmagupta)', tex`A = \sqrt{(s-a)(s-b)(s-c)(s-d)},\quad s = \tfrac{a+b+c+d}{2}`],
      ['Opposite angles', tex`A + C = B + D = 180^\circ`],
      ['Diagonals (Ptolemy)', tex`pq = ac + bd`],
      ['Any quadrilateral (Bretschneider)', tex`A = \sqrt{(s-a)(s-b)(s-c)(s-d) - abcd\cos^2\tfrac{A + C}{2}}`],
    ],
    calcs: [{ id: 'abcd', label: 'Four sides', inputs: [['a', 'Side a', '3'], ['b', 'Side b', '4'], ['c', 'Side c', '5'], ['d', 'Side d', '6']], solve: ({ a, b, c, d }) => {
      if (!closes([a, b, c, d])) return fail('Those sides can’t close: each has to be shorter than the other three together.');
      const s = (a + b + c + d) / 2;
      return { results: [
        out('Half the perimeter', 's', '(a + b + c + d) ÷ 2', `(${f(a)} + ${f(b)} + ${f(c)} + ${f(d)}) ÷ 2`, s),
        out('Area', 'A', '√((s − a)(s − b)(s − c)(s − d))', `√(${f(s - a)} × ${f(s - b)} × ${f(s - c)} × ${f(s - d)})`, brahmagupta(a, b, c, d)),
        out('Perimeter', 'P', 'a + b + c + d', `${f(a)} + ${f(b)} + ${f(c)} + ${f(d)}`, 2 * s),
      ] };
    } }],
  },
];

// ---- Regular polygons -------------------------------------------------------

export const POLYGON_NAMES = {
  3: 'Equilateral triangle', 4: 'Square', 5: 'Pentagon', 6: 'Hexagon', 7: 'Heptagon', 8: 'Octagon',
  9: 'Nonagon (enneagon)', 10: 'Decagon', 11: 'Hendecagon (undecagon)', 12: 'Dodecagon', 13: 'Tridecagon',
  14: 'Tetradecagon', 15: 'Pentadecagon', 16: 'Hexadecagon', 17: 'Heptadecagon', 18: 'Octadecagon',
  19: 'Enneadecagon', 20: 'Icosagon',
};
export const NAMED_IN_TABLE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20];
export const MIN_SIDES = 3;
export const MAX_SIDES = 20;

export const polygonAngles = (n) => ({
  interior: ((n - 2) * 180) / n, exterior: 360 / n, sum: (n - 2) * 180, diagonals: (n * (n - 3)) / 2,
});
export const areaFromSide = (n, s) => (n * s * s) / (4 * tan(PI / n));
export const areaFromApothem = (n, a) => n * a * a * tan(PI / n);
export const areaFromCircumradius = (n, R) => (n * R * R * sin((2 * PI) / n)) / 2;

// Side, apothem and circumradius from whichever one is known.
export function regularPolygon(n, known, value) {
  const t = PI / n;
  const side = { side: value, apothem: 2 * value * tan(t), circumradius: 2 * value * sin(t) }[known];
  return { side, apothem: side / (2 * tan(t)), circumradius: side / (2 * sin(t)), perimeter: n * side, area: areaFromSide(n, side) };
}

export const POLYGON_KNOWN = [
  { value: 'side', label: 'Side s', symbol: 's' },
  { value: 'apothem', label: 'Apothem a', symbol: 'a' },
  { value: 'circumradius', label: 'Circumradius R', symbol: 'R' },
];

export function solvePolygon(n, known, value) {
  const p = regularPolygon(n, known, value);
  const ang = polygonAngles(n);
  const t = `${f(180 / n)}°`;
  const area = {
    side: out('Area', 'A', 'n s² ÷ (4 tan(180° ÷ n))', `${n} × ${f(value)}² ÷ (4 × tan ${t})`, p.area),
    apothem: out('Area', 'A', 'n a² tan(180° ÷ n)', `${n} × ${f(value)}² × tan ${t}`, areaFromApothem(n, value)),
    circumradius: out('Area', 'A', '½ n R² sin(360° ÷ n)', `½ × ${n} × ${f(value)}² × sin ${f(360 / n)}°`, areaFromCircumradius(n, value)),
  }[known];
  return [
    area,
    known !== 'side' && out('Side', 's', known === 'apothem' ? '2a tan(180° ÷ n)' : '2R sin(180° ÷ n)', `2 × ${f(value)} × ${known === 'apothem' ? 'tan' : 'sin'} ${t}`, p.side),
    known !== 'apothem' && out('Apothem', 'a', 's ÷ (2 tan(180° ÷ n))', `${f(p.side)} ÷ (2 × tan ${t})`, p.apothem),
    known !== 'circumradius' && out('Circumradius', 'R', 's ÷ (2 sin(180° ÷ n))', `${f(p.side)} ÷ (2 × sin ${t})`, p.circumradius),
    out('Perimeter', 'P', 'n s', `${n} × ${f(p.side)}`, p.perimeter),
    out('Each interior angle', 'θ', '(n − 2) × 180° ÷ n', `(${n} − 2) × 180° ÷ ${n}`, ang.interior, DEGREE),
    out('Each exterior angle', 'φ', '360° ÷ n', `360° ÷ ${n}`, ang.exterior, DEGREE),
    out('Angle sum', 'Σ', '(n − 2) × 180°', `(${n} − 2) × 180°`, ang.sum, DEGREE),
    out('Diagonals', 'D', 'n(n − 3) ÷ 2', `${n} × (${n} − 3) ÷ 2`, ang.diagonals),
  ].filter(Boolean);
}

export const ngonFormulas = [
  ['Each interior angle', tex`\theta = \frac{(n-2)\,180^\circ}{n}`],
  ['Each exterior angle', tex`\varphi = \frac{360^\circ}{n}`],
  ['Angle sum', tex`\Sigma = (n-2)\,180^\circ`],
  ['Diagonals', tex`D = \frac{n(n-3)}{2}`],
  ['Area from the side s', tex`A = \frac{n s^2}{4\tan(180^\circ/n)}`],
  ['Area from the apothem a', tex`A = n a^2 \tan\frac{180^\circ}{n} = \tfrac{1}{2}Pa`],
  ['Area from the circumradius R', tex`A = \tfrac{1}{2} n R^2 \sin\frac{360^\circ}{n}`],
  ['Apothem and circumradius', tex`a = \frac{s}{2\tan(180^\circ/n)},\quad R = \frac{s}{2\sin(180^\circ/n)}`],
];

// ---- Circles ----------------------------------------------------------------

export const circle = (r) => ({ d: 2 * r, C: 2 * PI * r, A: PI * r * r });
export const sector = (r, degrees) => {
  const t = rad(degrees);
  return { arc: r * t, area: (r * r * t) / 2, perimeter: 2 * r + r * t };
};
export const segment = (r, degrees) => {
  const t = rad(degrees);
  return { area: (r * r * (t - sin(t))) / 2, chord: 2 * r * sin(t / 2), height: r * (1 - cos(t / 2)), arc: r * t };
};
export const annulus = (R, r) => PI * (R * R - r * r);
export const tangentLength = (r, d) => sqrt(d * d - r * r);
export const chordAt = (r, p) => 2 * sqrt(r * r - p * p);

const circles = [
  {
    id: 'circle', name: 'Circle', figure: 'circle',
    formulas: [['Diameter', tex`d = 2r`], ['Circumference', tex`C = 2\pi r = \pi d`], ['Area', tex`A = \pi r^2 = \tfrac{\pi}{4}d^2`]],
    calcs: [{ id: 'r', label: 'Radius', inputs: [['r', 'Radius r', '5']], solve: ({ r }) => {
      const c = circle(r);
      return { results: [
        out('Area', 'A', 'πr²', `π × ${f(r)}²`, c.A),
        out('Circumference', 'C', '2πr', `2 × π × ${f(r)}`, c.C),
        out('Diameter', 'd', '2r', `2 × ${f(r)}`, c.d),
      ] };
    } }],
  },
  {
    id: 'sector', name: 'Sector', figure: 'sector',
    about: 'A slice between two radii. θ is in radians in these formulas.',
    formulas: [
      ['Arc length', tex`s = r\theta`], ['Area', tex`A = \tfrac{1}{2}r^2\theta = \tfrac{1}{2}rs = \frac{\theta^\circ}{360^\circ}\pi r^2`], ['Perimeter', tex`P = 2r + s`],
    ],
    calcs: [{ id: 'rt', label: 'Radius, angle', inputs: [['r', 'Radius r', '6'], ['t', 'Angle θ (°)', '60']], solve: ({ r, t }) => {
      if (t > 360) return fail(UP_TO_360);
      const s = sector(r, t);
      return { results: [
        out('Arc length', 's', 'rθ', `${f(r)} × ${f(rad(t))} rad`, s.arc),
        out('Area', 'A', '½r²θ', `½ × ${f(r)}² × ${f(rad(t))}`, s.area),
        out('Perimeter', 'P', '2r + s', `2 × ${f(r)} + ${f(s.arc)}`, s.perimeter),
      ] };
    } }],
  },
  {
    id: 'segment', name: 'Segment', figure: 'segment',
    about: 'The part cut off by a chord. θ is the central angle, in radians in these formulas.',
    formulas: [
      ['Area', tex`A = \tfrac{1}{2}r^2(\theta - \sin\theta)`], ['Chord', tex`c = 2r\sin\tfrac{\theta}{2}`],
      ['Height (sagitta)', tex`h = r\left(1 - \cos\tfrac{\theta}{2}\right)`], ['In words', tex`A = \text{sector} - \text{triangle}`],
    ],
    calcs: [{ id: 'rt', label: 'Radius, angle', inputs: [['r', 'Radius r', '6'], ['t', 'Central angle θ (°)', '90']], solve: ({ r, t }) => {
      if (t > 360) return fail(UP_TO_360);
      const s = segment(r, t);
      return { results: [
        out('Area', 'A', '½r²(θ − sin θ)', `½ × ${f(r)}² × (${f(rad(t))} − sin ${f(t)}°)`, s.area),
        out('Chord', 'c', '2r sin(θ ÷ 2)', `2 × ${f(r)} × sin ${f(t / 2)}°`, s.chord),
        out('Height', 'h', 'r(1 − cos(θ ÷ 2))', `${f(r)} × (1 − cos ${f(t / 2)}°)`, s.height),
        out('Arc length', 's', 'rθ', `${f(r)} × ${f(rad(t))}`, s.arc),
      ] };
    } }],
  },
  {
    id: 'annulus', name: 'Annulus (ring)', figure: 'annulus',
    formulas: [['Area', tex`A = \pi(R^2 - r^2) = \pi(R + r)(R - r)`], ['Width', tex`w = R - r`]],
    calcs: [{ id: 'Rr', label: 'Radii', inputs: [['R', 'Outer radius R', '5'], ['r', 'Inner radius r', '3']], solve: ({ R, r }) => {
      if (r >= R) return fail('The outer radius R has to be bigger than r.');
      return { results: [
        out('Area', 'A', 'π(R² − r²)', `π × (${f(R)}² − ${f(r)}²)`, annulus(R, r)),
        out('Width', 'w', 'R − r', `${f(R)} − ${f(r)}`, R - r),
      ] };
    } }],
  },
  {
    id: 'chords', name: 'Chords, arcs and tangents', figure: 'chords',
    formulas: [
      ['Two chords crossing', tex`a \cdot b = c \cdot d`],
      ['Tangent and secant from P', tex`t^2 = PA \cdot PB`],
      ['Two secants from P', tex`PA \cdot PB = PC \cdot PD`],
      ['Tangent length; the tangent is at right angles to the radius', tex`t = \sqrt{d^2 - r^2}`],
      ['Chord at a distance p from the centre', tex`c = 2\sqrt{r^2 - p^2}`],
      ['Inscribed angle: half the central angle on the same arc', tex`\alpha = \tfrac{1}{2}\theta`],
      ['Angle between two chords', tex`\alpha = \tfrac{1}{2}(\text{arc}_1 + \text{arc}_2)`],
    ],
    calcs: [
      { id: 'tangent', label: 'Tangent', inputs: [['r', 'Radius r', '3'], ['d', 'Point to centre d', '5']], solve: ({ r, d }) => {
        if (d <= r) return fail('The point has to be outside the circle: d more than r.');
        return { results: [out('Tangent length', 't', '√(d² − r²)', `√(${f(d)}² − ${f(r)}²)`, tangentLength(r, d))] };
      } },
      { id: 'chord', label: 'Chord', inputs: [['r', 'Radius r', '5'], ['p', 'Centre to chord p', '3']], solve: ({ r, p }) => {
        if (p >= r) return fail('The chord’s distance from the centre has to be less than r.');
        return { results: [out('Chord', 'c', '2√(r² − p²)', `2 × √(${f(r)}² − ${f(p)}²)`, chordAt(r, p))] };
      } },
    ],
  },
];

// ---- Solids -----------------------------------------------------------------

const PHI = (1 + sqrt(5)) / 2;
const signs = (point) => point.reduce((all, x) => all.flatMap((p) => (x === 0 ? [[...p, 0]] : [[...p, x], [...p, -x]])), [[]]);
const cyclic = ([x, y, z]) => [[x, y, z], [y, z, x], [z, x, y]];

export const PLATONIC = [
  {
    id: 'tetrahedron', name: 'Tetrahedron', faces: 4, vertices: 4, edges: 6, face: 'Triangle',
    volume: (a) => (a ** 3) / (6 * Math.SQRT2), area: (a) => sqrt(3) * a * a,
    volumeTex: tex`V = \frac{a^3}{6\sqrt{2}}`, areaTex: tex`A = \sqrt{3}\,a^2`, volumeText: 'a³ ÷ (6√2)', areaText: '√3 × a²',
    points: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
  },
  {
    id: 'cube', name: 'Cube (hexahedron)', faces: 6, vertices: 8, edges: 12, face: 'Square',
    volume: (a) => a ** 3, area: (a) => 6 * a * a,
    volumeTex: tex`V = a^3`, areaTex: tex`A = 6a^2`, volumeText: 'a³', areaText: '6 × a²',
    points: signs([1, 1, 1]),
  },
  {
    id: 'octahedron', name: 'Octahedron', faces: 8, vertices: 6, edges: 12, face: 'Triangle',
    volume: (a) => (Math.SQRT2 / 3) * a ** 3, area: (a) => 2 * sqrt(3) * a * a,
    volumeTex: tex`V = \frac{\sqrt{2}}{3}a^3`, areaTex: tex`A = 2\sqrt{3}\,a^2`, volumeText: '√2 × a³ ÷ 3', areaText: '2√3 × a²',
    points: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  },
  {
    id: 'dodecahedron', name: 'Dodecahedron', faces: 12, vertices: 20, edges: 30, face: 'Pentagon',
    volume: (a) => ((15 + 7 * sqrt(5)) / 4) * a ** 3, area: (a) => 3 * sqrt(25 + 10 * sqrt(5)) * a * a,
    volumeTex: tex`V = \frac{15 + 7\sqrt{5}}{4}a^3`, areaTex: tex`A = 3\sqrt{25 + 10\sqrt{5}}\,a^2`, volumeText: '(15 + 7√5) × a³ ÷ 4', areaText: '3√(25 + 10√5) × a²',
    points: [...signs([1, 1, 1]), ...cyclic([0, 1 / PHI, PHI]).flatMap(signs)],
  },
  {
    id: 'icosahedron', name: 'Icosahedron', faces: 20, vertices: 12, edges: 30, face: 'Triangle',
    volume: (a) => ((5 * (3 + sqrt(5))) / 12) * a ** 3, area: (a) => 5 * sqrt(3) * a * a,
    volumeTex: tex`V = \frac{5(3 + \sqrt{5})}{12}a^3`, areaTex: tex`A = 5\sqrt{3}\,a^2`, volumeText: '5(3 + √5) × a³ ÷ 12', areaText: '5√3 × a²',
    points: cyclic([0, 1, PHI]).flatMap(signs),
  },
];

export function solvePlatonic(id, a) {
  const p = PLATONIC.find((s) => s.id === id);
  const put = (text) => text.replace(/a([³²])/, `${f(a)}$1`);
  return [
    out('Volume', 'V', p.volumeText, put(p.volumeText), p.volume(a)),
    out('Surface area', 'A', p.areaText, put(p.areaText), p.area(a)),
  ];
}

export const ellipsoidArea = (a, b, c, p = 1.6075) => 4 * PI * (((a * b) ** p + (a * c) ** p + (b * c) ** p) / 3) ** (1 / p);
export const sphere = (r) => ({ V: (4 / 3) * PI * r ** 3, A: 4 * PI * r * r });
export const sphericalCap = (r, h) => {
  const base = sqrt(h * (2 * r - h));
  return { V: (PI * h * h * (3 * r - h)) / 3, zone: 2 * PI * r * h, base, total: 2 * PI * r * h + PI * base * base };
};
export const sphericalSector = (r, h) => ({ V: (2 / 3) * PI * r * r * h, A: PI * r * (2 * h + sqrt(h * (2 * r - h))) });
export const torus = (R, r) => ({ V: 2 * PI * PI * R * r * r, A: 4 * PI * PI * R * r });
export const coneFrustum = (R, r, h) => {
  const slant = sqrt(h * h + (R - r) ** 2);
  const lateral = PI * (R + r) * slant;
  return { V: (PI * h * (R * R + R * r + r * r)) / 3, slant, lateral, total: lateral + PI * (R * R + r * r) };
};
export const pyramidFrustum = (A1, A2, h) => (h / 3) * (A1 + A2 + sqrt(A1 * A2));
export const prismoidal = (A1, Am, A2, h) => (h / 6) * (A1 + 4 * Am + A2);

const TOO_TALL = 'The height can be at most the diameter, 2r.';
const piTimes = (x) => `π × ${x}`;

const solids = [
  {
    id: 'prism', name: 'Prism', figure: 'prism',
    about: 'Two equal parallel bases joined by rectangles (a right prism). B is a base’s area, p its perimeter.',
    formulas: [
      ['Volume', tex`V = Bh`], ['Lateral area', tex`L = ph`], ['Total area', tex`S = 2B + ph`],
      ['Box', tex`V = lwh,\quad S = 2(lw + lh + wh),\quad d = \sqrt{l^2 + w^2 + h^2}`], ['Cube', tex`V = a^3,\quad S = 6a^2`],
    ],
    calcs: [
      { id: 'box', label: 'Box', inputs: [['l', 'Length l', '4'], ['w', 'Width w', '3'], ['h', 'Height h', '2']], solve: ({ l, w, h }) => ({ results: [
        out('Volume', 'V', 'lwh', `${f(l)} × ${f(w)} × ${f(h)}`, l * w * h),
        out('Surface area', 'S', '2(lw + lh + wh)', `2 × (${f(l)} × ${f(w)} + ${f(l)} × ${f(h)} + ${f(w)} × ${f(h)})`, 2 * (l * w + l * h + w * h)),
        out('Space diagonal', 'd', '√(l² + w² + h²)', `√(${f(l)}² + ${f(w)}² + ${f(h)}²)`, sqrt(l * l + w * w + h * h)),
      ] }) },
      { id: 'any', label: 'Any base', inputs: [['B', 'Base area B', '10'], ['p', 'Base perimeter p', '14'], ['h', 'Height h', '5']], solve: ({ B, p, h }) => ({ results: [
        out('Volume', 'V', 'Bh', `${f(B)} × ${f(h)}`, B * h),
        out('Lateral area', 'L', 'ph', `${f(p)} × ${f(h)}`, p * h),
        out('Total area', 'S', '2B + ph', `2 × ${f(B)} + ${f(p)} × ${f(h)}`, 2 * B + p * h),
      ] }) },
    ],
  },
  {
    id: 'pyramid', name: 'Pyramid', figure: 'pyramid',
    about: 'ℓ is the slant height, from the apex down the middle of a face.',
    formulas: [
      ['Volume', tex`V = \tfrac{1}{3}Bh`], ['Lateral area, regular', tex`L = \tfrac{1}{2}p\ell`],
      ['Square base, side a', tex`\ell = \sqrt{h^2 + (a/2)^2},\quad S = a^2 + 2a\ell`],
    ],
    calcs: [
      { id: 'square', label: 'Square base', inputs: [['a', 'Base side a', '6'], ['h', 'Height h', '4']], solve: ({ a, h }) => {
        const l = sqrt(h * h + (a / 2) ** 2);
        return { results: [
          out('Volume', 'V', '⅓a²h', `⅓ × ${f(a)}² × ${f(h)}`, (a * a * h) / 3),
          out('Slant height', 'ℓ', '√(h² + (a ÷ 2)²)', `√(${f(h)}² + ${f(a / 2)}²)`, l),
          out('Lateral area', 'L', '2aℓ', `2 × ${f(a)} × ${f(l)}`, 2 * a * l),
          out('Total area', 'S', 'a² + 2aℓ', `${f(a)}² + 2 × ${f(a)} × ${f(l)}`, a * a + 2 * a * l),
        ] };
      } },
      { id: 'any', label: 'Any base', inputs: [['B', 'Base area B', '30'], ['h', 'Height h', '5']], solve: ({ B, h }) => ({ results: [
        out('Volume', 'V', '⅓Bh', `⅓ × ${f(B)} × ${f(h)}`, (B * h) / 3),
      ] }) },
    ],
  },
  {
    id: 'pyramid-frustum', name: 'Frustum of a pyramid', figure: 'pyramid-frustum',
    about: 'A pyramid with its top cut off parallel to the base. A₁ and A₂ are the two bases.',
    formulas: [
      ['Volume', tex`V = \tfrac{h}{3}\left(A_1 + A_2 + \sqrt{A_1 A_2}\right)`],
      ['Lateral area, regular', tex`L = \tfrac{1}{2}(p_1 + p_2)\,\ell`],
    ],
    calcs: [
      { id: 'any', label: 'Base areas', inputs: [['A1', 'Bottom area A₁', '16'], ['A2', 'Top area A₂', '4'], ['h', 'Height h', '3']], solve: ({ A1, A2, h }) => ({ results: [
        out('Volume', 'V', 'h ÷ 3 × (A₁ + A₂ + √(A₁A₂))', `${f(h)} ÷ 3 × (${f(A1)} + ${f(A2)} + √(${f(A1)} × ${f(A2)}))`, pyramidFrustum(A1, A2, h)),
      ] }) },
      { id: 'square', label: 'Square bases', inputs: [['a', 'Bottom side a', '4'], ['b', 'Top side b', '2'], ['h', 'Height h', '3']], solve: ({ a, b, h }) => {
        const l = sqrt(h * h + ((a - b) / 2) ** 2);
        const L = 2 * (a + b) * l;
        return { results: [
          out('Volume', 'V', 'h ÷ 3 × (a² + b² + ab)', `${f(h)} ÷ 3 × (${f(a)}² + ${f(b)}² + ${f(a)} × ${f(b)})`, pyramidFrustum(a * a, b * b, h)),
          out('Slant height', 'ℓ', '√(h² + ((a − b) ÷ 2)²)', `√(${f(h)}² + ${f(Math.abs(a - b) / 2)}²)`, l),
          out('Lateral area', 'L', '2(a + b)ℓ', `2 × (${f(a)} + ${f(b)}) × ${f(l)}`, L),
          out('Total area', 'S', 'a² + b² + L', `${f(a)}² + ${f(b)}² + ${f(L)}`, a * a + b * b + L),
        ] };
      } },
    ],
  },
  {
    id: 'prismatoid', name: 'Prismatoid', figure: 'prismatoid',
    about: 'Any solid with all its corners in two parallel planes. Aₘ is the section halfway up, not the average of A₁ and A₂. The same formula gives a prism, pyramid, cone, frustum and sphere.',
    formulas: [['Volume (prismoidal formula)', tex`V = \tfrac{h}{6}\left(A_1 + 4A_m + A_2\right)`]],
    calcs: [{ id: 'any', label: 'Sections', inputs: [['A1', 'Bottom area A₁', '16'], ['Am', 'Middle section Aₘ', '9'], ['A2', 'Top area A₂', '4'], ['h', 'Height h', '3']], solve: ({ A1, Am, A2, h }) => ({ results: [
      out('Volume', 'V', 'h ÷ 6 × (A₁ + 4Aₘ + A₂)', `${f(h)} ÷ 6 × (${f(A1)} + 4 × ${f(Am)} + ${f(A2)})`, prismoidal(A1, Am, A2, h)),
    ] }) }],
  },
  {
    id: 'cylinder', name: 'Cylinder', figure: 'cylinder',
    formulas: [['Volume', tex`V = \pi r^2 h`], ['Lateral area', tex`L = 2\pi r h`], ['Total area', tex`S = 2\pi r(r + h)`]],
    calcs: [{ id: 'rh', label: 'Radius, height', inputs: [['r', 'Radius r', '3'], ['h', 'Height h', '5']], solve: ({ r, h }) => ({ results: [
      out('Volume', 'V', 'πr²h', piTimes(`${f(r)}² × ${f(h)}`), PI * r * r * h),
      out('Lateral area', 'L', '2πrh', `2 × ${piTimes(`${f(r)} × ${f(h)}`)}`, 2 * PI * r * h),
      out('Total area', 'S', '2πr(r + h)', `2 × ${piTimes(`${f(r)} × (${f(r)} + ${f(h)})`)}`, 2 * PI * r * (r + h)),
    ] }) }],
  },
  {
    id: 'cone', name: 'Cone', figure: 'cone',
    formulas: [['Volume', tex`V = \tfrac{1}{3}\pi r^2 h`], ['Slant height', tex`\ell = \sqrt{r^2 + h^2}`], ['Lateral area', tex`L = \pi r\ell`], ['Total area', tex`S = \pi r(r + \ell)`]],
    calcs: [{ id: 'rh', label: 'Radius, height', inputs: [['r', 'Radius r', '3'], ['h', 'Height h', '4']], solve: ({ r, h }) => {
      const l = sqrt(r * r + h * h);
      return { results: [
        out('Volume', 'V', '⅓πr²h', `⅓ × ${piTimes(`${f(r)}² × ${f(h)}`)}`, (PI * r * r * h) / 3),
        out('Slant height', 'ℓ', '√(r² + h²)', `√(${f(r)}² + ${f(h)}²)`, l),
        out('Lateral area', 'L', 'πrℓ', piTimes(`${f(r)} × ${f(l)}`), PI * r * l),
        out('Total area', 'S', 'πr(r + ℓ)', piTimes(`${f(r)} × (${f(r)} + ${f(l)})`), PI * r * (r + l)),
      ] };
    } }],
  },
  {
    id: 'cone-frustum', name: 'Frustum of a cone', figure: 'cone-frustum',
    formulas: [
      ['Volume', tex`V = \tfrac{\pi h}{3}\left(R^2 + Rr + r^2\right)`], ['Slant height', tex`\ell = \sqrt{h^2 + (R - r)^2}`],
      ['Lateral area', tex`L = \pi(R + r)\ell`], ['Total area', tex`S = L + \pi R^2 + \pi r^2`],
    ],
    calcs: [{ id: 'Rrh', label: 'Radii, height', inputs: [['R', 'Bottom radius R', '4'], ['r', 'Top radius r', '1'], ['h', 'Height h', '4']], solve: ({ R, r, h }) => {
      const c = coneFrustum(R, r, h);
      return { results: [
        out('Volume', 'V', 'πh ÷ 3 × (R² + Rr + r²)', `π × ${f(h)} ÷ 3 × (${f(R)}² + ${f(R)} × ${f(r)} + ${f(r)}²)`, c.V),
        out('Slant height', 'ℓ', '√(h² + (R − r)²)', `√(${f(h)}² + ${f(Math.abs(R - r))}²)`, c.slant),
        out('Lateral area', 'L', 'π(R + r)ℓ', `π × (${f(R)} + ${f(r)}) × ${f(c.slant)}`, c.lateral),
        out('Total area', 'S', 'L + πR² + πr²', `${f(c.lateral)} + π × ${f(R)}² + π × ${f(r)}²`, c.total),
      ] };
    } }],
  },
  {
    id: 'sphere', name: 'Sphere', figure: 'sphere',
    formulas: [['Volume', tex`V = \tfrac{4}{3}\pi r^3 = \tfrac{1}{6}\pi d^3`], ['Surface area', tex`A = 4\pi r^2 = \pi d^2`]],
    calcs: [{ id: 'r', label: 'Radius', inputs: [['r', 'Radius r', '1']], solve: ({ r }) => {
      const s = sphere(r);
      return { results: [
        out('Volume', 'V', '⁴⁄₃πr³', `⁴⁄₃ × π × ${f(r)}³`, s.V),
        out('Surface area', 'A', '4πr²', `4 × π × ${f(r)}²`, s.A),
      ] };
    } }],
  },
  {
    id: 'spherical-segment', name: 'Spherical segment', figure: 'spherical-segment',
    about: 'A slice of a sphere between parallel planes. With one base it’s a cap: h high, base radius a.',
    formulas: [
      ['Volume, one base', tex`V = \tfrac{1}{3}\pi h^2(3r - h) = \tfrac{1}{6}\pi h(3a^2 + h^2)`],
      ['Volume, two bases', tex`V = \tfrac{1}{6}\pi h(3a^2 + 3b^2 + h^2)`],
      ['Curved area (a zone)', tex`A = 2\pi r h`], ['Base radius of a cap', tex`a = \sqrt{h(2r - h)}`],
    ],
    calcs: [{ id: 'rh', label: 'Cap', inputs: [['r', 'Sphere radius r', '5'], ['h', 'Height h', '2']], solve: ({ r, h }) => {
      if (h > 2 * r) return fail(TOO_TALL);
      const c = sphericalCap(r, h);
      return { results: [
        out('Volume', 'V', '⅓πh²(3r − h)', `⅓ × π × ${f(h)}² × (3 × ${f(r)} − ${f(h)})`, c.V),
        out('Base radius', 'a', '√(h(2r − h))', `√(${f(h)} × (2 × ${f(r)} − ${f(h)}))`, c.base),
        out('Curved area', 'A', '2πrh', `2 × π × ${f(r)} × ${f(h)}`, c.zone),
        out('Total area', 'S', '2πrh + πa²', `${f(c.zone)} + π × ${f(c.base)}²`, c.total),
      ] };
    } }],
  },
  {
    id: 'spherical-sector', name: 'Spherical sector', figure: 'spherical-sector',
    about: 'A cone from the centre with a cap on it. h is the cap’s height, a its base radius.',
    formulas: [['Volume', tex`V = \tfrac{2}{3}\pi r^2 h`], ['Total area (cap and cone)', tex`A = \pi r(2h + a)`]],
    calcs: [{ id: 'rh', label: 'Radius, cap', inputs: [['r', 'Sphere radius r', '5'], ['h', 'Cap height h', '2']], solve: ({ r, h }) => {
      if (h > 2 * r) return fail(TOO_TALL);
      const a = sqrt(h * (2 * r - h));
      return { results: [
        out('Volume', 'V', '⅔πr²h', `⅔ × π × ${f(r)}² × ${f(h)}`, sphericalSector(r, h).V),
        out('Cap base radius', 'a', '√(h(2r − h))', `√(${f(h)} × (2 × ${f(r)} − ${f(h)}))`, a),
        out('Total area', 'A', 'πr(2h + a)', `π × ${f(r)} × (2 × ${f(h)} + ${f(a)})`, sphericalSector(r, h).A),
      ] };
    } }],
  },
  {
    id: 'zone', name: 'Zone', figure: 'zone',
    about: 'The curved band of a sphere between two parallel planes. Only its height matters, not where it sits.',
    formulas: [['Area', tex`A = 2\pi r h`]],
    calcs: [{ id: 'rh', label: 'Radius, height', inputs: [['r', 'Sphere radius r', '5'], ['h', 'Height h', '2']], solve: ({ r, h }) => {
      if (h > 2 * r) return fail(TOO_TALL);
      return { results: [out('Area', 'A', '2πrh', `2 × π × ${f(r)} × ${f(h)}`, 2 * PI * r * h)] };
    } }],
  },
  {
    id: 'lune', name: 'Lune and wedge', figure: 'lune',
    about: 'Cut a sphere through its axis at an angle θ: the curved surface is a lune, the solid a wedge. θ in radians in the first forms.',
    formulas: [
      ['Lune area', tex`A = 2r^2\theta = \frac{\theta^\circ}{360^\circ}\,4\pi r^2`],
      ['Wedge volume', tex`V = \tfrac{2}{3}r^3\theta = \frac{\theta^\circ}{360^\circ}\cdot\tfrac{4}{3}\pi r^3`],
    ],
    calcs: [{ id: 'rt', label: 'Radius, angle', inputs: [['r', 'Radius r', '5'], ['t', 'Angle θ (°)', '60']], solve: ({ r, t }) => {
      if (t > 360) return fail(UP_TO_360);
      return { results: [
        out('Lune area', 'A', '2r²θ', `2 × ${f(r)}² × ${f(rad(t))}`, 2 * r * r * rad(t)),
        out('Wedge volume', 'V', '⅔r³θ', `⅔ × ${f(r)}³ × ${f(rad(t))}`, (2 / 3) * r ** 3 * rad(t)),
      ] };
    } }],
  },
  {
    id: 'torus', name: 'Torus', figure: 'torus',
    about: 'A ring: a circle of radius r swept round at a distance R (centre to the tube’s centre). Both follow from Pappus’s theorems.',
    formulas: [['Volume', tex`V = 2\pi^2 R r^2 = (\pi r^2)(2\pi R)`], ['Surface area', tex`A = 4\pi^2 R r = (2\pi r)(2\pi R)`]],
    calcs: [{ id: 'Rr', label: 'Radii', inputs: [['R', 'Centre to tube R', '5'], ['r', 'Tube radius r', '2']], solve: ({ R, r }) => {
      if (r > R) return fail('The tube radius r can be at most R.');
      const t = torus(R, r);
      return { results: [
        out('Volume', 'V', '2π²Rr²', `2 × π² × ${f(R)} × ${f(r)}²`, t.V),
        out('Surface area', 'A', '4π²Rr', `4 × π² × ${f(R)} × ${f(r)}`, t.A),
      ] };
    } }],
  },
  {
    id: 'ellipsoid', name: 'Ellipsoid', figure: 'ellipsoid',
    about: 'Semi-axes a, b and c. The area has no exact formula; this one is within about 1.1%.',
    formulas: [
      ['Volume', tex`V = \tfrac{4}{3}\pi abc`],
      ['Surface area (Thomsen)', tex`A \approx 4\pi\left(\frac{a^p b^p + a^p c^p + b^p c^p}{3}\right)^{1/p},\ p = 1.6075`],
    ],
    calcs: [{ id: 'abc', label: 'Semi-axes', inputs: [['a', 'Semi-axis a', '3'], ['b', 'Semi-axis b', '2'], ['c', 'Semi-axis c', '1']], solve: ({ a, b, c }) => ({ results: [
      out('Volume', 'V', '⁴⁄₃πabc', `⁴⁄₃ × π × ${f(a)} × ${f(b)} × ${f(c)}`, (4 / 3) * PI * a * b * c),
      out('Surface area, about', 'A', '4π((aᵖbᵖ + aᵖcᵖ + bᵖcᵖ) ÷ 3)^(1/p)', null, ellipsoidArea(a, b, c)),
    ] }) }],
  },
];

// ---- The page ---------------------------------------------------------------

export const SHAPE_SECTIONS = [
  { id: 'triangles', label: 'Triangles', shapes: [triangle, triangleKinds, triangleCentres] },
  { id: 'quadrilaterals', label: 'Quadrilaterals', shapes: quadrilaterals },
  { id: 'polygons', label: 'Regular polygons', shapes: [{ id: 'polygon-names', name: 'Names, 3 to 20 sides' }, { id: 'ngon', name: 'Any regular polygon', formulas: ngonFormulas }] },
  { id: 'circles', label: 'Circles', shapes: circles },
  { id: 'solids', label: 'Solids', shapes: [...solids, { id: 'platonic', name: 'Platonic solids', formulas: [['Euler’s formula, for every one', tex`V - E + F = 2`]] }] },
];

// ---- Drawing solids ---------------------------------------------------------
// Faces and edges of a convex solid from its corners alone, so a drawing can
// dash what's at the back. Pure, and tested on the five Platonic solids.

const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];

// Every plane through three corners with all the rest on one side is a face.
export function convexFaces(points, eps = 1e-6) {
  const faces = [];
  const seen = new Set();
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      for (let k = j + 1; k < n; k += 1) {
        let normal = cross(sub(points[j], points[i]), sub(points[k], points[i]));
        const length = Math.hypot(...normal);
        if (length < eps) continue;
        normal = normal.map((x) => x / length);
        let offset = dot(normal, points[i]);
        const sides = points.map((p) => dot(normal, p) - offset);
        if (sides.some((s) => s > eps) && sides.some((s) => s < -eps)) continue;
        if (sides.some((s) => s > eps)) { normal = normal.map((x) => -x); offset = -offset; }
        const on = sides.flatMap((s, index) => (Math.abs(s) <= eps ? [index] : []));
        const key = on.join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        faces.push({ normal, vertices: on });
      }
    }
  }
  return faces;
}

// Two corners joined by an edge share two faces.
export function convexEdges(points, faces) {
  const edges = [];
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const shared = faces.filter((face) => face.vertices.includes(i) && face.vertices.includes(j));
      if (shared.length >= 2) edges.push({ ends: [i, j], faces: shared });
    }
  }
  return edges;
}

// Turned a little and seen from a little above: [x, y] on the page (y down) and
// how near each point is.
export function viewOf(point, yaw = -0.6, pitch = 0.35) {
  const [x, y, z] = point;
  const x1 = x * cos(yaw) - z * sin(yaw);
  const z1 = x * sin(yaw) + z * cos(yaw);
  return [x1, -(y * cos(pitch) - z1 * sin(pitch)), y * sin(pitch) + z1 * cos(pitch)];
}

export function polygonPoints(n, cx, cy, R, start = -PI / 2) {
  return Array.from({ length: n }, (_, i) => [cx + R * cos(start + (2 * PI * i) / n), cy + R * sin(start + (2 * PI * i) / n)]);
}
