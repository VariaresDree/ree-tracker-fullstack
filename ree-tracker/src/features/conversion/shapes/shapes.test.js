// src/features/conversion/shapes/shapes.test.js
//
// Every formula against a value worked out by hand or from a published table,
// not against the code's own arithmetic.
import { describe, it, expect } from 'vitest';
import {
  PLATONIC, POLYGON_NAMES, SHAPE_SECTIONS, annulus, areaFromApothem, areaFromCircumradius, areaFromSide, brahmagupta,
  chordAt, circle, closes, coneFrustum, convexEdges, convexFaces, ellipsoidArea, kindByAngles, kindBySides, out,
  polygonAngles, prismoidal, pyramidFrustum, regularPolygon, sector, segment, solvePlatonic, solvePolygon, sphere,
  sphericalCap, sphericalSector, tangentLength, torus, triangleFromSides,
} from './shapes';

const { PI, sqrt } = Math;
const near = (actual, expected, digits = 9) => {
  const scale = Math.abs(expected) || 1;
  expect(Math.abs(actual - expected) / scale).toBeLessThan(10 ** -digits);
};
const allShapes = SHAPE_SECTIONS.flatMap((s) => s.shapes);
const shape = (id) => allShapes.find((s) => s.id === id);
// Runs a shape's calculator mode on numbers, as the panel does.
const solve = (id, mode, values) => shape(id).calcs.find((c) => c.id === mode).solve(values);
const value = (answer, label) => answer.results.find((r) => r.label === label).value;

describe('triangles', () => {
  it('3-4-5: area 6, right, inradius 1, circumradius 2.5', () => {
    const t = triangleFromSides(3, 4, 5);
    near(t.area, 6);
    near(t.s, 6);
    near(t.r, 1);
    near(t.R, 2.5);
    near(t.C, 90);
    near(t.A + t.B + t.C, 180);
    near(t.medians[2], 2.5); // the median to the hypotenuse is half of it
    expect(kindByAngles(3, 4, 5)).toBe('right');
    expect(kindBySides(3, 4, 5)).toBe('scalene');
  });

  it('equilateral side 2: area √3, r = 1/√3, R = 2/√3, every angle 60°', () => {
    const t = triangleFromSides(2, 2, 2);
    near(t.area, sqrt(3));
    near(t.r, 1 / sqrt(3));
    near(t.R, 2 / sqrt(3));
    for (const angle of [t.A, t.B, t.C]) near(angle, 60);
    expect(kindBySides(2, 2, 2)).toBe('equilateral');
    expect(kindByAngles(2, 2, 2)).toBe('acute');
  });

  it('names isosceles and obtuse', () => {
    expect(kindBySides(5, 5, 8)).toBe('isosceles');
    expect(kindByAngles(5, 5, 8)).toBe('obtuse');
  });

  it('three sides that can’t close are refused', () => {
    expect(triangleFromSides(1, 2, 3)).toBeNull();
    expect(closes([1, 2, 3])).toBe(false);
    expect(solve('triangle', 'sss', { a: 1, b: 2, c: 10 }).error).toMatch(/can’t close/);
  });

  it('every area form agrees: ½bh, ½ab sin C and Heron', () => {
    near(value(solve('triangle', 'bh', { b: 6, h: 4 }), 'Area'), 12);
    near(value(solve('triangle', 'sas', { a: 3, b: 4, C: 90 }), 'Area'), 6);
    near(value(solve('triangle', 'sas', { a: 3, b: 4, C: 90 }), 'Third side'), 5);
    near(value(solve('triangle', 'sss', { a: 3, b: 4, c: 5 }), 'Area'), 6);
    expect(solve('triangle', 'sas', { a: 3, b: 4, C: 180 }).error).toMatch(/under 180/);
  });

  it('centres: OI² = R(R − 2r), and the working shows the numbers', () => {
    const answer = solve('triangle-centres', 'sss', { a: 3, b: 4, c: 5 });
    near(value(answer, 'Incentre to circumcentre'), sqrt(2.5 * 0.5));
    expect(answer.results.find((r) => r.label === 'Inradius').working).toBe('r = A ÷ s = 6 ÷ 6 = 1');
    // Equilateral: every centre is one point.
    near(value(solve('triangle-centres', 'sss', { a: 2, b: 2, c: 2 }), 'Incentre to circumcentre'), 0, 6); // √ of float noise
  });
});

describe('quadrilaterals', () => {
  it('square, rectangle, rhombus and trapezoid', () => {
    near(value(solve('square', 'a', { a: 1 }), 'Diagonal'), sqrt(2));
    near(value(solve('rectangle', 'bh', { b: 3, h: 4 }), 'Diagonal'), 5);
    near(value(solve('rectangle', 'bh', { b: 3, h: 4 }), 'Perimeter'), 14);
    const rhombus = solve('rhombus', 'dd', { p: 6, q: 8 });
    near(value(rhombus, 'Area'), 24);
    near(value(rhombus, 'Side'), 5);
    near(value(rhombus, 'Perimeter'), 20);
    const trap = solve('trapezoid', 'abh', { a: 8, b: 4, h: 3 });
    near(value(trap, 'Area'), 18);
    near(value(trap, 'Leg, if isosceles'), sqrt(13));
  });

  it('parallelogram: a rectangle at 90°, and d₁² + d₂² = 2(a² + b²)', () => {
    const rect = solve('parallelogram', 'abt', { a: 3, b: 4, t: 90 });
    near(value(rect, 'Area'), 12);
    near(value(rect, 'Long diagonal'), 5);
    const p = solve('parallelogram', 'abt', { a: 5, b: 8, t: 60 });
    near(value(p, 'Long diagonal') ** 2 + value(p, 'Short diagonal') ** 2, 2 * (25 + 64));
    near(value(p, 'Area'), 40 * sin60());
  });

  it('kite both ways', () => {
    near(value(solve('kite', 'pq', { p: 6, q: 9 }), 'Area'), 27);
    near(value(solve('kite', 'abt', { a: 5, b: 7, t: 90 }), 'Area'), 35);
  });

  it('Brahmagupta: a unit square is 1, a 3 by 4 rectangle 12', () => {
    near(brahmagupta(1, 1, 1, 1), 1);
    near(brahmagupta(3, 4, 3, 4), 12);
    near(value(solve('cyclic', 'abcd', { a: 3, b: 4, c: 5, d: 6 }), 'Area'), sqrt(360));
    expect(solve('cyclic', 'abcd', { a: 1, b: 1, c: 1, d: 5 }).error).toMatch(/other three/);
  });
});

function sin60() { return sqrt(3) / 2; }

describe('regular polygons', () => {
  it('angle sums, angles and diagonals', () => {
    expect(polygonAngles(3)).toEqual({ interior: 60, exterior: 120, sum: 180, diagonals: 0 });
    expect(polygonAngles(4).sum).toBe(360);
    expect(polygonAngles(6)).toEqual({ interior: 120, exterior: 60, sum: 720, diagonals: 9 });
    expect(polygonAngles(8).interior).toBe(135);
    expect(polygonAngles(12).sum).toBe(1800);
    expect(polygonAngles(20).diagonals).toBe(170);
  });

  it('hexagon side 1: area 3√3/2 from its side, apothem and circumradius', () => {
    near(areaFromSide(6, 1), (3 * sqrt(3)) / 2);
    near(areaFromApothem(6, sqrt(3) / 2), (3 * sqrt(3)) / 2);
    near(areaFromCircumradius(6, 1), (3 * sqrt(3)) / 2);
    const fromR = regularPolygon(6, 'circumradius', 1);
    near(fromR.side, 1);
    near(fromR.apothem, sqrt(3) / 2);
  });

  it('a square of side 2: apothem 1, circumradius √2, area 4', () => {
    const sq = regularPolygon(4, 'side', 2);
    near(sq.apothem, 1);
    near(sq.circumradius, sqrt(2));
    near(sq.area, 4);
  });

  it('the calculator agrees whichever value is known', () => {
    const area = (known, v) => solvePolygon(8, known, v).find((r) => r.label === 'Area').value;
    const oct = regularPolygon(8, 'side', 3);
    near(area('apothem', oct.apothem), oct.area);
    near(area('circumradius', oct.circumradius), oct.area);
    expect(solvePolygon(8, 'side', 3).find((r) => r.label === 'Diagonals').value).toBe(20);
  });

  it('has a name for every n from 3 to 20', () => {
    for (let n = 3; n <= 20; n += 1) expect(POLYGON_NAMES[n]).toBeTruthy();
    expect(POLYGON_NAMES[6]).toBe('Hexagon');
    expect(POLYGON_NAMES[20]).toBe('Icosagon');
  });
});

describe('circles', () => {
  it('circle, sector, segment, annulus', () => {
    near(circle(1).A, PI);
    near(circle(1).C, 2 * PI);
    near(sector(1, 360).area, PI);
    near(sector(6, 60).arc, 2 * PI);
    near(sector(2, 90).area, PI);
    // A half-circle's segment is the half-disc; a 90° segment of r = 1 is π/4 − ½.
    near(segment(1, 180).area, PI / 2);
    near(segment(1, 90).area, PI / 4 - 0.5);
    near(segment(1, 60).chord, 1);
    near(segment(2, 180).height, 2);
    near(annulus(5, 3), 16 * PI);
  });

  it('tangent and chord lengths', () => {
    near(tangentLength(3, 5), 4);
    near(chordAt(5, 3), 8);
    expect(solve('chords', 'tangent', { r: 5, d: 3 }).error).toMatch(/outside/);
    expect(solve('chords', 'chord', { r: 3, p: 5 }).error).toMatch(/less than r/);
    expect(solve('annulus', 'Rr', { R: 3, r: 5 }).error).toMatch(/bigger/);
    expect(solve('sector', 'rt', { r: 1, t: 400 }).error).toMatch(/360/);
  });
});

describe('solids', () => {
  it('unit cube: volume 1, area 6, diagonal √3', () => {
    const box = solve('prism', 'box', { l: 1, w: 1, h: 1 });
    near(value(box, 'Volume'), 1);
    near(value(box, 'Surface area'), 6);
    near(value(box, 'Space diagonal'), sqrt(3));
    near(value(solve('prism', 'any', { B: 1, p: 4, h: 1 }), 'Total area'), 6);
  });

  it('r = 1 sphere: 4π/3 and 4π', () => {
    near(sphere(1).V, (4 * PI) / 3);
    near(sphere(1).A, 4 * PI);
    near(value(solve('sphere', 'r', { r: 1 }), 'Volume'), (4 * PI) / 3);
  });

  it('pyramid, cylinder and cone', () => {
    const pyr = solve('pyramid', 'square', { a: 6, h: 4 });
    near(value(pyr, 'Volume'), 48);
    near(value(pyr, 'Slant height'), 5);
    near(value(pyr, 'Total area'), 96);
    near(value(solve('cylinder', 'rh', { r: 1, h: 1 }), 'Volume'), PI);
    near(value(solve('cylinder', 'rh', { r: 1, h: 1 }), 'Total area'), 4 * PI);
    const cone = solve('cone', 'rh', { r: 3, h: 4 });
    near(value(cone, 'Volume'), 12 * PI);
    near(value(cone, 'Total area'), 24 * PI);
  });

  it('frustums and the prismoidal formula agree with each other', () => {
    near(pyramidFrustum(16, 4, 3), 28);
    near(prismoidal(16, 9, 4, 3), 28); // a frustum's middle section: side 3
    near(value(solve('pyramid-frustum', 'square', { a: 4, b: 2, h: 3 }), 'Volume'), 28);
    near(pyramidFrustum(9, 0, 3), 9); // top shrunk to a point: a pyramid
    // The prismoidal formula is exact for a sphere: A₁ = A₂ = 0, Aₘ = πr².
    near(prismoidal(0, PI, 0, 2), (4 * PI) / 3);
    const c = coneFrustum(4, 1, 4);
    near(c.slant, 5);
    near(c.V, 28 * PI);
    near(c.total, 42 * PI);
    near(coneFrustum(3, 0, 4).V, 12 * PI); // r = 0 is the cone
  });

  it('caps, sectors, zones, lunes and wedges', () => {
    const half = sphericalCap(1, 1);
    near(half.V, (2 * PI) / 3); // a hemisphere
    near(half.zone, 2 * PI);
    near(sphericalCap(1, 2).V, (4 * PI) / 3); // the whole sphere
    near(sphericalCap(5, 2).base, 4);
    near(sphericalSector(1, 2).V, (4 * PI) / 3);
    near(sphericalSector(1, 1).A, 3 * PI); // hemisphere: dome 2π and a flat disc π
    near(value(solve('zone', 'rh', { r: 1, h: 2 }), 'Area'), 4 * PI);
    const whole = solve('lune', 'rt', { r: 1, t: 360 });
    near(value(whole, 'Lune area'), 4 * PI);
    near(value(whole, 'Wedge volume'), (4 * PI) / 3);
    expect(solve('spherical-segment', 'rh', { r: 1, h: 3 }).error).toMatch(/diameter/);
  });

  it('torus and ellipsoid', () => {
    near(torus(2, 1).V, 4 * PI * PI);
    near(torus(2, 1).A, 8 * PI * PI);
    expect(solve('torus', 'Rr', { R: 1, r: 2 }).error).toMatch(/at most R/);
    near(value(solve('ellipsoid', 'abc', { a: 1, b: 1, c: 1 }), 'Volume'), (4 * PI) / 3);
    near(ellipsoidArea(1, 1, 1), 4 * PI); // a sphere, exactly
    // A prolate spheroid 2, 1, 1 has area 2π(1 + 4π/(3√3)) = 21.4784…: within 1.1%.
    expect(Math.abs(ellipsoidArea(2, 1, 1) - 21.4784) / 21.4784).toBeLessThan(0.011);
  });
});

describe('Platonic solids', () => {
  it('V − E + F = 2, and the table matches the shapes found from their corners', () => {
    for (const p of PLATONIC) {
      expect(p.vertices - p.edges + p.faces).toBe(2);
      expect(p.points).toHaveLength(p.vertices);
      const faces = convexFaces(p.points);
      expect(faces).toHaveLength(p.faces);
      expect(convexEdges(p.points, faces)).toHaveLength(p.edges);
      const corners = { Triangle: 3, Square: 4, Pentagon: 5 }[p.face];
      for (const face of faces) expect(face.vertices).toHaveLength(corners);
    }
  });

  it('volume and area from edge 1, against published values', () => {
    const at = (id) => PLATONIC.find((p) => p.id === id);
    near(at('tetrahedron').volume(1), 0.1178511302, 9);
    near(at('tetrahedron').area(1), 1.7320508076, 9);
    near(at('cube').volume(1), 1);
    near(at('cube').area(1), 6);
    near(at('octahedron').volume(1), 0.4714045208, 9);
    near(at('octahedron').area(1), 3.4641016151, 9);
    near(at('dodecahedron').volume(1), 7.6631189606, 9);
    near(at('dodecahedron').area(1), 20.6457288071, 9);
    near(at('icosahedron').volume(1), 2.1816949907, 9);
    near(at('icosahedron').area(1), 8.6602540378, 9);
  });

  it('the calculator puts the edge into the formula', () => {
    const [v, a] = solvePlatonic('cube', 2);
    expect(v.working).toBe('V = a³ = 2³ = 8');
    expect(a.working).toBe('A = 6 × a² = 6 × 2² = 24');
    expect(solvePlatonic('dodecahedron', 2)[0].working).toMatch(/^V = \(15 \+ 7√5\) × a³ ÷ 4 = \(15 \+ 7√5\) × 2³ ÷ 4 = 61\.30/);
  });
});

describe('the page', () => {
  it('has the five sections, each shape once', () => {
    expect(SHAPE_SECTIONS.map((s) => s.label)).toEqual(['Triangles', 'Quadrilaterals', 'Regular polygons', 'Circles', 'Solids']);
    const ids = allShapes.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every calculator answers from its own defaults, with working for each number', () => {
    for (const s of allShapes) {
      for (const calc of s.calcs || []) {
        const answer = calc.solve(Object.fromEntries(calc.inputs.map(([key, , start]) => [key, Number(start)])));
        expect(answer.error, `${s.id}/${calc.id}`).toBeUndefined();
        for (const r of answer.results) {
          if (r.text) continue;
          expect(Number.isFinite(r.value), `${s.id}/${calc.id}/${r.label}`).toBe(true);
          expect(r.working).toMatch(/ = /);
        }
      }
    }
  });

  it('a working line skips a step that says nothing new', () => {
    expect(out('Area', 'A', 'a²', '2²', 4).working).toBe('A = a² = 2² = 4');
    expect(out('Area', 'A', 'x', null, 4).working).toBe('A = x = 4');
  });
});
