// src/features/conversion/boardMath.js
//
// The arithmetic behind the board tools, apart from their screens so it can be
// checked against worked values.
import { formatNumber } from './calc';

const SQRT3 = Math.sqrt(3);
const TO_RAD = Math.PI / 180;

// ---- SI prefixes ------------------------------------------------------------

export const SI_SCALE = [
  { label: 'p', exp: -12 },
  { label: 'n', exp: -9 },
  { label: 'µ', exp: -6 },
  { label: 'm', exp: -3 },
  { label: '1', exp: 0 },
  { label: 'k', exp: 3 },
  { label: 'M', exp: 6 },
  { label: 'G', exp: 9 },
  { label: 'T', exp: 12 },
];

/** Where a value sits on the scale from pico to tera, 0 to 1. Null for zero. */
export function scalePosition(value) {
  if (!value || !Number.isFinite(value)) return null;
  const clamped = Math.max(-12, Math.min(12, Math.log10(Math.abs(value))));
  return (clamped + 12) / 24;
}

/** 1500, 'W' is "1.5 kW". */
export function withPrefix(value, symbol, sig = 6) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return `0 ${symbol}`;
  const exp = Math.floor(Math.log10(Math.abs(value)) / 3 + 1e-9) * 3;
  const step = SI_SCALE.find((s) => s.exp === exp);
  if (!step) return `${formatNumber(value, sig)} ${symbol}`;
  const prefix = step.exp === 0 ? '' : step.label;
  return `${formatNumber(value / 10 ** step.exp, sig)} ${prefix}${symbol}`;
}

// ---- Power triangle ---------------------------------------------------------

/**
 * Any two of P, Q, S and power factor give the rest. Q comes out positive for a
 * lagging load, negative for a leading one.
 * @param known  { mode: 'P-pf'|'P-Q'|'S-pf'|'S-P', a, b, leading }
 */
export function powerTriangle({ mode, a, b, leading = false }) {
  const sign = leading ? -1 : 1;
  let P; let Q; let S;
  if (mode === 'P-pf') {
    if (b <= 0 || b > 1) return null;
    P = a;
    S = a / b;
    Q = sign * Math.sqrt(Math.max(0, S ** 2 - P ** 2));
  } else if (mode === 'S-pf') {
    if (b < 0 || b > 1) return null;
    S = a;
    P = a * b;
    Q = sign * Math.sqrt(Math.max(0, S ** 2 - P ** 2));
  } else if (mode === 'S-P') {
    if (b > a) return null;
    S = a;
    P = b;
    Q = sign * Math.sqrt(Math.max(0, S ** 2 - P ** 2));
  } else {
    P = a;
    Q = b * (b !== 0 && leading ? -1 : 1);
    S = Math.hypot(P, Q);
  }
  if (!(S > 0) || P < 0) return null;
  const pf = P / S;
  return { P, Q, S, pf, angle: (Math.atan2(Q, P) * 180) / Math.PI };
}

// ---- Complex numbers and phasors --------------------------------------------

export const rectToPolar = (re, im) => {
  const mag = Math.hypot(re, im);
  const angle = (Math.atan2(im, re) * 180) / Math.PI;
  return { mag, angle: mag === 0 ? 0 : angle };
};
export const polarToRect = (mag, angle) => {
  const clean = (v) => (Math.abs(v) < 1e-12 * Math.max(1, Math.abs(mag)) ? 0 : v);
  return { re: clean(mag * Math.cos(angle * TO_RAD)), im: clean(mag * Math.sin(angle * TO_RAD)) };
};

const add = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
const mul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const div = (a, b) => {
  const d = b.re ** 2 + b.im ** 2;
  if (d === 0) return null;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
};

export const formatRect = ({ re, im }) => `${formatNumber(re, 6)} ${im < 0 ? '−' : '+'} j${formatNumber(Math.abs(im), 6)}`;
export const formatPolar = ({ re, im }) => {
  const { mag, angle } = rectToPolar(re, im);
  return `${formatNumber(mag, 6)} ∠ ${formatNumber(angle, 5)}°`;
};

// ---- Delta and wye ----------------------------------------------------------

/** { ab, bc, ca } to { a, b, c }. Null if the three sum to zero. */
export function deltaToWye({ ab, bc, ca }) {
  const sum = add(add(ab, bc), ca);
  const a = div(mul(ab, ca), sum);
  if (!a) return null;
  return { a, b: div(mul(ab, bc), sum), c: div(mul(bc, ca), sum) };
}

/** { a, b, c } to { ab, bc, ca }. Null if a branch is zero. */
export function wyeToDelta({ a, b, c }) {
  const top = add(add(mul(a, b), mul(b, c)), mul(c, a));
  const ab = div(top, c);
  const bc = div(top, a);
  const ca = div(top, b);
  return ab && bc && ca ? { ab, bc, ca } : null;
}

// ---- Per unit ---------------------------------------------------------------

export const baseImpedance = (kV, MVA) => (kV ** 2) / MVA;

/** An impedance in per unit on a new base, and what it is in ohms. */
export function changeBase({ zPu, sOld, vOld, sNew, vNew }) {
  if (!(sOld > 0 && vOld > 0 && sNew > 0 && vNew > 0)) return null;
  return {
    zPuNew: zPu * (sNew / sOld) * (vOld / vNew) ** 2,
    zBaseOld: baseImpedance(vOld, sOld),
    zBaseNew: baseImpedance(vNew, sNew),
    ohms: zPu * baseImpedance(vOld, sOld),
  };
}

// ---- Three-phase ------------------------------------------------------------

/** A balanced load, from its line values. */
export function threePhase({ connection, vLine, iLine, pf }) {
  if (!(vLine > 0 && iLine >= 0 && pf >= 0 && pf <= 1)) return null;
  const S = SQRT3 * vLine * iLine;
  return {
    vPhase: connection === 'wye' ? vLine / SQRT3 : vLine,
    iPhase: connection === 'wye' ? iLine : iLine / SQRT3,
    S,
    P: S * pf,
    Q: S * Math.sqrt(1 - pf ** 2),
  };
}

// ---- American wire gauge ----------------------------------------------------

const awgLabel = (n) => (n > 0 ? String(n) : `${1 - n}/0`);

/** One gauge's diameter and area. 4/0 is -3, 1/0 is 0. */
export function awg(n) {
  const inches = 0.005 * 92 ** ((36 - n) / 39);
  const mm = inches * 25.4;
  return {
    n,
    label: awgLabel(n),
    mm,
    mm2: (Math.PI / 4) * mm ** 2,
    cmil: (inches * 1000) ** 2,
  };
}

export const AWG_TABLE = Array.from({ length: 44 }, (_, i) => awg(i - 3));

// ---- Resistor colour code ---------------------------------------------------

// The colours are physical facts about the part, so they stay what they are in
// every theme, and each band is also named in words beside it.
export const BAND_COLOURS = [
  { id: 'black', label: 'Black', hex: '#111111', digit: 0, multiplier: 1 },
  { id: 'brown', label: 'Brown', hex: '#7a4a21', digit: 1, multiplier: 10, tolerance: 1 },
  { id: 'red', label: 'Red', hex: '#d0312d', digit: 2, multiplier: 100, tolerance: 2 },
  { id: 'orange', label: 'Orange', hex: '#f28c28', digit: 3, multiplier: 1e3 },
  { id: 'yellow', label: 'Yellow', hex: '#f5d90a', digit: 4, multiplier: 1e4 },
  { id: 'green', label: 'Green', hex: '#2e8b57', digit: 5, multiplier: 1e5, tolerance: 0.5 },
  { id: 'blue', label: 'Blue', hex: '#2563eb', digit: 6, multiplier: 1e6, tolerance: 0.25 },
  { id: 'violet', label: 'Violet', hex: '#7c3aed', digit: 7, multiplier: 1e7, tolerance: 0.1 },
  { id: 'grey', label: 'Grey', hex: '#8a8a8a', digit: 8, multiplier: 1e8, tolerance: 0.05 },
  { id: 'white', label: 'White', hex: '#f5f5f5', digit: 9, multiplier: 1e9 },
  { id: 'gold', label: 'Gold', hex: '#c9a227', multiplier: 0.1, tolerance: 5 },
  { id: 'silver', label: 'Silver', hex: '#b8bcc2', multiplier: 0.01, tolerance: 10 },
];

const band = (id) => BAND_COLOURS.find((c) => c.id === id);

/** 4 bands: digit, digit, multiplier, tolerance. 5 bands: three digits. */
export function resistorValue(digits, multiplierId, toleranceId) {
  const value = digits.reduce((sum, id) => sum * 10 + band(id).digit, 0);
  return { ohms: value * band(multiplierId).multiplier, tolerance: band(toleranceId).tolerance };
}
