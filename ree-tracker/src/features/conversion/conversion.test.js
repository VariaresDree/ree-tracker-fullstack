// src/features/conversion/conversion.test.js
//
// Known values from published definitions, not the code's own factors. A wrong
// factor here means a wrong answer on a study tool, so each is checked directly.
import { describe, it, expect } from 'vitest';
import { UNIT_CATEGORIES, categoryById, convert, convertAll, inSiUnit, searchUnits, unitIn } from '@ree/shared/units';
import { AWG_TABLE, awg, baseImpedance, changeBase, deltaToWye, formatPolar, formatRect, polarToRect, powerTriangle, rectToPolar, resistorValue, scalePosition, threePhase, withPrefix, wyeToDelta } from './boardMath';
import { evaluate, formatNumber } from './calc';
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
    ['energy', 1, 'kcal', 'J', 4184],
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

  it('gives the SI unit where there is one', () => {
    expect(inSiUnit('power', 1, 'hp')).toBe(746);
    expect(inSiUnit('area', 1, 'ha')).toBeNull();
  });

  it('searches by symbol and name', () => {
    expect(searchUnits('hp').map((h) => h.unit.id)).toContain('hp');
    expect(searchUnits('circular').map((h) => h.category.id)).toContain('conductor');
    expect(searchUnits('')).toEqual([]);
    expect(categoryById('power').label).toBe('Power');
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
    ['', 'Enter a number.'],
    ['1+', 'That isn’t finished.'],
    ['(1+2', 'A bracket isn’t closed.'],
    ['1/0', 'That has no finite answer.'],
    ['sqrt(-1)', 'That has no finite answer.'],
    ['tan(90)', 'That has no finite answer.'],
    ['1)', 'Something’s out of place in that.'],
    ['sin', 'sin needs brackets, like sin(30).'],
    ['1 % 2', '“%” isn’t something I can calculate.'],
  ])('%s gives a plain message', (src, message) => {
    expect(evaluate(src)).toEqual({ ok: false, error: message });
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
