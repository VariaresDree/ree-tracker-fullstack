// Forecasting service — turns IRT ability estimates into actionable
// pass/topnotcher probabilities and a ranked list of weak topics.
//
// Distribution assumptions are deliberately simple and tunable. The cutoff
// model treats the board exam pass mark (70% raw) as roughly equivalent to
// theta = 0.0 on our internal scale; topnotcher tier (top 10%) maps to
// theta = 1.5. These are calibration constants we can re-fit once we have
// outcome data from real users.

'use strict';

const { erf } = require('./math');

const PASS_CUTOFF_THETA = 0.0;
const TOPNOTCHER_CUTOFF_THETA = 1.5;
const MODEL_VERSION = 'v1';

/** Normal CDF via erf. */
function normCdf(x, mu = 0, sigma = 1) {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}

/**
 * Probability the user's true theta clears a cutoff, given the posterior
 * estimate (theta, se). Right-tail of a Normal(theta, se^2).
 */
function probAboveCutoff(theta, se, cutoff) {
  const sigma = Math.max(0.05, se);
  return 1 - normCdf(cutoff, theta, sigma);
}

/**
 * Pass / topnotcher probabilities + a confidence band.
 *
 * @param {object} ability - {theta:number, se:number}
 * @param {object} [opts]
 */
function probabilities(ability, opts = {}) {
  const passCutoff = opts.passCutoff ?? PASS_CUTOFF_THETA;
  const topCutoff = opts.topCutoff ?? TOPNOTCHER_CUTOFF_THETA;
  const passProbability = probAboveCutoff(ability.theta, ability.se, passCutoff);
  const topnotcherProbability = probAboveCutoff(ability.theta, ability.se, topCutoff);
  return {
    passProbability: clamp01(passProbability),
    topnotcherProbability: clamp01(topnotcherProbability),
  };
}

/**
 * Rank topics by gap-to-target. `target` is the theta we want the user to
 * sit at by exam day for a comfortable margin; weakest gaps come first.
 *
 * @param {Array<{topic:string, theta:number, se:number}>} topicAbilities
 * @param {number} [target]
 */
function rankWeakTopics(topicAbilities, target = 0.5) {
  return topicAbilities
    .map((t) => ({
      topic: t.topic,
      theta: t.theta,
      se: t.se,
      gapToTarget: target - t.theta,
    }))
    .sort((a, b) => b.gapToTarget - a.gapToTarget)
    .slice(0, 5);
}

/**
 * Translate weak topics into 3 concrete next actions for the dashboard's
 * prescription panel. The actions are intentionally generic so the frontend
 * can route them — each carries a `type` enum and a `payload`.
 *
 * Types:
 *  - SRS_REVIEW    review N flashcards in this topic
 *  - DRILL         drill M items at the topic + difficulty band
 *  - READ          read source material tagged to this topic
 */
function buildPrescription(weakTopics) {
  const actions = [];
  for (const w of weakTopics.slice(0, 3)) {
    if (w.gapToTarget > 1.0) {
      actions.push({
        type: 'READ',
        payload: { topic: w.topic, durationMin: 25 },
        reason: `Theta ${w.theta.toFixed(2)} vs target — read foundation first.`,
      });
    } else if (w.gapToTarget > 0.3) {
      actions.push({
        type: 'DRILL',
        payload: { topic: w.topic, count: 10, difficultyBand: [w.theta - 0.3, w.theta + 0.6] },
        reason: `Close the ${w.gapToTarget.toFixed(2)} gap with targeted drills.`,
      });
    } else {
      actions.push({
        type: 'SRS_REVIEW',
        payload: { topic: w.topic, cardCount: 8 },
        reason: 'Within striking distance — consolidate via spaced repetition.',
      });
    }
  }
  return actions;
}

/**
 * Top-level forecast builder. Pure function — pass it the ability snapshot
 * and topic abilities, get back the payload to persist as a
 * ForecastSnapshot row.
 */
function buildForecast({ ability, topicAbilities = [] }) {
  const probs = probabilities(ability);
  const weakTopics = rankWeakTopics(topicAbilities);
  const recommendedActions = buildPrescription(weakTopics);
  // Naive percentile rank from theta + cutoff distribution.
  // Assumes board cohort theta ~ Normal(0, 1).
  const expectedRank = Math.round(100 * (1 - normCdf(ability.theta, 0, 1)));
  return {
    passProbability: probs.passProbability,
    topnotcherProbability: probs.topnotcherProbability,
    expectedRank,
    weakTopics,
    recommendedActions,
    modelVersion: MODEL_VERSION,
  };
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

module.exports = {
  MODEL_VERSION,
  probabilities,
  buildForecast,
  rankWeakTopics,
  buildPrescription,
  // exposed for tests
  _internals: { normCdf, probAboveCutoff },
};
