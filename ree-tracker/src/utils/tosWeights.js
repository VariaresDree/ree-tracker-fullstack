// src/utils/tosWeights.js
//
// PRC Table-of-Specification weighting. The constants and the weighted-average
// math now come from @ree/shared, which the API uses too.
//
// This file previously declared its own UPPERCASE-keyed map
// ({ MATHEMATICS, ESAS, EE }) that was incompatible with the three other copies
// of the same numbers, and — more importantly — neither calculateWeightedRating
// nor getWeightedContribution ever consulted the SyllabusWeight table that is
// supposed to be the source of truth. An admin who reseeded that table changed
// the server's blended sampler and `fetchSyllabusWeights`, but every weighted
// rating computed on the client silently kept these hardcoded numbers.
//
// Both functions now accept an optional `weights` argument so a caller holding
// the fetched table can pass it; the shared default is the fallback, not the
// authority.
import { DEFAULT_SYLLABUS_WEIGHTS, weightedAverage, normalizeSubject, normalizeWeights } from '@ree/shared';
import { useStore } from '../store/useStore';

/**
 * PRC TOS weights, canonically keyed ('Mathematics' | 'ESAS' | 'EE').
 * Kept as a named export for existing call sites; it is the FALLBACK blend.
 */
export const TOS_WEIGHTS = DEFAULT_SYLLABUS_WEIGHTS;

/**
 * Weighted board rating from the three subject percentages (0-100).
 *
 * @param {number} mathScore
 * @param {number} esasScore
 * @param {number} eeScore
 * @param {object} [weights] fetched SyllabusWeight map; defaults to the PRC blend
 * @returns {number} weighted general average
 */
export const calculateWeightedRating = (mathScore, esasScore, eeScore, weights = TOS_WEIGHTS) =>
    weightedAverage({ Mathematics: mathScore, ESAS: esasScore, EE: eeScore }, weights);

/**
 * Contribution of one subject's raw score to the weighted rating.
 * Accepts any subject spelling or casing — the old version did
 * `TOS_WEIGHTS[subjectKey.toUpperCase()]`, so 'Mathematics' worked but
 * 'Math' and the long spellings silently returned 0.
 */
export const getWeightedContribution = (rawScore, subjectKey, weights = TOS_WEIGHTS) => {
    const w = normalizeWeights(weights);
    const weight = w[normalizeSubject(subjectKey)] || 0;
    return rawScore * weight;
};

/**
 * Dynamic per-topic weights for the simulator's question distribution, so newly
 * added TOS topics are included automatically. Unrelated to the subject blend
 * above — this spreads selection evenly across a subject's active topics.
 */
export const getDynamicWeights = (subject) => {
    const { dynamicTOS } = useStore.getState();

    if (!dynamicTOS || !dynamicTOS[subject]) {
        return {};
    }

    const topics = dynamicTOS[subject];
    if (topics.length === 0) return {};

    const weightPerTopic = 1.0 / topics.length;

    const weights = {};
    topics.forEach((topic) => {
        weights[topic] = weightPerTopic;
    });

    return weights;
};
