// src/config/bktParams.js
// Per-topic mastery parameters (engine/bkt.js).
//   pInit  — mastery before any evidence (prior knowledge)
//   pSlip  — P(wrong | mastered)  (careless error)
//   pGuess — P(right | not mastered) (lucky guess), 1 in 4 on board-exam MCQ
//
// Mastery is read off recent accuracy through BKT's answer model,
// P(right) = p·(1 − slip) + (1 − p)·guess, so 25% right is no mastery and 90%
// right is full mastery. (Until 2026-11-12 it was classic BKT with a 12%
// chance of learning per answer; that fold has mastery as a one-way door, so
// any topic answered right more than about 57% of the time climbed to 1.0 and
// stayed there: Calculus 1 at 58% right read "Mastered".)
//
//   priorAnswers — the prior counts as this many answers at pInit's accuracy,
//                  so four right of four reads Proficient, not Mastered;
//   minStep      — each answer moves the estimate at least this share of the
//                  way, so it follows about the last 40 answers in a topic.

const DEFAULT_BKT = Object.freeze({
    pInit: 0.25,
    pSlip: 0.10,
    pGuess: 0.25,
    priorAnswers: 4,
    minStep: 0.05,
});

// Resolve the params for a topic. Returns the global defaults today; kept as a
// function so per-topic fitted params can slot in later without touching callers.
function paramsForTopic(_topic) {
    return DEFAULT_BKT;
}

// Forgetting between practice. The estimate only changes when the learner
// answers, so a topic mastered early in a months-long review stayed
// "Mastered" however long it went untouched. decayedMastery (engine/bkt.js)
// decays the STORED estimate toward pInit with time constant
// tauDays · (1 + ln(1 + masteryN)): ~3 weeks for a topic seen once, ~10 weeks
// behind fifty observations. Display/priority only — the stored pMastery is
// never rewritten by decay.
const DECAY = Object.freeze({
    tauDays: 21,
    graceDays: 1,
});

module.exports = { DEFAULT_BKT, DECAY, paramsForTopic };
