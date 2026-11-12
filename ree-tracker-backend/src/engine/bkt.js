// Per-topic mastery: P(mastered) in [0,1], beside the per-item IRT theta
// (engine/irt.js). Where theta is a latent ability on a continuous scale, this
// is an interpretable per-topic estimate that drives the mastery heatmap, the
// weak-topic rankings and the study plan.
//
// It is read off the learner's recent accuracy in the topic through BKT's
// answer model (Corbett & Anderson 1994): P(right) = p·(1 − slip) + (1 − p)·guess,
// solved for p. Until 2026-11-12 it was the classic BKT fold, which treats
// mastery as a state learners only ever enter; with a 12% chance of learning
// per answer, any topic answered right more than about 57% of the time drifted
// to exactly 1.0, where no wrong answer could move it (57 of 184 live topic
// rows, Calculus 1 at 58% right among them).
//
// Pure and stateless, so the same fold runs online (telemetryService, one
// batch at a time from the stored estimate) and in batch
// (services/masteryRollups.js, replaying history), and the data migration
// 20261119000000_mastery_recent_accuracy is the same arithmetic in SQL.

'use strict';

const { DEFAULT_BKT, DECAY } = require('../config/bktParams');

function clamp01(x) {
    if (!Number.isFinite(x)) return 0;
    return x < 0 ? 0 : x > 1 ? 1 : x;
}

const paramOf = (params, key) => params?.[key] ?? DEFAULT_BKT[key];

/** The accuracy a mastery stands for: p·(1 − slip) + (1 − p)·guess. */
function accuracyOf(pMastery, params = DEFAULT_BKT) {
    const guess = paramOf(params, 'pGuess');
    return guess + clamp01(pMastery) * (1 - paramOf(params, 'pSlip') - guess);
}

/** The mastery an accuracy stands for (accuracyOf solved for p), in [0,1]. */
function masteryOf(accuracy, params = DEFAULT_BKT) {
    const guess = paramOf(params, 'pGuess');
    return clamp01((accuracy - guess) / (1 - paramOf(params, 'pSlip') - guess));
}

/**
 * Fold chronological answers into mastery. The accuracy estimate starts at
 * pInit's accuracy, worth `priorAnswers` answers, and each answer moves it
 * 1/(priorAnswers + n) of the way (a plain average with the prior) until that
 * step falls to `minStep`, after which it weighs recent answers more.
 *
 * shortcut: continuing from a stored mastery of exactly 0 or 1 resumes from
 * 25% or 90% accuracy, the ends of the scale; store the accuracy itself if a
 * learner's 97% ever needs telling from 90%.
 *
 * @param {Array<boolean|{correct:boolean}>} observations chronological
 * @param {object} [params]
 * @param {number} [prior] stored mastery to continue from; defaults to pInit
 * @param {number} [priorN] answers already behind `prior` (masteryN)
 * @returns {{pMastery:number, n:number}} n = observations folded here
 */
function masterySequence(observations, params = DEFAULT_BKT, prior = undefined, priorN = 0) {
    let acc = accuracyOf(Number.isFinite(prior) ? prior : paramOf(params, 'pInit'), params);
    const k = paramOf(params, 'priorAnswers');
    const minStep = paramOf(params, 'minStep');
    let seen = Math.max(0, Number(priorN) || 0);
    let n = 0;
    for (const obs of observations || []) {
        const correct = typeof obs === 'boolean' ? obs : !!obs.correct;
        seen += 1;
        n += 1;
        acc += ((correct ? 1 : 0) - acc) * Math.max(minStep, 1 / (k + seen));
    }
    return { pMastery: masteryOf(acc, params), n };
}

/**
 * Mastery after forgetting: the stored P(mastery) decayed toward pInit for the
 * days since the topic was last practised. Stability grows with the evidence
 * behind the estimate (masteryN), so a topic drilled fifty times fades far more
 * slowly than one seen once.
 *
 *   p_eff = floor + (p − floor) · exp(−max(0, days − grace) / (τ · (1 + ln(1 + n))))
 *
 * Non-destructive by design: callers use it for display and prioritisation; it
 * never rewrites the stored pMastery, which stays the pure evidence fold.
 *
 * @param {number|null} pMastery stored estimate
 * @param {number|null} daysSince days since the topic was last practised
 * @param {number} [masteryN] observations behind the estimate
 * @returns {number|null}
 */
function decayedMastery(pMastery, daysSince, masteryN = 0, params = DEFAULT_BKT, decay = DECAY) {
    if (pMastery === null || pMastery === undefined || !Number.isFinite(pMastery)) return null;
    if (daysSince === null || daysSince === undefined || !Number.isFinite(daysSince)) return pMastery;
    const floor = params.pInit ?? DEFAULT_BKT.pInit;
    const elapsed = daysSince - decay.graceDays;
    if (elapsed <= 0 || pMastery <= floor) return pMastery;
    const n = Math.max(0, Number(masteryN) || 0);
    const tau = decay.tauDays * (1 + Math.log(1 + n));
    return floor + (pMastery - floor) * Math.exp(-elapsed / tau);
}

module.exports = { masterySequence, accuracyOf, masteryOf, clamp01, decayedMastery };
