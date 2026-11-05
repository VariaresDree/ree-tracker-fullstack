// The hand-written formula cards. A wrong constant teaches the wrong number, so
// each one is checked against its published value here, not against itself.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const { REWRITES, DROPS } = require('../scripts/data/referenceCardRewrites');
const { DRAFTS } = require('../scripts/data/referenceCardDrafts');
const { allProblems, buildMigrationSql, MIGRATION, toContent } = require('../scripts/referenceCardContent');

// As the live table has them on 2026-11-05.
const TOPICS = {
  EE: ['Electromagnetism', 'Electrical Machinery 1', 'Electrical Machinery 2', 'Electrical Transient Analysis', 'Power System Analysis', 'Electrical System & Illumination Design', 'Electronics 1 and 2'],
  ESAS: ['Engineering Mechanics', 'Fluid Mechanics', 'Fundamentals of Deformable Bodies', 'Physics for Engineers', 'Chemistry for Engineers'],
  Mathematics: ['Trigonometry', 'Solid Geometry', 'Differential Equations', 'Probability & Statistics', 'Numerical Methods & Analysis', 'Vector Analysis'],
};
// Names held by rejected rows: a draft reusing one would silently insert nothing.
const REJECTED_NAMES = [
  'Bernoulli Differential Equation', 'First‑Order Linear Differential Equation Solution', 'Integrating Factor for a First-Order Linear ODE',
  'Laplace Transform of First Derivative', 'Second-Order ODE with Complex Conjugate Roots', 'Second-Order ODE with Distinct Real Roots',
  'Second-Order ODE with Repeated Real Roots', 'Second‑Order Homogeneous Linear ODE with Constant Coefficients', 'Separable First-Order Differential Equation',
];
const LIVE_IDS = 67;

const all = [...REWRITES, ...DRAFTS];
const byName = (name) => {
  const hit = all.find((c) => c.name === name);
  if (!hit) throw new Error(`no card named ${name}`);
  return hit;
};

/** A LaTeX value's number: "8.854 \times 10^{-12}" is 8.854e-12, "96\,485.33" is 96485.33. */
function valueOf(latex) {
  const text = latex.replace(/\$/g, '').replace(/\\,/g, '').replace(/\\ /g, ' ');
  const hit = /^(\d[\d.]*)(?:\s*\\times\s*10\^\{?(-?\d+)\}?)?/.exec(text.trim());
  if (!hit) throw new Error(`no number in ${latex}`);
  return Number(hit[1]) * 10 ** Number(hit[2] ?? 0);
}

describe('the card data', () => {
  it('passes the API\'s own gate, every card', () => {
    expect(allProblems()).toEqual([]);
  });

  it('accounts for every live card, once', () => {
    const ids = [...REWRITES, ...DROPS].map((c) => c.id);
    expect(ids).toHaveLength(LIVE_IDS);
    expect(new Set(ids).size).toBe(LIVE_IDS);
  });

  it('has no name twice within a kind and subject, which the table would refuse', () => {
    const keys = DRAFTS.map((c) => `${c.kind}|${c.subject}|${c.name}`);
    expect(new Set(keys).size).toBe(keys.length);
    const names = new Set(DRAFTS.map((c) => c.name));
    expect(REJECTED_NAMES.filter((n) => names.has(n))).toEqual([]);
    expect(REWRITES.map((c) => c.name).filter((n) => names.has(n))).toEqual([]);
  });

  it('files each draft under a real topic, with a family of at least two', () => {
    for (const card of DRAFTS) expect(TOPICS[card.subject], card.name).toContain(card.topic);
    const counts = new Map();
    for (const card of DRAFTS) counts.set(`${card.topic}|${card.tag}`, (counts.get(`${card.topic}|${card.tag}`) ?? 0) + 1);
    const lonely = [...counts].filter(([, n]) => n < 2).map(([key]) => key);
    expect(lonely).toEqual([]);
  });

  it('gives a constant its value and no variables, and a formula its variables', () => {
    for (const card of all) {
      const c = toContent(card);
      if (c.kind === 'constant') {
        expect(c.valueUnit, c.name).toBeTruthy();
        expect(c.variables, c.name).toEqual([]);
      } else {
        expect(c.formulaLatex, c.name).toBeTruthy();
        expect(c.variables.length, c.name).toBeGreaterThan(0);
      }
    }
  });

  it('never gives a non-unit as a unit', () => {
    const bad = /^(null|none|n\/?a|dimensionless|unitless|decimal)$|unit of|depends on/i;
    for (const card of all) {
      for (const v of toContent(card).variables) {
        if (v.unit) expect(v.unit.replace(/\$|\\text\{|\}/g, ''), `${card.name}: ${v.symbol}`).not.toMatch(bad);
      }
    }
  });
});

describe('constants, against their published values', () => {
  // CODATA 2018 unless noted. Exact ones are exact by definition since the 2019 SI.
  it.each([
    ['Speed of Light in Vacuum', 299792458],
    ['Planck Constant', 6.62607015e-34],
    ['Elementary Charge', 1.602176634e-19],
    ['Boltzmann Constant', 1.380649e-23],
    ['Avogadro Constant', 6.02214076e23],
    ['Universal Gas Constant', 8.314462618],
    ['Faraday Constant', 96485.33212],
    ['Stefan-Boltzmann Constant', 5.670374419e-8],
    ['Gravitational Constant', 6.6743e-11],
    ['Standard Gravity', 9.80665],
    ['Permittivity of Free Space', 8.854e-12],
    ['Coulomb Constant', 8.988e9],
    ['Resistivity of Annealed Copper at 20 °C', 1.724e-8], // IEC 60028
    ['Specific Heat Capacity of Liquid Water', 4.1868], // the international calorie
    ['Euler\'s Number', Math.E],
    ['Golden Ratio', (1 + Math.sqrt(5)) / 2],
    ['Pi', Math.PI],
  ])('%s', (name, published) => {
    expect(valueOf(byName(name).value) / published).toBeCloseTo(1, 7);
  });

  it('Permeability of Free Space is 4 pi times 10^-7', () => {
    expect(byName('Permeability of Free Space').value).toContain('4\\pi \\times 10^{-7}');
  });

  it('the rounded figures agree with each other', () => {
    const k = valueOf(byName('Coulomb Constant').value);
    const eps0 = valueOf(byName('Permittivity of Free Space').value);
    expect(k * 4 * Math.PI * eps0).toBeCloseTo(1, 3);
    const kB = valueOf(byName('Boltzmann Constant').value);
    const R = valueOf(byName('Universal Gas Constant').value);
    const NA = valueOf(byName('Avogadro Constant').value);
    expect((kB * NA) / R).toBeCloseTo(1, 7);
    const F = valueOf(byName('Faraday Constant').value);
    const e = valueOf(byName('Elementary Charge').value);
    expect((NA * e) / F).toBeCloseTo(1, 7);
  });
});

describe('the migration', () => {
  it('is what the data generates, so what was reviewed is what runs', () => {
    expect(fs.readFileSync(MIGRATION, 'utf8')).toBe(buildMigrationSql());
  });

  it('touches only live cards, and adds new ones only as pending', () => {
    const sql = buildMigrationSql();
    const updates = sql.split('\n').filter((line) => line.startsWith('WHERE "id"'));
    expect(updates).toHaveLength(REWRITES.length + DROPS.length);
    for (const line of updates) expect(line).toContain(`"status" = 'LIVE'`);
    expect(sql.match(/'PENDING', now\(\), now\(\)/g)).toHaveLength(DRAFTS.length);
    expect(sql).not.toMatch(/\bDELETE\b|\bDROP\b|\bTRUNCATE\b/);
  });

  it('keeps each string whole, doubling quotes and leaving LaTeX alone', () => {
    const sql = buildMigrationSql();
    expect(sql).toContain("'Stirling''s Approximation'");
    expect(sql).toContain(String.raw`'$\mu_0$'`);
    // In JSON a backslash is doubled, and that's what jsonb expects.
    expect(sql).toContain(String.raw`\\text{V}`);
  });
});
