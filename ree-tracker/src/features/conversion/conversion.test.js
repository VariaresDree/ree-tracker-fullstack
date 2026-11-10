// src/features/conversion/conversion.test.js
//
// Known values from published definitions, not the code's own factors. A wrong
// factor here means a wrong answer on a study tool, so each is checked directly.
import { describe, it, expect } from 'vitest';
import { SI_PREFIXES, UNIT_CATEGORIES, UNIT_GROUPS, UNIT_SYSTEMS, categoriesInGroup, categoryById, convert, convertAll, inSiUnit, searchUnits, unitIn } from '@ree/shared/units';
import { GROUP_TONE, UNIT_TILES } from './unitTiles';
import { AWG_TABLE, awg, baseImpedance, changeBase, deltaToWye, formatPolar, formatRect, polarToRect, powerTriangle, rectToPolar, resistorValue, scalePosition, threePhase, withPrefix, wyeToDelta } from './boardMath';
import { evaluate, formatNumber, preview } from './calc';
import { CONSTANTS, EQUIVALENTS, readRow } from './equivalents';
import { explain } from './explain';
import { categoryForCard, categoryForUnit } from './unitLink';

const near = (actual, expected, digits = 6) => {
  const scale = Math.abs(expected) || 1;
  expect(Math.abs(actual - expected) / scale).toBeLessThan(10 ** -digits);
};

describe('known conversions', () => {
  it.each([
    ['power', 1, 'hp', 'kW', 0.746],
    ['power', 1, 'hp(I)', 'W', 745.7],
    ['power', 1, 'PS', 'W', 735.5],
    ['power', 1, 'TR', 'BTU/h', 12000],
    ['power', 1, 'TR', 'kW', 3.5169],
    ['apparent', 1500, 'kVA', 'MVA', 1.5],
    ['reactive', 250, 'kVAR', 'MVAR', 0.25],
    ['voltage', 13.8, 'kV', 'V', 13800],
    ['current', 250, 'mA', 'A', 0.25],
    ['resistance', 4.7, 'kΩ', 'Ω', 4700],
    ['capacitance', 100, 'nF', 'µF', 0.1],
    ['inductance', 50, 'mH', 'H', 0.05],
    ['charge', 1, 'Ah', 'C', 3600],
    ['energy', 1, 'kWh', 'MJ', 3.6],
    ['energy', 1, 'kWh', 'BTU', 3412.14],
    ['energy', 1, 'BTU', 'J', 1055.06],
    ['energy', 1, 'kcal', 'J', 4186.8],
    ['energy', 1, 'kcal', 'BTU', 3.96832],
    ['energy', 1, 'BTU', 'ft·lbf', 778.169],
    ['energy', 1, 'BTU', 'cal', 251.996],
    ['energy', 1, 'cal(th)', 'J', 4.184],
    ['energy', 1, 'kWh', 'kcal', 859.845],
    ['energy', 1, 'hp·h', 'BTU', 2544.43],
    ['power', 1, 'hp(I)', 'ft·lbf/s', 550],
    ['power', 1, 'hp(I)', 'ft·lbf/min', 33000],
    ['power', 1, 'hp(I)', 'BTU/min', 42.4072],
    ['power', 1, 'TR', 'BTU/min', 200],
    ['power', 1, 'PS', 'kgf·m/s', 75],
    ['power', 1, 'kcal/h', 'W', 1.163],
    ['pressure', 1, 'kgf/cm²', 'kPa', 98.0665],
    ['pressure', 1, 'atm', 'kgf/cm²', 1.03323],
    ['pressure', 1, 'atm', 'ftH₂O', 33.8985],
    ['pressure', 1, 'atm', 'mH₂O', 10.3323],
    ['pressure', 1, 'ksi', 'psi', 1000],
    ['pressure', 1, 'ksi', 'MPa', 6.89476],
    ['pressure', 1, 'lb/ft²', 'Pa', 47.8803],
    ['force', 1, 'kip', 'kN', 4.44822],
    ['force', 1, 'pdl', 'N', 0.138255],
    ['force', 1, 'lbf', 'pdl', 32.174],
    ['force', 1, 'dyn', 'N', 1e-5],
    ['torque', 1, 'kgf·m', 'N·m', 9.80665],
    ['acceleration', 1, 'g₀', 'ft/s²', 32.174],
    ['angvel', 1800, 'rpm', 'rad/s', 188.496],
    ['massdensity', 1, 'g/cm³', 'lb/ft³', 62.428],
    ['massdensity', 1, 'lb/ft³', 'kg/m³', 16.0185],
    ['massdensity', 1, 'slug/ft³', 'kg/m³', 515.379],
    ['specweight', 62.4, 'lbf/ft³', 'kN/m³', 9.80237],
    ['inertia', 1, 'in⁴', 'mm⁴', 416231],
    ['tempdiff', 10, 'Δ°C', 'Δ°F', 18],
    ['tempdiff', 18, 'Δ°F', 'ΔK', 10],
    ['specificheat', 1, 'BTU/(lb·°F)', 'kJ/(kg·K)', 4.1868],
    ['specificheat', 1, 'kcal/(kg·°C)', 'BTU/(lb·°R)', 1],
    ['specificheat', 53.35, 'ft·lbf/(lb·°R)', 'kJ/(kg·K)', 0.28704],
    ['enthalpy', 1, 'BTU/lb', 'kJ/kg', 2.326],
    ['enthalpy', 970, 'BTU/lb', 'kJ/kg', 2256.22],
    ['enthalpy', 1, 'kcal/kg', 'kJ/kg', 4.1868],
    ['specvolume', 1, 'ft³/lb', 'm³/kg', 0.0624280],
    ['conductivity', 1, 'BTU/(h·ft·°F)', 'W/(m·K)', 1.73073],
    ['heattransfer', 1, 'BTU/(h·ft²·°F)', 'W/(m²·K)', 5.67826],
    ['heatflux', 1, 'BTU/(h·ft²)', 'W/m²', 3.15459],
    ['flow', 1, 'gpm', 'L/s', 0.0630902],
    ['flow', 1, 'cfm', 'm³/h', 1.69901],
    ['flow', 1, 'cfs', 'gpm', 448.831],
    ['massflow', 1, 'lb/s', 'kg/s', 0.453592],
    ['massflow', 1, 't/h', 'kg/s', 0.277778],
    ['dynvisc', 1, 'cP', 'Pa·s', 0.001],
    ['dynvisc', 1, 'lbf·s/ft²', 'Pa·s', 47.8803],
    ['dynvisc', 1, 'lb/(ft·s)', 'Pa·s', 1.48816],
    ['kinvisc', 1, 'ft²/s', 'm²/s', 0.092903],
    ['kinvisc', 1, 'St', 'cSt', 100],
    ['energy', 1, 'eV', 'J', 1.602176634e-19],
    ['frequency', 60, 'Hz', 'rad/s', 376.991],
    ['frequency', 1800, 'rpm', 'Hz', 30],
    ['flux', 1, 'Wb', 'Mx', 1e8],
    ['density', 1, 'T', 'G', 1e4],
    ['density', 1, 'T', 'line/in²', 64516],
    ['field', 1, 'Oe', 'A/m', 79.5775],
    ['conductor', 250, 'MCM', 'mm²', 126.677],
    ['conductor', 1, 'MCM', 'cmil', 1000],
    ['conductor', 1, 'mm²', 'cmil', 1973.525],
    ['resistivity', 10.37, 'Ω·cmil/ft', 'Ω·m', 1.72e-8],
    ['resistivity', 1.724e-8, 'Ω·m', 'Ω·mm²/m', 0.01724],
    ['illuminance', 1, 'fc', 'lx', 10.7639],
    ['ratio', 3, 'dB', 'P ratio', 1.99526],
    ['ratio', 20, 'dB', 'V ratio', 10],
    ['ratio', 1, 'Np', 'dB', 8.68589],
    ['length', 1, 'in', 'cm', 2.54],
    ['length', 1, 'mi', 'km', 1.609344],
    ['length', 1000, 'mil', 'in', 1],
    ['area', 1, 'ac', 'ft²', 43560],
    ['area', 1, 'ha', 'm²', 10000],
    ['volume', 1, 'gal', 'L', 3.785411784],
    ['volume', 1, 'ft³', 'L', 28.3168],
    ['mass', 1, 'lb', 'kg', 0.45359237],
    ['mass', 1, 'slug', 'lb', 32.174],
    ['force', 1, 'lbf', 'N', 4.44822],
    ['force', 1, 'kgf', 'N', 9.80665],
    ['torque', 1, 'lb·ft', 'N·m', 1.35582],
    ['pressure', 1, 'psi', 'kPa', 6.89476],
    ['pressure', 1, 'atm', 'psi', 14.6959],
    ['pressure', 1, 'atm', 'mmHg', 760],
    ['pressure', 1, 'atm', 'inHg', 29.9213],
    ['speed', 100, 'km/h', 'm/s', 27.7778],
    ['speed', 1, 'kn', 'km/h', 1.852],
    ['speed', 60, 'mph', 'km/h', 96.5606],
    ['time', 1, 'h', 's', 3600],
    ['angle', 180, 'deg', 'rad', Math.PI],
    ['angle', 1, 'rev', 'deg', 360],
    ['data', 1, 'GiB', 'GB', 1.073741824],
    ['data', 8, 'bit', 'B', 1],
  ])('%s: %s %s is %s %s', (category, value, from, to, expected) => {
    const digits = Math.abs(expected) < 1e-6 ? 2 : 4;
    near(convert(category, value, from, to), expected, digits);
  });

  it.each([
    [100, '°C', '°F', 212],
    [-40, '°C', '°F', -40],
    [0, '°C', 'K', 273.15],
    [0, 'K', '°F', -459.67],
    [491.67, '°R', '°C', 0],
    [68, '°F', '°C', 20],
  ])('temperature: %s %s is %s %s', (value, from, to, expected) => {
    expect(convert('temperature', value, from, to)).toBeCloseTo(expected, 6);
  });
});

describe('the table itself', () => {
  it('has every category the plan named', () => {
    expect(UNIT_CATEGORIES.map((c) => c.id)).toEqual(expect.arrayContaining([
      'power', 'apparent', 'reactive', 'voltage', 'current', 'resistance', 'capacitance', 'inductance', 'charge', 'energy', 'frequency', 'flux', 'density', 'conductor', 'resistivity', 'illuminance', 'ratio',
      'length', 'area', 'volume', 'mass', 'force', 'torque', 'pressure', 'temperature', 'speed', 'time', 'angle', 'data',
      'acceleration', 'angvel', 'massdensity', 'specweight', 'inertia', 'tempdiff', 'specificheat', 'enthalpy', 'specvolume', 'conductivity', 'heattransfer', 'heatflux', 'flow', 'massflow', 'dynvisc', 'kinvisc',
    ]));
  });

  describe.each(UNIT_CATEGORIES.map((c) => [c.id, c]))('%s', (id, category) => {
    it('has unique ids and defaults that exist', () => {
      const ids = category.units.map((u) => u.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(category.defaults).toHaveLength(2);
      for (const d of category.defaults) expect(unitIn(category, d)).toBeTruthy();
      expect(category.defaults[0]).not.toBe(category.defaults[1]);
    });

    it('says which system each unit belongs to', () => {
      for (const u of category.units) expect(UNIT_SYSTEMS.map((x) => x.id)).toContain(u.system);
    });

    it('its first conversion crosses systems wherever the category has two', () => {
      const systems = new Set(category.units.map((u) => u.system));
      const [a, b] = category.defaults.map((d) => unitIn(category, d));
      if (systems.size > 1 && id !== 'data' && id !== 'time' && id !== 'angle' && id !== 'charge') expect(a.system).not.toBe(b.system);
    });

    it('its common pairs are real units', () => {
      for (const [a, b] of category.pairs || []) {
        expect(unitIn(category, a)).toBeTruthy();
        expect(unitIn(category, b)).toBeTruthy();
      }
    });

    it('its SI unit is in its table with a factor of one', () => {
      if (!category.siUnit) return;
      expect(unitIn(category, category.siUnit).factor).toBe(1);
    });

    it('every pair of units round-trips', () => {
      for (const a of category.units) {
        for (const b of category.units) {
          const value = id === 'ratio' ? 5 : 37.5;
          near(convert(id, convert(id, value, a.id, b.id), b.id, a.id), value, 9);
        }
      }
    });
  });

  it('a unit from another category isn’t converted', () => {
    expect(convert('power', 1, 'hp', 'kg')).toBeNull();
    expect(convert('nope', 1, 'hp', 'kW')).toBeNull();
    expect(convertAll('power', 1, 'kg')).toEqual([]);
  });

  it('every quantity on the front has a tile, and its pair crosses systems', () => {
    const shown = UNIT_CATEGORIES.filter((c) => UNIT_GROUPS.some((g) => g.id === c.group));
    for (const c of shown) {
      expect(UNIT_TILES[c.id], c.id).toBeDefined();
      expect(GROUP_TONE[c.group], c.group).toBeDefined();
      const [from, to] = c.defaults.map((id) => unitIn(c, id));
      expect(from && to, c.id).toBeTruthy();
    }
    // Only the quantities that cross systems: a few (decibels, data) don't have two.
    const crossing = shown.filter((c) => new Set(c.units.map((x) => x.system)).size > 1);
    for (const c of crossing) expect(unitIn(c, c.defaults[0]).system, c.id).not.toBe(unitIn(c, c.defaults[1]).system);
    expect(Object.keys(UNIT_TILES).sort()).toEqual(shown.map((c) => c.id).sort());
  });

  it('a quantity can sit under more than one heading, and prefix-only ones under none', () => {
    expect(categoriesInGroup('thermo').map((c) => c.id)).toEqual(expect.arrayContaining(['temperature', 'pressure', 'energy', 'power', 'enthalpy']));
    expect(categoriesInGroup('fluids').map((c) => c.id)).toEqual(expect.arrayContaining(['pressure', 'massdensity', 'flow', 'dynvisc']));
    const shown = UNIT_GROUPS.flatMap((g) => categoriesInGroup(g.id).map((c) => c.id));
    expect(shown).not.toContain('voltage');
    expect(shown).toEqual(expect.arrayContaining(['length', 'charge', 'data']));
  });

  it('has all 24 SI prefixes, each once, from quetta to quecto', () => {
    expect(SI_PREFIXES).toHaveLength(24);
    expect(new Set(SI_PREFIXES.map((p) => p.symbol)).size).toBe(24);
    expect(SI_PREFIXES[0]).toEqual({ name: 'quetta', symbol: 'Q', exp: 30 });
    expect(SI_PREFIXES.at(-1)).toEqual({ name: 'quecto', symbol: 'q', exp: -30 });
    expect(SI_PREFIXES.find((p) => p.name === 'deca').symbol).toBe('da');
  });

  it('gives the SI unit where there is one', () => {
    expect(inSiUnit('power', 1, 'hp')).toBe(746);
    expect(inSiUnit('area', 1, 'ha')).toBeNull();
  });

  it('searches by symbol and name', () => {
    expect(searchUnits('hp').map((h) => h.unit.id)).toContain('hp');
    expect(searchUnits('circular').map((h) => h.category.id)).toContain('conductor');
    expect(searchUnits('')).toEqual([]);
    expect(searchUnits('centipoise')[0].category.id).toBe('dynvisc');
    expect(categoryById('power').group).toBe('mechanics');
  });
});

describe('the calculator’s parser', () => {
  const value = (src, options) => {
    const r = evaluate(src, options);
    expect(r).toMatchObject({ ok: true });
    return r.value;
  };

  it.each([
    ['1+2*3', 7],
    ['(1+2)*3', 9],
    ['10/4', 2.5],
    ['2^3^2', 512],
    ['-2^2', -4],
    ['2^-1', 0.5],
    ['--3', 3],
    ['1.5e3', 1500],
    ['.5+.5', 1],
    ['2pi', 2 * Math.PI],
    ['3(4)', 12],
    ['(1+1)(2+2)', 8],
    ['2*pi*60', 376.99111843077515],
    ['sqrt(16)', 4],
    ['√(16)', 4],
    ['6×7', 42],
    ['8÷2', 4],
    ['5−3', 2],
    ['abs(-3)', 3],
    ['ln(e)', 1],
    ['log(1000)', 3],
    ['exp(0)', 1],
    ['2e', 2 * Math.E],
    ['2 sqrt(4)', 4],
  ])('%s is %s', (src, expected) => {
    expect(value(src)).toBeCloseTo(expected, 9);
  });

  it('takes degrees or radians', () => {
    expect(value('sin(30)')).toBeCloseTo(0.5, 12);
    expect(value('sin(pi/6)', { angle: 'rad' })).toBeCloseTo(0.5, 12);
    expect(value('acos(0.8)')).toBeCloseTo(36.8699, 4);
    expect(value('sin(180)')).toBe(0);
    expect(value('cos(90)')).toBe(0);
  });

  it('remembers ans', () => {
    expect(value('ans*2', { ans: 21 })).toBe(42);
  });

  it.each([
    ['1/0', 'That has no finite answer.'],
    ['sqrt(-1)', 'That has no finite answer.'],
    ['tan(90)', 'That has no finite answer.'],
    ['1)', 'Something’s out of place in that.'],
    ['1.2.3', 'Something’s out of place in that.'],
    ['2 3', 'Something’s out of place in that.'],
    ['1 % 2', '“%” isn’t something I can calculate.'],
  ])('%s is wrong, with a plain message', (src, message) => {
    expect(evaluate(src)).toEqual({ ok: false, error: message, incomplete: false });
  });

  // The owner's report: "That isn't finished" showing for a sum still being typed.
  it.each(['', '2+', '2*', '2^', '-', 'sin(', 'sin', '(', '2*(', '.'])('%j is only unfinished, not wrong', (src) => {
    expect(evaluate(src)).toMatchObject({ ok: false, incomplete: true });
  });

  it.each([
    ['(1+2', 3],
    ['sin(30', 0.5],
    ['2*(3+4', 14],
    ['sqrt(16', 4],
    ['cos(0', 1],
    ['2*sin(90', 2],
  ])('a bracket left open closes itself: %s is %s', (src, expected) => {
    expect(value(src)).toBeCloseTo(expected, 12);
  });

  it('a bracket in the middle still has to match', () => {
    expect(evaluate('(1+2 3').ok).toBe(false);
  });

  it.each([
    ['2+', 2],
    ['2+3*', 5],
    ['2+3*4', 14],
    ['10^', 10],
    ['sin(30', 0.5],
  ])('the answer so far of %s is %s', (src, expected) => {
    expect(preview(src)).toBeCloseTo(expected, 12);
  });

  it('there is no answer so far for what is wrong, or hasn’t begun', () => {
    expect(preview('1/0')).toBeNull();
    expect(preview('')).toBeNull();
    expect(preview('sin(')).toBeNull();
    expect(preview('-')).toBeNull();
  });

  it('runs nothing that isn’t in its tables', () => {
    for (const src of ['alert(1)', 'constructor', 'process.exit(1)', 'toString(1)', '__proto__', 'hasOwnProperty(1)', 'globalThis']) {
      expect(evaluate(src).ok).toBe(false);
    }
  });

  it('survives something too long or too deep', () => {
    expect(evaluate('1+'.repeat(400)).ok).toBe(false);
    expect(evaluate(`${'('.repeat(100)}1${')'.repeat(100)}`).ok).toBe(false);
    expect(evaluate('-'.repeat(200)).ok).toBe(false);
  });

  it('shows numbers without a float’s noise', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber(1500)).toBe('1500');
    expect(formatNumber(1.5e15)).toBe('1.5e15');
    expect(formatNumber(1.602176634e-19)).toBe('1.602176634e-19');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(null)).toBe('—');
  });
});

describe('board tools', () => {
  it('power triangle: 100 kW at 0.8 lagging', () => {
    const t = powerTriangle({ mode: 'P-pf', a: 100, b: 0.8 });
    near(t.S, 125);
    near(t.Q, 75);
    near(t.angle, 36.8699, 4);
  });

  it('power triangle: leading turns Q negative, and each pair of knowns agrees', () => {
    expect(powerTriangle({ mode: 'P-pf', a: 100, b: 0.8, leading: true }).Q).toBeCloseTo(-75, 9);
    near(powerTriangle({ mode: 'P-Q', a: 3, b: 4 }).S, 5);
    near(powerTriangle({ mode: 'P-Q', a: 3, b: 4 }).pf, 0.6);
    near(powerTriangle({ mode: 'S-pf', a: 125, b: 0.8 }).P, 100);
    near(powerTriangle({ mode: 'S-P', a: 125, b: 100 }).Q, 75);
  });

  it('power triangle: impossible values give nothing', () => {
    expect(powerTriangle({ mode: 'P-pf', a: 100, b: 1.2 })).toBeNull();
    expect(powerTriangle({ mode: 'P-pf', a: 100, b: 0 })).toBeNull();
    expect(powerTriangle({ mode: 'S-P', a: 10, b: 20 })).toBeNull();
    expect(powerTriangle({ mode: 'P-Q', a: 0, b: 0 })).toBeNull();
  });

  it('phasor: 3 + j4 is 5 ∠ 53.13°', () => {
    const { mag, angle } = rectToPolar(3, 4);
    near(mag, 5);
    near(angle, 53.1301, 4);
    const back = polarToRect(5, 53.13010235415598);
    near(back.re, 3);
    near(back.im, 4);
    expect(polarToRect(10, 90).re).toBe(0);
    expect(formatRect({ re: 3, im: -4 })).toBe('3 − j4');
    expect(formatPolar({ re: 3, im: 4 })).toBe('5 ∠ 53.13°');
  });

  it('delta and wye: balanced 3 Ω is 1 Ω, and unbalanced round-trips', () => {
    const c = (re, im = 0) => ({ re, im });
    const y = deltaToWye({ ab: c(3), bc: c(3), ca: c(3) });
    near(y.a.re, 1);
    near(y.b.re, 1);
    near(y.c.re, 1);
    const d = { ab: c(10, 5), bc: c(20, -8), ca: c(30, 2) };
    const back = wyeToDelta(deltaToWye(d));
    near(back.ab.re, 10);
    near(back.bc.im, -8);
    near(back.ca.re, 30);
    // A textbook case: 10, 20 and 30 Ω give Za = 300/60 = 5.
    near(deltaToWye({ ab: c(10), bc: c(20), ca: c(30) }).a.re, 5);
    expect(deltaToWye({ ab: c(1, 1), bc: c(-1, -1), ca: c(0) })).toBeNull();
    expect(wyeToDelta({ a: c(0), b: c(1), c: c(1) })).toBeNull();
  });

  it('per unit: a change of base', () => {
    near(baseImpedance(230, 100), 529);
    const same = changeBase({ zPu: 0.1, sOld: 100, vOld: 230, sNew: 50, vNew: 230 });
    near(same.zPuNew, 0.05);
    near(same.ohms, 52.9);
    near(changeBase({ zPu: 0.1, sOld: 100, vOld: 230, sNew: 100, vNew: 115 }).zPuNew, 0.4);
    expect(changeBase({ zPu: 0.1, sOld: 0, vOld: 230, sNew: 100, vNew: 230 })).toBeNull();
  });

  it('three-phase: 480 V, 100 A, 0.8 pf', () => {
    const y = threePhase({ connection: 'wye', vLine: 480, iLine: 100, pf: 0.8 });
    near(y.S, 83138.5, 5);
    near(y.P, 66510.8, 5);
    near(y.Q, 49883.1, 5);
    near(y.vPhase, 277.128, 5);
    near(y.iPhase, 100);
    const d = threePhase({ connection: 'delta', vLine: 480, iLine: 100, pf: 0.8 });
    near(d.vPhase, 480);
    near(d.iPhase, 57.735, 5);
    expect(threePhase({ connection: 'wye', vLine: 480, iLine: 100, pf: 1.5 })).toBeNull();
  });

  it('AWG: published sizes', () => {
    near(awg(-3).cmil, 211600);
    near(awg(-3).mm, 11.684, 4);
    near(awg(10).mm2, 5.261, 3);
    near(awg(10).cmil, 10383, 3);
    near(awg(12).mm2, 3.309, 3);
    near(awg(14).cmil, 4107, 3);
    near(awg(36).mm, 0.127, 4);
    expect(AWG_TABLE[0].label).toBe('4/0');
    expect(AWG_TABLE[3].label).toBe('1/0');
    expect(AWG_TABLE[4].label).toBe('1');
    expect(AWG_TABLE.at(-1).label).toBe('40');
  });

  it('resistor colours', () => {
    expect(resistorValue(['yellow', 'violet'], 'red', 'gold')).toEqual({ ohms: 4700, tolerance: 5 });
    expect(resistorValue(['brown', 'black', 'black'], 'brown', 'brown')).toEqual({ ohms: 1000, tolerance: 1 });
    expect(resistorValue(['brown', 'black'], 'silver', 'silver').ohms).toBeCloseTo(0.1, 9);
  });

  it('SI prefixes', () => {
    expect(withPrefix(1500, 'W')).toBe('1.5 kW');
    expect(withPrefix(746, 'W')).toBe('746 W');
    expect(withPrefix(1000, 'V')).toBe('1 kV');
    expect(withPrefix(0.000001, 'F')).toBe('1 µF');
    expect(withPrefix(0, 'A')).toBe('0 A');
    expect(scalePosition(1)).toBe(0.5);
    expect(scalePosition(1e-12)).toBe(0);
    expect(scalePosition(1e15)).toBe(1);
    expect(scalePosition(0)).toBeNull();
  });
});

describe('a formula card’s link', () => {
  it.each([
    ['$\\Omega$', 'resistance'],
    ['$\\text{V}$', 'voltage'],
    ['$\\text{var}$', 'reactive'],
    ['$101325\\ \\text{Pa}$', 'pressure'],
    ['$273.15\\ \\text{K}$', 'temperature'],
    ['$1.724 \\times 10^{-8} \\ \\Omega\\cdot\\text{m}$', 'resistivity'],
    ['kVA', 'apparent'],
    ['m^2', null],
    ['$\\text{PHP}$', null],
    ['$\\text{decimal}$', null],
    ['$3.141592653589793$', null],
    ['Unit of the solution $y$: same as the unit of $C$.', null],
    ['', null],
    [undefined, null],
  ])('%s links to %s', (latex, expected) => {
    expect(categoryForUnit(latex)).toBe(expected);
  });

  it('falls back on the variables’ units', () => {
    expect(categoryForCard({ valueUnit: null, variables: [{ symbol: 'x' }, { unit: '$\\text{kW}$' }] })).toBe('power');
    expect(categoryForCard({ variables: [] })).toBeNull();
    expect(categoryForCard(null)).toBeNull();
  });
});

describe('how a conversion works', () => {
  it('gives the multiplier, the formula both ways, and this number worked through', () => {
    const how = explain('pressure', 2, 'psi', 'kPa', convert('pressure', 2, 'psi', 'kPa'));
    expect(how.direction).toBe('English to SI');
    expect(explain('temperature', 212, '°F', '°C', 100).direction).toBe('English to SI');
    expect(how.line).toBe('1 psi = 6.894757 kPa');
    expect(how.inverseLine).toBe('1 kPa = 0.1450377 psi');
    expect(how.formula).toBe('kPa = psi × 6.894757');
    expect(how.back).toBe('psi = kPa ÷ 6.894757');
    expect(how.working).toBe('2 psi × 6.894757 = 13.78951 kPa');
  });

  it('shows where the multiplier comes from, through the base unit', () => {
    const how = explain('pressure', 1, 'psi', 'kPa', 6.894757);
    expect(how.steps).toEqual(['1 psi = 6894.757 Pa', '1 kPa = 1000 Pa', '1 psi = 6894.757 ÷ 1000 = 6.894757 kPa']);
    expect(explain('pressure', 1, 'psi', 'Pa', 6894.757).steps).toEqual([]);
  });

  it('carries each unit’s definition, so the factor makes sense', () => {
    const notes = explain('power', 1, 'hp', 'kW', 0.746).notes.join(' ');
    expect(notes).toContain('550 ft·lbf/s');
    expect(explain('energy', 1, 'BTU', 'kJ', 1.055).notes.join(' ')).toContain('778 ft·lbf');
  });

  it('a prefix change is called what it is, with the decimal shift', () => {
    const how = explain('power', 1500, 'W', 'kW', 1.5);
    expect(how.prefixOnly).toBe(true);
    expect(how.formula).toBe('kW = W ÷ 1000');
    expect(how.back).toBe('W = kW × 1000');
    expect(how.notes[0]).toBe('Only the prefix changes: move the decimal point 3 places to the left.');
    expect(explain('power', 1, 'hp', 'kW', 0.746).prefixOnly).toBe(false);
  });

  it.each([
    ['°C', '°F', 100, '°F = °C × 9/5 + 32', '100 × 9/5 + 32 = 212 °F'],
    ['°F', '°C', 212, '°C = (°F − 32) × 5/9', '(212 − 32) × 5/9 = 100 °C'],
    ['°C', 'K', 25, 'K = °C + 273.15', '25 + 273.15 = 298.15 K'],
    ['°F', '°R', 60, '°R = °F + 459.67', '60 + 459.67 = 519.67 °R'],
    ['K', '°F', 300, '°F = (K − 273.15) × 9/5 + 32', '(300 − 273.15) × 9/5 + 32 = 80.33 °F'],
  ])('temperature has no one multiplier: %s to %s', (from, to, v, formula, working) => {
    const how = explain('temperature', v, from, to, convert('temperature', v, from, to));
    expect(how.multiplier).toBeUndefined();
    expect(how.formula).toBe(formula);
    expect(how.working).toBe(working);
  });

  it('every pair in every category can explain itself', () => {
    for (const category of UNIT_CATEGORIES) {
      for (const a of category.units) {
        for (const b of category.units) {
          if (a === b) continue;
          const how = explain(category.id, 2, a.id, b.id, convert(category.id, 2, a.id, b.id));
          expect(how, `${category.id}: ${a.id} to ${b.id}`).toBeTruthy();
          expect(how.formula).toBeTruthy();
          expect(how.working, `${category.id}: ${a.id} to ${b.id}`).toBeTruthy();
        }
      }
    }
  });

  it('every formula in the special tables agrees with the converter', () => {
    const check = (category, from, to, v, expected) => near(convert(category, v, from, to), expected, 6);
    check('ratio', 'V ratio', 'dB', 10, 20);
    check('ratio', 'P ratio', 'dB', 100, 20);
    check('ratio', 'Np', 'V ratio', 1, Math.E);
    check('ratio', 'P ratio', 'V ratio', 4, 2);
    expect(convert('temperature', 491.67, '°R', '°C')).toBeCloseTo(0, 9);
  });

  it('a value not given yet still shows the method', () => {
    const how = explain('pressure', null, 'psi', 'kPa', null);
    expect(how.formula).toBe('kPa = psi × 6.894757');
    expect(how.working).toBeNull();
  });
});

describe('equivalents', () => {
  const value = (cat, from, to) => {
    const group = EQUIVALENTS.flatMap((g) => g.rows).find((r) => r.cat === cat && r.from === from && r.to === to);
    expect(group, `${from} to ${to}`).toBeTruthy();
    return readRow(group).out;
  };

  it('agree with what reviewers quote', () => {
    near(value('pressure', 'atm', 'kPa'), 101.325);
    near(value('pressure', 'atm', 'psi'), 14.696, 4);
    near(value('pressure', 'atm', 'mmHg'), 760);
    near(value('power', 'hp(I)', 'ft·lbf/s'), 550);
    near(value('power', 'hp(I)', 'W'), 745.7, 4);
    near(value('power', 'hp', 'W'), 746);
    near(value('energy', 'BTU', 'ft·lbf'), 778.17, 4);
    near(value('energy', 'kcal', 'kJ'), 4.1868);
    near(value('energy', 'kWh', 'kJ'), 3600);
    near(value('power', 'TR', 'BTU/h'), 12000);
    near(value('power', 'TR', 'kW'), 3.5169, 4);
  });

  it('every row is a real conversion, with a link to it', () => {
    for (const r of EQUIVALENTS.flatMap((g) => g.rows)) {
      const { out, link } = readRow(r);
      expect(Number.isFinite(out), `${r.from} to ${r.to}`).toBe(true);
      expect(link).toContain(`cat=${r.cat}`);
    }
  });

  it('the constants that are also conversions agree with the table', () => {
    expect(CONSTANTS.find((c) => c.name === 'Standard gravity').values[0]).toBe('9.80665 m/s²');
    near(convert('acceleration', 1, 'g₀', 'ft/s²'), 32.174, 4);
    near(convert('specificheat', 53.35, 'ft·lbf/(lb·°R)', 'kJ/(kg·K)'), 0.287, 3);
    near(convert('specificheat', 1, 'BTU/(lb·°F)', 'kJ/(kg·K)'), 4.1868);
    near(convert('enthalpy', 970, 'BTU/lb', 'kJ/kg'), 2257, 3);
    near(convert('enthalpy', 144, 'BTU/lb', 'kJ/kg'), 334, 2);
    near(convert('massdensity', 1000, 'kg/m³', 'lb/ft³'), 62.4, 2);
  });
});
