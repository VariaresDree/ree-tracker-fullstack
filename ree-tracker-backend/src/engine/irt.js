// Item Response Theory — 3-Parameter Logistic (3PL).
// Core of the adaptive engine. All numerics are stateless and pure so the
// module can be tested without DB access.
//
// Parameter notation (Lord & Novick):
//   a — discrimination (steepness of the curve at b)
//   b — difficulty (theta at which P = (1+c)/2)
//   c — guessing (lower asymptote, often ~0.2 for 4-choice MCQ)
//
// θ is the latent ability of a respondent. We model attempts as Bernoulli
// trials with probability P(θ; a,b,c). MLE over a sample of attempts gives
// the respondent's ability estimate, with standard error derived from the
// observed Fisher information.

'use strict';

const SCALE = 1.7; // logistic-normal scaling (Birnbaum constant)

// Floor on the posterior SE. A naive Bayesian 3PL posterior converges (se→0) and
// theta gets "sticky", which is wrong for a months-long review journey where the
// true ability keeps improving. Flooring se keeps ~65% responsiveness to each new
// session while still letting the forecast confidence band tighten from ~0.5 → 0.35.
// (A time-based se-inflation / Glicko-style decay is the principled future upgrade.)
const SE_FLOOR = 0.35;

/** Sigmoid. */
function sigmoid(z) {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

/**
 * 3PL probability of a correct response.
 * @param {number} theta
 * @param {{a:number,b:number,c:number}} item
 */
function p3pl(theta, item) {
  const a = item.a ?? 1;
  const b = item.b ?? 0;
  const c = clamp(item.c ?? 0, 0, 0.5);
  return c + (1 - c) * sigmoid(SCALE * a * (theta - b));
}

/**
 * Fisher information at theta for a single item (3PL).
 * Used to pick the next item that maximally tightens SE around the estimate.
 */
function fisherInfo(theta, item) {
  const a = item.a ?? 1;
  const b = item.b ?? 0;
  const c = clamp(item.c ?? 0, 0, 0.5);
  const p = p3pl(theta, item);
  if (p <= c || p >= 1) return 0;
  const q = 1 - p;
  const num = (SCALE * a) ** 2 * q * (p - c) ** 2;
  const den = p * (1 - c) ** 2;
  return num / den;
}

/**
 * Update theta given prior estimate and an array of {item, correct} attempts.
 * Uses Newton-Raphson on the log-likelihood with a Gaussian prior centered
 * on `priorTheta` with variance `priorSE^2` — Bayesian regularization keeps
 * the estimate sane when only a handful of items have been seen.
 *
 * @param {object} prior
 * @param {number} prior.theta
 * @param {number} prior.se
 * @param {Array<{item:{a:number,b:number,c:number}, correct:boolean}>} attempts
 * @returns {{theta:number, se:number}}
 */
function updateTheta(prior, attempts) {
  // Coerce a missing/NaN prior before it can poison the estimate. Math.max(0.01,
  // NaN) === NaN, so an undefined prior.se used to make priorVar NaN, which
  // flowed through g/h and clampTheta(NaN) === NaN into a stored {theta:NaN}.
  const priorTheta = Number.isFinite(prior.theta) ? prior.theta : 0;
  const priorSe = Number.isFinite(prior.se) ? prior.se : 1.0;

  if (!attempts || attempts.length === 0) {
    return { theta: clampTheta(priorTheta), se: clamp(priorSe, 0.05, 2.5) };
  }

  let theta = priorTheta;
  const priorVar = Math.max(0.01, priorSe * priorSe);

  for (let iter = 0; iter < 30; iter++) {
    let g = -(theta - priorTheta) / priorVar; // gradient of prior
    let h = -1 / priorVar; // Hessian of prior (Gaussian)

    for (const { item, correct } of attempts) {
      const a = item.a ?? 1;
      const c = clamp(item.c ?? 0, 0, 0.5);
      const p = p3pl(theta, item);
      if (p <= c || p >= 1) continue;
      const u = correct ? 1 : 0;
      // d log L / d theta
      const dlp = (SCALE * a * (p - c) * (u - p)) / (p * (1 - c));
      g += dlp;
      // Use expected information for Hessian (more stable than observed)
      h -= fisherInfo(theta, item);
    }

    if (Math.abs(g) < 1e-7) break;
    const step = g / h;
    // damping to avoid overshoot on flat regions
    theta -= clamp(step, -1.5, 1.5);
    if (Math.abs(step) < 1e-6) break;
  }

  // Standard error from posterior information.
  let totalInfo = 1 / priorVar;
  for (const { item } of attempts) totalInfo += fisherInfo(theta, item);
  const se = 1 / Math.sqrt(Math.max(1e-6, totalInfo));

  return { theta: clampTheta(theta), se: clamp(se, SE_FLOOR, 2.5) };
}

/**
 * Pick the next item from a candidate pool that maximizes Fisher info at the
 * current theta, with light exposure control (penalize items the user has
 * recently seen). Items missing IRT params get random-fallback weight so the
 * pool isn't unusable before calibration.
 *
 * @param {object} state
 * @param {number} state.theta
 * @param {Set<string>} [state.recentIds]  - questionIds already shown this session
 * @param {Array<{id:string, a?:number, b?:number, c?:number}>} pool
 * @returns {{id:string|null, info:number, fallback:boolean}}
 */
function selectNextItem({ theta, recentIds }, pool) {
  if (!pool || pool.length === 0) return { id: null, info: 0, fallback: true };
  const seen = recentIds instanceof Set ? recentIds : new Set();
  let bestId = null;
  let bestScore = -Infinity;
  let bestFallback = true;

  for (const q of pool) {
    if (seen.has(q.id)) continue;
    const hasParams = q.a != null && q.b != null;
    const info = hasParams ? fisherInfo(theta, q) : 0.001 + Math.random() * 0.01;
    // light penalty for very-easy or very-hard items relative to theta if
    // we have params, to keep the user in the optimal challenge zone.
    let score = info;
    if (hasParams) {
      const gap = Math.abs(theta - (q.b ?? 0));
      if (gap > 2.5) score *= 0.5;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = q.id;
      bestFallback = !hasParams;
    }
  }

  if (bestId == null) {
    // every candidate was filtered (e.g. all seen) — fall back to a random
    // unseen item, or the first item if seen-set is the whole pool.
    const fallbackPool = pool.filter((q) => !seen.has(q.id));
    const pick = (fallbackPool[0] ?? pool[0]) || null;
    return { id: pick?.id ?? null, info: 0, fallback: true };
  }
  return { id: bestId, info: Math.max(0, bestScore), fallback: bestFallback };
}

/**
 * Calibrate an item from a sample of (theta, correct) pairs.
 * Simple grid-search MLE — adequate for nightly batch runs; can be replaced
 * with a proper EM/marginal-MLE if/when call volume justifies it.
 *
 * Requires >= 30 attempts to return a meaningful estimate; otherwise returns
 * null so callers can leave the item uncalibrated.
 */
function calibrateItem(samples, options = {}) {
  const minN = options.minN ?? 30;
  if (!samples || samples.length < minN) return null;

  const aGrid = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];
  const bGrid = linspace(-2.5, 2.5, 21);
  const cGuess = clamp(options.c ?? 0.20, 0, 0.5);

  let best = { a: 1, b: 0, c: cGuess, ll: -Infinity };
  for (const a of aGrid) {
    for (const b of bGrid) {
      const ll = logLikelihood(samples, { a, b, c: cGuess });
      if (ll > best.ll) best = { a, b, c: cGuess, ll };
    }
  }
  return { a: best.a, b: best.b, c: best.c };
}

function logLikelihood(samples, item) {
  let s = 0;
  for (const { theta, correct } of samples) {
    const p = p3pl(theta, item);
    s += correct ? Math.log(Math.max(1e-9, p)) : Math.log(Math.max(1e-9, 1 - p));
  }
  return s;
}

// ---- Phase 3.4: empirical recalibration numerics --------------------------

// Bounds for the 2PL item fit. `a` outside these is almost always a fitting
// artifact on small samples; `b` beyond ±3.5 is off the usable theta range.
const A_BOUNDS = [0.4, 2.5];
const B_BOUNDS = [-3.5, 3.5];

/**
 * Fit one item's (a, b) by bounded MLE over (theta, correct) samples, with c
 * FIXED (2PL on top of a guessing floor — c isn't estimable from small N).
 * Coarse grid seed, then damped coordinate-wise Newton refinement using the
 * expected information — deterministic (no RNG), so calibration runs and
 * tests are reproducible.
 *
 * @param {Array<{theta:number, correct:boolean}>} samples
 * @param {{c?:number, minN?:number, seed?:{a?:number,b?:number}}} [options]
 * @returns {{a:number, b:number, c:number}|null} null when under minN
 */
function fitItem2pl(samples, options = {}) {
  const minN = options.minN ?? 10;
  if (!samples || samples.length < minN) return null;
  const c = clamp(options.c ?? 0.20, 0, 0.5);

  // Seed: coarse grid (plus the caller's seed as a candidate) so Newton starts
  // near the global optimum instead of a flat tail.
  let a = clamp(options.seed?.a ?? 1, A_BOUNDS[0], A_BOUNDS[1]);
  let b = clamp(options.seed?.b ?? 0, B_BOUNDS[0], B_BOUNDS[1]);
  let bestLL = logLikelihood(samples, { a, b, c });
  for (const ga of [0.5, 1.0, 1.5, 2.0]) {
    for (const gb of linspace(-3, 3, 13)) {
      const ll = logLikelihood(samples, { a: ga, b: gb, c });
      if (ll > bestLL) { bestLL = ll; a = ga; b = gb; }
    }
  }

  // Damped Newton, one coordinate at a time. dP/db = -SCALE·a·(P-c)(1-P)/(1-c),
  // dP/da = SCALE·(θ-b)·(P-c)(1-P)/(1-c); score = Σ (u-P)/(P(1-P))·dP/dx and
  // expected information I = Σ (dP/dx)²/(P(1-P)).
  for (let iter = 0; iter < 40; iter++) {
    let gB = 0, iB = 1e-6, gA = 0, iA = 1e-6;
    for (const { theta, correct } of samples) {
      const p = p3pl(theta, { a, b, c });
      if (p <= c + 1e-9 || p >= 1 - 1e-9) continue;
      const pq = p * (1 - p);
      const core = ((p - c) * (1 - p)) / (1 - c);
      const dpDb = -SCALE * a * core;
      const dpDa = SCALE * (theta - b) * core;
      const u = correct ? 1 : 0;
      const resid = (u - p) / pq;
      gB += resid * dpDb;
      iB += (dpDb * dpDb) / pq;
      gA += resid * dpDa;
      iA += (dpDa * dpDa) / pq;
    }
    const stepB = clamp(gB / iB, -0.5, 0.5);
    b = clamp(b + stepB, B_BOUNDS[0], B_BOUNDS[1]);
    const stepA = clamp(gA / iA, -0.25, 0.25);
    a = clamp(a + stepA, A_BOUNDS[0], A_BOUNDS[1]);
    if (Math.abs(stepB) < 1e-4 && Math.abs(stepA) < 1e-4) break;
  }

  return { a, b, c };
}

/**
 * Bayesian-anchored JMLE (MAP joint estimation) over a response matrix.
 *
 * Classic JMLE identifies the theta/b scale by mean-centering person thetas —
 * with a small user base that pins "average user = 0" and corrupts item
 * estimates. Here the person step instead estimates each person with their
 * LIVE (theta, se) as the prior (via updateTheta), anchoring the item scale
 * to the scale the app already serves; it converges to standard JMLE as data
 * grows. Author-shrinkage is deliberately NOT applied here — the caller
 * blends the returned empirical params with the author estimate by n.
 *
 * @param {object} input
 * @param {Array<{personId:string, itemId:string, correct:boolean}>} input.responses
 *   One response per (person, item) — caller dedupes to first attempts.
 * @param {Object<string,{theta:number,se:number}>} [input.personPriors]
 *   Live ability priors; missing persons default to {theta:0, se:1}.
 * @param {Object<string,{a?:number,b?:number}>} [input.itemSeeds]
 *   Initial params per item (e.g. current blend or author b); default {1, 0}.
 * @param {{c?:number, minItemN?:number, maxRounds?:number, tol?:number}} [options]
 * @returns {{items:Object<string,{a:number,b:number,n:number}>, persons:Object<string,{theta:number,se:number}>}}
 *   `items` contains only items that met minItemN and were fitted.
 */
function jmleCalibrate({ responses, personPriors = {}, itemSeeds = {} }, options = {}) {
  const c = clamp(options.c ?? 0.20, 0, 0.5);
  const minItemN = options.minItemN ?? 10;
  const maxRounds = options.maxRounds ?? 8;
  const tol = options.tol ?? 1e-3;

  const byPerson = new Map();
  const byItem = new Map();
  for (const r of responses || []) {
    if (!r || !r.personId || !r.itemId) continue;
    if (!byPerson.has(r.personId)) byPerson.set(r.personId, []);
    byPerson.get(r.personId).push(r);
    if (!byItem.has(r.itemId)) byItem.set(r.itemId, []);
    byItem.get(r.itemId).push(r);
  }

  // State: item params (seeded), person thetas (from priors).
  const items = new Map();
  for (const itemId of byItem.keys()) {
    const seed = itemSeeds[itemId] || {};
    items.set(itemId, {
      a: clamp(Number.isFinite(seed.a) ? seed.a : 1, A_BOUNDS[0], A_BOUNDS[1]),
      b: clamp(Number.isFinite(seed.b) ? seed.b : 0, B_BOUNDS[0], B_BOUNDS[1]),
      fitted: false,
    });
  }
  const persons = new Map();
  for (const personId of byPerson.keys()) {
    const prior = personPriors[personId] || {};
    persons.set(personId, {
      theta: Number.isFinite(prior.theta) ? prior.theta : 0,
      se: Number.isFinite(prior.se) ? prior.se : 1.0,
    });
  }

  for (let round = 0; round < maxRounds; round++) {
    // Person step: MAP theta per person against current item params. Every
    // response participates — unfitted items contribute through their seeds.
    for (const [personId, rows] of byPerson) {
      const prior = personPriors[personId] || { theta: 0, se: 1.0 };
      const pairs = rows.map((r) => {
        const it = items.get(r.itemId);
        return { item: { a: it.a, b: it.b, c }, correct: !!r.correct };
      });
      persons.set(personId, updateTheta(prior, pairs));
    }

    // Item step: bounded MLE per item with enough responses.
    let maxDeltaB = 0;
    for (const [itemId, rows] of byItem) {
      if (rows.length < minItemN) continue;
      const cur = items.get(itemId);
      const samples = rows.map((r) => ({
        theta: persons.get(r.personId).theta,
        correct: !!r.correct,
      }));
      const fit = fitItem2pl(samples, { c, minN: minItemN, seed: cur });
      if (!fit) continue;
      maxDeltaB = Math.max(maxDeltaB, Math.abs(fit.b - cur.b));
      items.set(itemId, { a: fit.a, b: fit.b, fitted: true });
    }
    if (maxDeltaB < tol) break;
  }

  const itemsOut = {};
  for (const [itemId, it] of items) {
    if (it.fitted) itemsOut[itemId] = { a: it.a, b: it.b, n: byItem.get(itemId).length };
  }
  const personsOut = {};
  for (const [personId, p] of persons) personsOut[personId] = { theta: p.theta, se: p.se };
  return { items: itemsOut, persons: personsOut };
}

// ---- helpers ----
function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}
function clampTheta(t) {
  return clamp(t, -4, 4);
}
function linspace(a, b, n) {
  const out = [];
  const step = (b - a) / (n - 1);
  for (let i = 0; i < n; i++) out.push(a + i * step);
  return out;
}

module.exports = {
  SCALE,
  p3pl,
  fisherInfo,
  updateTheta,
  selectNextItem,
  calibrateItem,
  fitItem2pl,
  jmleCalibrate,
  // exposed for tests
  _internals: { sigmoid, logLikelihood },
};
