// src/features/conversion/explain.js
//
// How a conversion works, as data: the multiplier, the formula both ways, this
// number worked through, and why the factor is what it is. Every conversion shows
// this, because for the board the factor matters as much as the answer.
import { categoryById, unitIn, UNIT_SYSTEMS } from '@ree/shared/units';
import { formatNumber } from './calc';

const SHOW = 7;
const f = (n) => formatNumber(n, SHOW);
const systemLabel = (id) => UNIT_SYSTEMS.find((s) => s.id === id)?.label || id;

// Temperature and decibels have no single multiplier, so each pair has its own
// formula. `work` writes it out with the number in it.
const BY_FORMULA = {
  temperature: {
    '°C>°F': { formula: '°F = °C × 9/5 + 32', back: '°C = (°F − 32) × 5/9', work: (v) => `${v} × 9/5 + 32` },
    '°F>°C': { formula: '°C = (°F − 32) × 5/9', back: '°F = °C × 9/5 + 32', work: (v) => `(${v} − 32) × 5/9` },
    '°C>K': { formula: 'K = °C + 273.15', back: '°C = K − 273.15', work: (v) => `${v} + 273.15` },
    'K>°C': { formula: '°C = K − 273.15', back: 'K = °C + 273.15', work: (v) => `${v} − 273.15` },
    '°F>°R': { formula: '°R = °F + 459.67', back: '°F = °R − 459.67', work: (v) => `${v} + 459.67` },
    '°R>°F': { formula: '°F = °R − 459.67', back: '°R = °F + 459.67', work: (v) => `${v} − 459.67` },
    '°C>°R': { formula: '°R = (°C + 273.15) × 9/5', back: '°C = °R × 5/9 − 273.15', work: (v) => `(${v} + 273.15) × 9/5` },
    '°R>°C': { formula: '°C = °R × 5/9 − 273.15', back: '°R = (°C + 273.15) × 9/5', work: (v) => `${v} × 5/9 − 273.15` },
    '°F>K': { formula: 'K = (°F − 32) × 5/9 + 273.15', back: '°F = (K − 273.15) × 9/5 + 32', work: (v) => `(${v} − 32) × 5/9 + 273.15` },
    'K>°F': { formula: '°F = (K − 273.15) × 9/5 + 32', back: 'K = (°F − 32) × 5/9 + 273.15', work: (v) => `(${v} − 273.15) × 9/5 + 32` },
  },
  ratio: {
    'dB>P ratio': { formula: 'P ratio = 10^(dB ÷ 10)', back: 'dB = 10 log₁₀(P ratio)', work: (v) => `10^(${v} ÷ 10)` },
    'P ratio>dB': { formula: 'dB = 10 log₁₀(P ratio)', back: 'P ratio = 10^(dB ÷ 10)', work: (v) => `10 log₁₀(${v})` },
    'dB>V ratio': { formula: 'V ratio = 10^(dB ÷ 20)', back: 'dB = 20 log₁₀(V ratio)', work: (v) => `10^(${v} ÷ 20)` },
    'V ratio>dB': { formula: 'dB = 20 log₁₀(V ratio)', back: 'V ratio = 10^(dB ÷ 20)', work: (v) => `20 log₁₀(${v})` },
    'Np>V ratio': { formula: 'V ratio = e^Np', back: 'Np = ln(V ratio)', work: (v) => `e^${v}` },
    'V ratio>Np': { formula: 'Np = ln(V ratio)', back: 'V ratio = e^Np', work: (v) => `ln(${v})` },
    'Np>P ratio': { formula: 'P ratio = e^(2 × Np)', back: 'Np = ½ ln(P ratio)', work: (v) => `e^(2 × ${v})` },
    'P ratio>Np': { formula: 'Np = ½ ln(P ratio)', back: 'P ratio = e^(2 × Np)', work: (v) => `½ ln(${v})` },
    'Np>dB': { formula: 'dB = Np × 8.685890', back: 'Np = dB ÷ 8.685890', work: (v) => `${v} × 8.685890` },
    'dB>Np': { formula: 'Np = dB ÷ 8.685890', back: 'dB = Np × 8.685890', work: (v) => `${v} ÷ 8.685890` },
    'P ratio>V ratio': { formula: 'V ratio = √(P ratio)', back: 'P ratio = (V ratio)²', work: (v) => `√(${v})` },
    'V ratio>P ratio': { formula: 'P ratio = (V ratio)²', back: 'V ratio = √(P ratio)', work: (v) => `(${v})²` },
  },
};

const baseOf = (category) => category.units.find((u) => u.factor === 1);

/**
 * @returns null when a unit isn't in the category, else
 *   { from, to, direction, multiplier?, inverse?, line?, formula, back, working?, steps[], notes[], prefixOnly }
 */
export function explain(categoryId, value, fromId, toId, result) {
  const category = categoryById(categoryId);
  const from = unitIn(category, fromId);
  const to = unitIn(category, toId);
  if (!from || !to) return null;

  const direction = from.system === to.system
    ? `Within ${systemLabel(from.system)}`
    : `${systemLabel(from.system)} to ${systemLabel(to.system)}`;
  const notes = [...new Set([from.note, to.note].filter(Boolean))];
  const known = value !== null && value !== undefined && Number.isFinite(value);
  const answer = known && result !== null && result !== undefined && Number.isFinite(result) ? f(result) : null;

  const special = BY_FORMULA[categoryId]?.[`${fromId}>${toId}`];
  if (special) {
    return {
      from: fromId,
      to: toId,
      direction,
      formula: special.formula,
      back: special.back,
      working: known && answer ? `${special.work(f(value))} = ${answer} ${toId}` : null,
      steps: [],
      notes,
      prefixOnly: false,
    };
  }
  // Same unit on both sides, or two units with no factor between them.
  if (!from.factor || !to.factor) return null;

  const multiplier = from.factor / to.factor;
  const inverse = to.factor / from.factor;
  const base = baseOf(category);
  const steps = [];
  if (base && from !== base && to !== base) {
    steps.push(`1 ${fromId} = ${f(from.factor)} ${base.id}`);
    steps.push(`1 ${toId} = ${f(to.factor)} ${base.id}`);
    steps.push(`1 ${fromId} = ${f(from.factor)} ÷ ${f(to.factor)} = ${f(multiplier)} ${toId}`);
  }
  // Written as a multiplication either way round, unless dividing reads more plainly.
  const divides = multiplier < 1 && Math.abs(inverse - Math.round(inverse)) < 1e-9;
  const formula = divides ? `${toId} = ${fromId} ÷ ${f(inverse)}` : `${toId} = ${fromId} × ${f(multiplier)}`;
  const back = divides ? `${fromId} = ${toId} × ${f(inverse)}` : `${fromId} = ${toId} ÷ ${f(multiplier)}`;
  const working = known && answer
    ? `${f(value)} ${fromId} ${divides ? `÷ ${f(inverse)}` : `× ${f(multiplier)}`} = ${answer} ${toId}`
    : null;
  const ratio = Math.log10(multiplier);
  const prefixOnly = from.system === to.system && (from.prefixed || to.prefixed) && Math.abs(ratio - Math.round(ratio)) < 1e-9;
  if (prefixOnly && Math.round(ratio) !== 0) {
    const places = Math.abs(Math.round(ratio));
    notes.unshift(`Only the prefix changes: move the decimal point ${places} place${places === 1 ? '' : 's'} to the ${ratio > 0 ? 'right' : 'left'}.`);
  }

  return {
    from: fromId,
    to: toId,
    direction,
    multiplier,
    inverse,
    line: `1 ${fromId} = ${f(multiplier)} ${toId}`,
    inverseLine: `1 ${toId} = ${f(inverse)} ${fromId}`,
    formula,
    back,
    working,
    steps,
    notes,
    prefixOnly,
  };
}
