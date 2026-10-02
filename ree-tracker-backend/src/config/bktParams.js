// src/config/bktParams.js
// Bayesian Knowledge Tracing parameters (roadmap 3.5). Four params per skill:
//   pInit  — P(mastery) before any evidence (prior knowledge)
//   pLearn — P(transition to mastered) after each opportunity
//   pSlip  — P(wrong | mastered)  (careless error)
//   pGuess — P(right | not mastered) (lucky guess)
//
// Defaults are tuned for 4-choice board-exam MCQ: pGuess 0.25 mirrors the IRT
// guess prior (engine/irt.js c=0.20 floor) — a mastered candidate rarely slips,
// an unmastered one clears ~1-in-4 by chance. Global for now; a per-topic
// override is a documented future step (paramsForTopic is the seam for it).

const DEFAULT_BKT = Object.freeze({
    pInit: 0.25,
    pLearn: 0.12,
    pSlip: 0.10,
    pGuess: 0.25,
});

// Resolve BKT params for a topic. Returns the global defaults today; kept as a
// function so per-topic fitted params can slot in later without touching callers.
function paramsForTopic(_topic) {
    return DEFAULT_BKT;
}

// Forgetting between practice. BKT itself has no forgetting term — P(mastery)
// only changes when the learner answers — so a topic mastered early in a
// months-long review stayed "Mastered" however long it went untouched.
// decayedMastery (engine/bkt.js) decays the STORED estimate toward pInit with
// time constant tauDays · (1 + ln(1 + masteryN)): ~3 weeks for a topic seen once,
// ~10 weeks behind fifty observations. Display/priority only — the stored
// pMastery is never rewritten by decay.
const DECAY = Object.freeze({
    tauDays: 21,
    graceDays: 1,
});

module.exports = { DEFAULT_BKT, DECAY, paramsForTopic };
