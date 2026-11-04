// src/features/conversion/calc.js
//
// A small arithmetic parser for the converter's input and the calculator, with no
// eval: only what's in the tables below can run. Sign binds looser than ^, so
// -2^2 is -4, as on a calculator, and 2pi or 3(4) multiply. Brackets left open at
// the end close themselves, so sin(30 is sin(30). A sum still being typed, like
// "2+", is `incomplete`, not wrong: nobody should see an error for it mid-sum.

const CONSTANTS = { pi: Math.PI, e: Math.E };

const TO_RAD = Math.PI / 180;
const trig = (fn) => (angle) => (x) => fn(angle === 'deg' ? x * TO_RAD : x);
const arc = (fn) => (angle) => (x) => (angle === 'deg' ? fn(x) / TO_RAD : fn(x));
// A round angle should give a round answer: sin(180°) is 0, not 1.2e-16.
const snap = (fn) => (angle) => (x) => {
  const v = fn(angle)(x);
  return Math.abs(v) < 1e-14 ? 0 : v;
};
const tanOf = (angle) => (x) => {
  const v = trig(Math.tan)(angle)(x);
  return Math.abs(v) > 1e15 ? Infinity : Math.abs(v) < 1e-14 ? 0 : v;
};

const FUNCTIONS = {
  sin: snap(trig(Math.sin)),
  cos: snap(trig(Math.cos)),
  tan: tanOf,
  asin: arc(Math.asin),
  acos: arc(Math.acos),
  atan: arc(Math.atan),
  sinh: () => Math.sinh,
  cosh: () => Math.cosh,
  tanh: () => Math.tanh,
  ln: () => Math.log,
  log: () => Math.log10,
  sqrt: () => Math.sqrt,
  abs: () => Math.abs,
  exp: () => Math.exp,
};

const unfinished = (message) => Object.assign(new Error(message), { incomplete: true });

const MAX_LENGTH = 300;
const MAX_DEPTH = 40;

function tokenize(source) {
  const src = source.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/√/g, 'sqrt');
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    const space = rest.match(/^\s+/);
    if (space) { i += space[0].length; continue; }
    const number = rest.match(/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/);
    if (number) { tokens.push({ type: 'num', value: Number(number[0]) }); i += number[0].length; continue; }
    const word = rest.match(/^[a-zA-Z]+/);
    if (word) { tokens.push({ type: 'word', value: word[0] }); i += word[0].length; continue; }
    if ('+-*/^()'.includes(rest[0])) { tokens.push({ type: rest[0] }); i += 1; continue; }
    // A lone point at the end is a number on its way.
    if (rest === '.') throw unfinished('That sum isn’t finished yet.');
    throw new Error(`“${rest[0]}” isn’t something I can calculate.`);
  }
  return tokens;
}

/**
 * @param source  e.g. "2*pi*60"
 * @param options.angle  'deg' or 'rad', for sin and its family
 * @param options.ans    what `ans` stands for
 * @returns {{ ok: true, value: number } | { ok: false, error: string, incomplete: boolean }}
 */
export function evaluate(source, { angle = 'deg', ans = 0 } = {}) {
  const text = String(source ?? '').trim();
  if (!text) return { ok: false, error: 'Enter a number.', incomplete: true };
  if (text.length > MAX_LENGTH) return { ok: false, error: 'That’s too long to calculate.', incomplete: false };
  try {
    const tokens = tokenize(text);
    let at = 0;
    let depth = 0;
    const peek = () => tokens[at];
    // A bracket left open at the very end closes itself.
    const closeBracket = () => {
      if (accept(')') || !peek()) return;
      throw new Error('Something’s out of place in that.');
    };
    const accept = (type) => (peek()?.type === type ? tokens[at++] : null);

    const nested = (fn) => {
      depth += 1;
      if (depth > MAX_DEPTH) throw new Error('That’s nested too deeply.');
      const value = fn();
      depth -= 1;
      return value;
    };

    const expression = () => {
      let value = term();
      for (;;) {
        if (accept('+')) value += term();
        else if (accept('-')) value -= term();
        else return value;
      }
    };
    const term = () => {
      let value = unary();
      for (;;) {
        if (accept('*')) value *= unary();
        else if (accept('/')) value /= unary();
        // 2pi, 3(4), (1)(2), 2sin(30), but not 2 3 or 1.2.3
        else if (peek()?.type === 'num' && tokens[at - 1]?.type === 'num') throw new Error('Something’s out of place in that.');
        else if (['num', 'word', '('].includes(peek()?.type)) value *= power();
        else return value;
      }
    };
    const unary = () => nested(() => {
      if (accept('-')) return -unary();
      if (accept('+')) return unary();
      return power();
    });
    const power = () => {
      const base = primary();
      return accept('^') ? base ** unary() : base;
    };
    const primary = () => {
      const num = accept('num');
      if (num) return num.value;
      const word = accept('word');
      if (word) {
        const name = word.value.toLowerCase();
        if (name === 'ans') return ans;
        if (name in CONSTANTS) return CONSTANTS[name];
        if (!Object.hasOwn(FUNCTIONS, name)) throw new Error(`“${word.value}” isn’t something I can calculate.`);
        if (!accept('(')) {
          const message = `${name} needs brackets, like ${name}(30).`;
          throw peek() ? new Error(message) : unfinished(message);
        }
        const arg = nested(expression);
        closeBracket();
        return FUNCTIONS[name](angle)(arg);
      }
      if (accept('(')) {
        const value = nested(expression);
        closeBracket();
        return value;
      }
      if (peek()) throw new Error('Something’s out of place in that.');
      throw unfinished('That sum isn’t finished yet.');
    };

    const value = expression();
    if (at < tokens.length) throw new Error('Something’s out of place in that.');
    if (!Number.isFinite(value)) return { ok: false, error: 'That has no finite answer.', incomplete: false };
    return { ok: true, value };
  } catch (err) {
    return { ok: false, error: err.message, incomplete: !!err.incomplete };
  }
}

/** The answer so far: a sum still being typed reads as what it holds up to there. */
export function preview(source, options) {
  const text = String(source ?? '');
  for (let end = text.length, tries = 0; end > 0 && tries < 24; end -= 1, tries += 1) {
    const result = evaluate(text.slice(0, end), options);
    if (result.ok) return result.value;
    if (!result.incomplete && end === text.length) return null;
  }
  return null;
}

/** Up to ten significant figures, without a float's noise (0.1+0.2 is 0.3). */
export function formatNumber(value, sig = 10) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e12 || abs < 1e-6) {
    const [mantissa, exponent] = value.toExponential(sig - 1).split('e');
    return `${String(Number(mantissa))}e${Number(exponent)}`;
  }
  return String(Number(value.toPrecision(sig)));
}
