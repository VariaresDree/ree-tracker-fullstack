// Forecasting — turns ability estimates into a PRC board outcome, and weak
// topics into concrete next steps.
//
// v1 reported P(global θ > 0) and called it the pass probability. The PRC rule
// is not a θ cutoff: it is a general WEIGHTED average of at least 70%
// (Mathematics 25 / ESAS 30 / EE 45) AND no subject below 50%. A candidate can
// clear the average and still not pass because one subject fell through the
// floor — the most common way a strong reviewer fails — and v1 could not see it.
//
// v2 models the sitting itself:
//   1. each subject's ability (θ_s, se_s) maps to an expected score through the
//      test characteristic curve (TCC) of that subject's bank — the mean 3PL
//      probability of a correct answer across its items;
//   2. a sitting is simulated (Monte Carlo, seeded so it is deterministic):
//      θ_s ~ N(θ̂_s, se_s²), score_s ~ Binomial(100, TCC_s(θ_s));
//   3. every simulated sitting is graded by the shared PRC rule — the
//      precompiled form of the gradeBoardExam the results screen and exam
//      history use (a contract test holds the two to identical output).
//
// Pure: callers supply abilities, TCC grids and weights; nothing here touches
// the database.

'use strict';

const { erf } = require('./math');
const { p3pl, THETA_MIN, THETA_MAX } = require('./irt');
const {
    createBoardGrader,
    DEFAULT_SYLLABUS_WEIGHTS,
    normalizeWeights,
    PRC_EXAM_FORMAT,
    VERDICT,
    TIME_SINK_MS,
    BLIND_SPOT_MIN_ATTEMPTS,
} = require('@ree/shared');
const { DEFAULT_BKT } = require('../config/bktParams');

const MODEL_VERSION = 'v2-prc';
const SUBJECTS = ['Mathematics', 'ESAS', 'EE'];
const TOPNOTCHER_CUTOFF_THETA = 1.5;

// θ grid the TCC is tabulated on: −4..4 in steps of 0.05 (161 points). The
// Monte Carlo interpolates from it rather than evaluating every item per draw,
// which on the free tier's 0.1 CPU would cost ~1.8M p3pl calls per request.
const GRID_MIN = THETA_MIN;
const GRID_STEP = 0.05;
const GRID_N = Math.round((THETA_MAX - THETA_MIN) / GRID_STEP) + 1;

const DEFAULT_DRAWS = 2000;
const DEFAULT_SEED = 20261002;
// A gain of half a standard deviation — the "what if I improved here" probe.
const BINDING_PROBE = 0.5;
// How much a topic the learner is confidently wrong about is lifted in rank.
const BLIND_SPOT_BOOST = 0.5;
const BLIND_SPOT_MIN_RATE = 0.2;

/** Normal CDF via erf. */
function normCdf(x, mu = 0, sigma = 1) {
    return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}

function probAboveCutoff(theta, se, cutoff) {
    const t = Number.isFinite(theta) ? theta : 0;
    const s = Number.isFinite(se) ? se : 1;
    return 1 - normCdf(cutoff, t, Math.max(0.05, s));
}

/**
 * Topnotcher estimate — still a θ cutoff (top-10% ≈ θ 1.5). Topnotcher is a
 * RANK among the sitting's cohort, which no single-candidate model can know, so
 * it stays a labelled estimate.
 */
function probabilities(ability, opts = {}) {
    const topCutoff = opts.topCutoff ?? TOPNOTCHER_CUTOFF_THETA;
    return { topnotcherProbability: clamp01(probAboveCutoff(ability.theta, ability.se, topCutoff)) };
}

// ── Test characteristic curve ───────────────────────────────────────────────

/**
 * Tabulate a subject's TCC: the mean P(correct) across its items at each grid
 * θ. An empty bank falls back to one average item (a=1, b=0, c=0.2).
 *
 * @param {Array<{a:number,b:number,c:number}>} items
 * @returns {number[]} GRID_N values
 */
function buildTccGrid(items) {
    const form = Array.isArray(items) && items.length > 0 ? items : [{ a: 1, b: 0, c: 0.2 }];
    const out = new Array(GRID_N);
    for (let i = 0; i < GRID_N; i++) {
        const theta = GRID_MIN + i * GRID_STEP;
        let sum = 0;
        for (const item of form) sum += p3pl(theta, item);
        out[i] = sum / form.length;
    }
    return out;
}

/** Linear interpolation of a TCC grid at θ (clamped to the grid). */
function tccAt(grid, theta) {
    const t = Math.min(THETA_MAX, Math.max(GRID_MIN, Number.isFinite(theta) ? theta : 0));
    const pos = (t - GRID_MIN) / GRID_STEP;
    const lo = Math.floor(pos);
    const hi = Math.min(GRID_N - 1, lo + 1);
    const frac = pos - lo;
    return grid[lo] + (grid[hi] - grid[lo]) * frac;
}

// ── Monte Carlo ──────────────────────────────────────────────────────────────

/** mulberry32 — small, fast, seedable PRNG. */
function createRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Standard normal draw (Box–Muller). */
function randNormal(rng) {
    let u = 0;
    while (u === 0) u = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

function quantile(sorted, q) {
    if (sorted.length === 0) return 0;
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const round1 = (x) => Math.round(x * 10) / 10;

/**
 * Simulate PRC sittings and grade each with the shared rule.
 *
 * @param {object} input
 * @param {Record<string,{theta:number,se:number,tcc:number[]}>} input.subjects
 * @param {object} [input.weights]  syllabus weights (defaults to 25/30/45)
 * @param {number} [input.draws]
 * @param {number} [input.seed]
 */
function simulateBoard({ subjects, weights = DEFAULT_SYLLABUS_WEIGHTS, draws = DEFAULT_DRAWS, seed = DEFAULT_SEED }) {
    const keys = Object.keys(subjects || {});
    const rng = createRng(seed);
    const scoresBySubject = Object.fromEntries(keys.map((k) => [k, new Array(draws)]));
    const gwas = new Array(draws);
    const grade = createBoardGrader(weights);
    let passed = 0;
    let conditional = 0;

    for (let d = 0; d < draws; d++) {
        const sitting = {};
        for (const k of keys) {
            const { theta, se, tcc } = subjects[k];
            const items = PRC_EXAM_FORMAT[k]?.items || 100;
            const drawnTheta = theta + Math.max(0, se) * randNormal(rng);
            const p = tccAt(tcc, drawnTheta);
            // Item sampling noise: Binomial(items, p), normal approximation.
            const raw = items * p + Math.sqrt(items * p * (1 - p)) * randNormal(rng);
            const correct = Math.round(Math.min(items, Math.max(0, raw)));
            const pct = (correct / items) * 100;
            sitting[k] = pct;
            scoresBySubject[k][d] = pct;
        }
        const { generalAverage, verdict } = grade(sitting);
        gwas[d] = generalAverage;
        if (verdict === VERDICT.PASSED) passed += 1;
        else if (verdict === VERDICT.CONDITIONAL) conditional += 1;
    }

    const subjectsOut = {};
    for (const k of keys) {
        const arr = scoresBySubject[k];
        const sorted = [...arr].sort((a, b) => a - b);
        subjectsOut[k] = {
            expected: round1(arr.reduce((acc, x) => acc + x, 0) / draws),
            p50: arr.filter((x) => x >= 50).length / draws,
            p70: arr.filter((x) => x >= 70).length / draws,
            low: round1(quantile(sorted, 0.1)),
            high: round1(quantile(sorted, 0.9)),
        };
    }
    const sortedGwa = [...gwas].sort((a, b) => a - b);
    return {
        passProbability: passed / draws,
        conditionalProbability: conditional / draws,
        projectedGWA: {
            mean: round1(gwas.reduce((acc, x) => acc + x, 0) / draws),
            low: round1(quantile(sortedGwa, 0.1)),
            high: round1(quantile(sortedGwa, 0.9)),
        },
        subjects: subjectsOut,
    };
}

/**
 * The subject where improving by half a standard deviation raises the pass
 * probability most. Same seed for every probe (common random numbers), so the
 * comparison measures the change in ability, not simulation noise. Ties go to
 * the heavier syllabus weight.
 */
function bindingSubject({ subjects, weights = DEFAULT_SYLLABUS_WEIGHTS, draws = DEFAULT_DRAWS, seed = DEFAULT_SEED }) {
    const w = normalizeWeights(weights);
    const base = simulateBoard({ subjects, weights, draws, seed }).passProbability;
    let best = null;
    for (const k of Object.keys(subjects || {})) {
        const probed = { ...subjects, [k]: { ...subjects[k], theta: subjects[k].theta + BINDING_PROBE } };
        const gain = simulateBoard({ subjects: probed, weights, draws, seed }).passProbability - base;
        if (!best || gain > best.gain + 1e-9 || (Math.abs(gain - best.gain) <= 1e-9 && (w[k] || 0) > (w[best.k] || 0))) {
            best = { k, gain };
        }
    }
    return best ? best.k : null;
}

// ── Weak topics + prescription ───────────────────────────────────────────────

/**
 * Rank topics by what a gap costs on the board: (1 − effective mastery) ×
 * subject weight, lifted for topics the learner is CONFIDENTLY getting wrong.
 * Reads every topic with history (v1 read only the 20 most recently touched,
 * so an old weak topic could never be recommended again).
 *
 * @param {Array<{topic, subject, topicId?, masteryEffective, masteryN, attempts, confidentMisses, medianMs}>} topics
 */
function rankWeakTopics(topics, weights = DEFAULT_SYLLABUS_WEIGHTS) {
    const w = normalizeWeights(weights);
    return (topics || [])
        .map((t) => {
            const p = Number.isFinite(t.masteryEffective) ? t.masteryEffective : DEFAULT_BKT.pInit;
            const attempts = Math.max(0, Number(t.attempts) || 0);
            const confidentMisses = Math.max(0, Number(t.confidentMisses) || 0);
            const blindSpotRate = attempts > 0 ? confidentMisses / attempts : 0;
            const blindSpot = confidentMisses >= BLIND_SPOT_MIN_ATTEMPTS && blindSpotRate >= BLIND_SPOT_MIN_RATE;
            const weight = w[t.subject] ?? 0.1;
            const priority = (1 - p) * weight * (1 + BLIND_SPOT_BOOST * Math.min(1, blindSpotRate * 2));
            return {
                topic: t.topic,
                subject: t.subject,
                topicId: t.topicId ?? null,
                masteryEffective: p,
                masteryN: t.masteryN ?? 0,
                attempts,
                confidentMisses,
                blindSpot,
                slow: Number(t.medianMs) > TIME_SINK_MS,
                medianMs: Number(t.medianMs) || null,
                priority,
            };
        })
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);
}

const pct = (p) => `${Math.round(p * 100)}%`;
// 'an EE topic', 'an ESAS topic', 'a Mathematics topic' — by the first letter,
// which is how all three subject names are read aloud.
const withArticle = (word) => `${/^[aeiou]/i.test(String(word)) ? 'an' : 'a'} ${word}`;

/**
 * Up to three next steps, in order of leverage. Each carries a `type` the
 * dashboard routes and a `payload` naming a real topic.
 *   BLIND_SPOT     re-drill the topic you are confidently getting wrong
 *   DRILL          a targeted adaptive drill on the costliest gap
 *   SRS_DUE        clear the spaced-review queue
 *   FORMULA_CARDS  shortcut cards for a topic that eats the clock
 *   READ           foundation reading for a topic barely started
 */
function buildPrescription({ weakTopics = [], srsDue = 0 }) {
    const actions = [];
    const used = new Set();

    const blind = weakTopics.filter((t) => t.blindSpot).sort((a, b) => b.confidentMisses - a.confidentMisses)[0];
    if (blind) {
        used.add(blind.topic);
        actions.push({
            type: 'BLIND_SPOT',
            payload: { topic: blind.topic, subject: blind.subject, topicId: blind.topicId, count: 10 },
            reason: `${blind.confidentMisses} confident answers here were wrong — the misconception to fix first.`,
        });
    }

    const drill = weakTopics.find((t) => !used.has(t.topic));
    if (drill) {
        used.add(drill.topic);
        actions.push({
            type: drill.masteryN < 3 && drill.masteryEffective < 0.35 ? 'READ' : 'DRILL',
            payload: drill.masteryN < 3 && drill.masteryEffective < 0.35
                ? { topic: drill.topic, subject: drill.subject, topicId: drill.topicId, durationMin: 25 }
                : { topic: drill.topic, subject: drill.subject, topicId: drill.topicId, count: 10 },
            reason: `Mastery ${pct(drill.masteryEffective)} in ${withArticle(drill.subject)} topic — the costliest gap on the board.`,
        });
    }

    if (srsDue > 0) {
        actions.push({
            type: 'SRS_DUE',
            payload: { count: Math.min(srsDue, 30) },
            reason: `${srsDue} question${srsDue === 1 ? '' : 's'} due for spaced review today.`,
        });
    }

    const slow = weakTopics.find((t) => t.slow);
    if (slow) {
        actions.push({
            type: 'FORMULA_CARDS',
            payload: { topic: slow.topic, subject: slow.subject },
            reason: `Median ${Math.round((slow.medianMs || 0) / 1000)}s per item — over the 3-minute pace. Drill the formulas.`,
        });
    }

    return actions.slice(0, 3);
}

// ── Top level ────────────────────────────────────────────────────────────────

/**
 * @param {object} input
 * @param {{theta:number, se:number}} input.ability            global posterior
 * @param {Record<string,{theta:number,se:number}>} input.subjectAbilities per-subject posteriors
 * @param {Record<string,number[]>} input.tccBySubject          TCC grids
 * @param {object} [input.weights]
 * @param {Array} [input.topicSignals]                          per-topic rows for rankWeakTopics
 * @param {number} [input.srsDue]
 * @param {number} [input.priorSe]                              se for a subject with no evidence
 */
function buildForecast({ ability, subjectAbilities = {}, tccBySubject = {}, weights = DEFAULT_SYLLABUS_WEIGHTS, topicSignals = [], srsDue = 0, priorSe = 1 }) {
    const safeAbility = {
        theta: Number.isFinite(ability?.theta) ? ability.theta : 0,
        se: Number.isFinite(ability?.se) ? ability.se : priorSe,
    };

    const subjects = {};
    for (const s of SUBJECTS) {
        const own = subjectAbilities[s];
        const hasOwn = own && Number.isFinite(own.theta);
        subjects[s] = {
            theta: hasOwn ? own.theta : safeAbility.theta,
            // A subject with no evidence of its own is centred on the global θ
            // but carries the full prior uncertainty.
            se: hasOwn && Number.isFinite(own.se) ? own.se : Math.max(safeAbility.se, priorSe),
            tcc: tccBySubject[s] || buildTccGrid([]),
        };
    }

    const sim = simulateBoard({ subjects, weights });
    const weakTopics = rankWeakTopics(topicSignals, weights);
    return {
        passProbability: clamp01(sim.passProbability),
        topnotcherProbability: probabilities(safeAbility).topnotcherProbability,
        // Naive percentile rank: assumes the cohort's θ ~ Normal(0, 1).
        expectedRank: Math.round(100 * (1 - normCdf(safeAbility.theta, 0, 1))),
        weakTopics,
        recommendedActions: buildPrescription({ weakTopics, srsDue }),
        subjectForecasts: {
            conditionalProbability: sim.conditionalProbability,
            projectedGWA: sim.projectedGWA,
            subjects: sim.subjects,
            bindingSubject: bindingSubject({ subjects, weights }),
        },
        modelVersion: MODEL_VERSION,
    };
}

function clamp01(x) {
    return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
}

module.exports = {
    MODEL_VERSION,
    SUBJECTS,
    probabilities,
    buildTccGrid,
    tccAt,
    simulateBoard,
    bindingSubject,
    rankWeakTopics,
    buildPrescription,
    buildForecast,
    _internals: { normCdf, probAboveCutoff, createRng },
};
