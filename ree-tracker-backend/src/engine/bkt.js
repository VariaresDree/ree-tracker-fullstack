// Bayesian Knowledge Tracing (BKT) — per-skill mastery estimate.
// A complementary signal to the per-item IRT theta (engine/irt.js): where theta
// is a latent ability on a continuous scale, BKT gives an interpretable
// per-topic P(mastery) in [0,1] that drives the topic mastery heatmap.
//
// Standard 4-parameter BKT (Corbett & Anderson 1994). All numerics are pure and
// stateless so the module is unit-testable without a DB, and so the same fold
// runs both online (telemetryService, one attempt at a time) and in batch
// (scripts/backfillMastery.js, replaying history).

'use strict';

const { DEFAULT_BKT, DECAY } = require('../config/bktParams');

function clamp01(x) {
    if (!Number.isFinite(x)) return 0;
    return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Bayes step: posterior P(mastered | observation) given the prior P(mastered).
 *   correct:  P(L)·(1−slip)               / [ P(L)·(1−slip) + (1−P(L))·guess ]
 *   wrong:    P(L)·slip                    / [ P(L)·slip     + (1−P(L))·(1−guess) ]
 *
 * @param {number} pMastery prior P(mastered) in [0,1]
 * @param {boolean} correct
 * @param {object} [params] {pSlip, pGuess}
 * @returns {number} posterior P(mastered)
 */
function bktPosterior(pMastery, correct, params = DEFAULT_BKT) {
    const pL = clamp01(pMastery);
    const slip = params.pSlip ?? DEFAULT_BKT.pSlip;
    const guess = params.pGuess ?? DEFAULT_BKT.pGuess;
    let num, den;
    if (correct) {
        num = pL * (1 - slip);
        den = num + (1 - pL) * guess;
    } else {
        num = pL * slip;
        den = num + (1 - pL) * (1 - guess);
    }
    // den is 0 only in degenerate param corners (e.g. guess=0 and a wrong-from-
    // certain-mastery event) — fall back to the prior rather than divide by zero.
    if (den <= 0) return pL;
    return clamp01(num / den);
}

/**
 * One full BKT step: Bayes update on the observation, then the learning
 * transition P(L') = posterior + (1 − posterior)·pLearn.
 *
 * @param {number} pMastery prior P(mastered)
 * @param {boolean} correct
 * @param {object} [params] {pSlip, pGuess, pLearn}
 * @returns {number} updated P(mastered)
 */
function bktUpdate(pMastery, correct, params = DEFAULT_BKT) {
    const posterior = bktPosterior(pMastery, correct, params);
    const learn = params.pLearn ?? DEFAULT_BKT.pLearn;
    return clamp01(posterior + (1 - posterior) * learn);
}

/**
 * Fold an ordered sequence of observations through BKT from a starting prior
 * (defaults to pInit). Order matters — this equals iterated bktUpdate.
 *
 * @param {Array<boolean|{correct:boolean}>} observations chronological
 * @param {object} [params]
 * @param {number} [prior] starting P(mastered); defaults to params.pInit
 * @returns {{pMastery:number, n:number}}
 */
function bktSequence(observations, params = DEFAULT_BKT, prior = undefined) {
    let pL = Number.isFinite(prior) ? clamp01(prior) : (params.pInit ?? DEFAULT_BKT.pInit);
    let n = 0;
    for (const obs of observations || []) {
        const correct = typeof obs === 'boolean' ? obs : !!obs.correct;
        pL = bktUpdate(pL, correct, params);
        n += 1;
    }
    return { pMastery: pL, n };
}

/**
 * Predicted P(correct on the next attempt) given current mastery — the
 * observable BKT prediction, bounded to [pGuess, 1−pSlip].
 *   P(L)·(1−slip) + (1−P(L))·guess
 */
function pCorrectNext(pMastery, params = DEFAULT_BKT) {
    const pL = clamp01(pMastery);
    const slip = params.pSlip ?? DEFAULT_BKT.pSlip;
    const guess = params.pGuess ?? DEFAULT_BKT.pGuess;
    return clamp01(pL * (1 - slip) + (1 - pL) * guess);
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

module.exports = { bktPosterior, bktUpdate, bktSequence, pCorrectNext, clamp01, decayedMastery };
