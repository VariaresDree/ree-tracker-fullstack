// The lesson drawing kit (2026-11-19): each kind draws a named <svg>, in theme
// colours only, and a figure that is wrong (a slanted circuit part, a link to no
// block, a vector chained to nothing, no alt text) fails here, not on a screen.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LessonFigure from './LessonFigure';
import { FIGURE_TYPES, checkBlocks, checkCircuit, equalRanges, formatTick, phasorEnds, samplesOf } from './figureMath';

const draw = (spec) => renderToStaticMarkup(createElement(LessonFigure, spec));
// No colour literal may reach a figure: 13 themes depend on the variables.
const noLiteralColours = (svg) => expect(svg).not.toMatch(/(fill|stroke)="#|(fill|stroke)="(rgb|hsl|black|white|red|blue)/);

describe('LessonFigure', () => {
  it('offers the four kinds, and a Shapes drawing by its id', () => {
    expect(FIGURE_TYPES).toEqual(['plot', 'phasor', 'circuit', 'blocks']);
    expect(draw({ figure: 'triangle' })).toMatch(/^<svg/);
  });

  it('refuses an unknown kind and a figure without alt text', () => {
    expect(() => draw({ type: 'pie', alt: 'x' })).toThrow(/No lesson figure/);
    expect(() => draw({ type: 'plot', x: [0, 1], series: [{ f: (t) => t }] })).toThrow(/alt/);
  });
});

describe('plot', () => {
  const spec = {
    type: 'plot', alt: 'RC charging', x: [0, 5], xLabel: 't (s)', yLabel: 'v (V)',
    series: [{ f: (t) => 12 * (1 - Math.exp(-t)), label: 'v_C' }, { f: (t) => 12 * Math.exp(-t), label: 'v_R', dashed: true }],
    marks: [{ at: [1, 12 * (1 - Math.exp(-1))], label: '63.2% at τ' }, { y: 12, label: '12 V' }, { x: 3 }],
  };

  it('draws named, in theme colours, with its legend and marks', () => {
    const svg = draw(spec);
    expect(svg).toMatch(/^<svg[^>]*role="img"[^>]*aria-label="RC charging"/);
    expect(svg).toContain('63.2% at τ');
    // v_R: the R set as a subscript.
    expect(svg).toContain('<tspan>v</tspan><tspan dy="0.3em" font-size="0.78em">R</tspan>');
    expect(svg).toContain('var(--accent)');
    noLiteralColours(svg);
  });

  it('samples a curve over its range, and breaks it where it is not defined', () => {
    const pts = samplesOf({ f: (x) => 1 / x }, [-1, 1]);
    expect(pts[0][0]).toBe(-1);
    expect(pts.at(-1)[0]).toBe(1);
    expect(pts.some(([, y]) => !Number.isFinite(y))).toBe(true);
    expect(draw({ type: 'plot', alt: 'Hyperbola', x: [-1, 1], y: [-5, 5], series: [{ f: (x) => 1 / x }] })).toMatch(/^<svg/);
  });

  it('spaces a log axis by decades', () => {
    const pts = samplesOf({ f: (w) => w }, [1, 1000], true);
    expect(pts[120][0]).toBeCloseTo(10 ** 1.5, 6);
    expect(draw({ type: 'plot', alt: 'Bode', x: [1, 1000], logX: true, series: [{ f: (w) => -20 * Math.log10(w) }] })).toContain('>1000<');
    expect(formatTick(20000)).toBe('20k');
    expect(formatTick(-0.5)).toBe('−0.5');
  });

  it('keeps one unit equal on both axes when asked, widening the shorter range', () => {
    expect(equalRanges([0, 4], [0, 4], 2)).toEqual([[-2, 6], [0, 4]]);
    expect(equalRanges([0, 10], [0, 2], 2)).toEqual([[0, 10], [-1.5, 3.5]]);
    const svg = draw({ type: 'plot', alt: 'Circle', x: [-1, 1], y: [-1, 1], equal: true, series: [{ f: (t) => t }] });
    expect(svg).toMatch(/^<svg/);
  });

  it('needs a range and a curve', () => {
    expect(() => draw({ type: 'plot', alt: 'x', x: [1, 1], series: [{ f: (t) => t }] })).toThrow();
    expect(() => draw({ type: 'plot', alt: 'x', x: [0, 1], series: [] })).toThrow();
  });
});

describe('phasor', () => {
  it('chains a vector from another one’s tip: the sum lands where it should', () => {
    const ends = phasorEnds([
      { name: 'P', mag: 4, angle: 0 },
      { name: 'Q', mag: 3, angle: 90, from: 'P' },
      { mag: 5, angle: (Math.atan2(3, 4) * 180) / Math.PI },
    ]);
    expect(ends[1].end[0]).toBeCloseTo(4, 9);
    expect(ends[1].end[1]).toBeCloseTo(3, 9);
    expect(ends[2].end[0]).toBeCloseTo(4, 9);
    expect(ends[2].end[1]).toBeCloseTo(3, 9);
  });

  it('refuses a vector chained to one that is not drawn before it', () => {
    expect(() => phasorEnds([{ mag: 1, angle: 0, from: 'V' }])).toThrow(/no vector named V/);
  });

  it('draws the power triangle with its angle', () => {
    const svg = draw({
      type: 'phasor', alt: 'Power triangle', axes: false,
      vectors: [{ name: 'P', mag: 4, angle: 0, label: 'P' }, { mag: 3, angle: 90, from: 'P', label: 'Q' }, { mag: 5, angle: 36.87, label: 'S', colour: 2 }],
      arcs: [{ from: 0, to: 36.87, label: 'θ' }],
    });
    expect(svg).toContain('θ');
    expect(svg).toContain('>S<');
    noLiteralColours(svg);
  });
});

describe('circuit', () => {
  const ALL = [
    ['V', [0, 2], [0, 0], '12 V'], ['wire', [0, 0], [1, 0]], ['R', [1, 0], [3, 0], 'R₁'], ['L', [3, 0], [5, 0], 'L'],
    ['C', [5, 0], [5, 2], 'C'], ['wire', [5, 2], [0, 2]], ['Vac', [6, 0], [6, 2]], ['I', [7, 2], [7, 0], '2 A'],
    ['bat', [8, 2], [8, 0]], ['sw', [9, 0], [10, 0], ['S', 'closed'], { closed: true }], ['D', [10, 0], [11, 0]], ['lamp', [11, 0], [12, 0]],
    ['fuse', [12, 0], [13, 0]], ['ammeter', [13, 0], [14, 0]], ['voltmeter', [14, 0], [14, 2], 'V', { side: 'left' }], ['wattmeter', [9, 2], [10, 2]],
    ['xfmr', [1, 4], [3, 4], 'T₁'], ['cb', [3, 4], [4, 4]], ['bus', [4, 3.5], [4, 4.5], 'Bus 1'], ['i', [1, 0], [2, 0], 'I'],
    ['gnd', [0, 2]], ['dot', [5, 0]], ['gen', [0, 4], [1, 4], 'G'], ['motor', [6, 4], [5, 4], 'M₁'], ['load', [4, 4], [4, 5], '5 MW'],
    ['opamp', [9, 4], 'U1'],
    ['pole', [12, 2], 'left'], ['text', [12, 3], 'M = 0.2 H'],
  ];

  it('draws every kind of part, named, in theme colours', () => {
    const svg = draw({ type: 'circuit', alt: 'Every part', parts: ALL, nodes: [{ at: [1, 0], label: 'A' }] });
    expect(svg).toMatch(/^<svg[^>]*aria-label="Every part"/);
    expect(svg.match(/data-part=/g)).toHaveLength(ALL.filter(([k]) => k !== 'wire').length);
    for (const label of ['12 V', 'R₁', 'T₁', 'Bus 1', '5 MW', '>A<', 'M = 0.2 H']) expect(svg).toContain(label);
    noLiteralColours(svg);
  });

  it('refuses a part on a slant, off the grid, at one point, or of no known kind', () => {
    expect(() => checkCircuit([['R', [0, 0], [1, 1]]])).toThrow(/slant/);
    expect(() => checkCircuit([['R', [0, 0], [1.3, 0]]])).toThrow(/off the grid/);
    expect(() => checkCircuit([['R', [2, 0], [2, 0]]])).toThrow(/one point/);
    expect(() => checkCircuit([['Z', [0, 0], [1, 0]]])).toThrow(/unknown kind/);
    expect(() => checkCircuit([['R', [0, 0], [0.5, 0]], ['gnd', [0.5, 0]]])).not.toThrow();
  });
});

describe('blocks', () => {
  const loop = {
    type: 'blocks', alt: 'Unity feedback loop',
    blocks: [{ id: 'sum', at: [1, 0], kind: 'sum' }, { id: 'G', at: [2, 0], label: 'G(s)' }, { id: 'out', at: [3, 0], kind: 'point' }],
    links: [
      [[0, 0], 'sum', { label: 'R(s)', sign: '+' }],
      ['sum', 'G', { label: 'E(s)' }],
      ['G', [4, 0], { label: 'C(s)' }],
      ['out', 'sum', { sign: '−', via: [[3, 1], [1, 1]] }],
    ],
  };

  it('draws blocks, sums with their signs, and a feedback path at right angles', () => {
    const svg = draw(loop);
    for (const t of ['G(s)', 'R(s)', 'E(s)', 'C(s)', '−']) expect(svg).toContain(t);
    expect(svg).toContain('<polyline');
    noLiteralColours(svg);
  });

  it('refuses a link to a block that is not there', () => {
    expect(() => checkBlocks(loop.blocks, [['sum', 'H']])).toThrow(/no block "H"/);
  });
});
