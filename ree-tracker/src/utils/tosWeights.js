// src/utils/tosWeights.js
import { useStore } from '../store/useStore';

/**
 * PRC TOS WEIGHTING CONSTANTS
 * Used for weighted score calculations across the three major REE subjects.
 */
export const TOS_WEIGHTS = {
    MATHEMATICS: 0.25, // 25% weight
    ESAS: 0.30,        // 30% weight
    EE: 0.45           // 45% weight
};

/**
 * Calculates a weighted average based on PRC board exam specifications.
 * 
 * @param {number} mathScore - Percentage score in Math (0-100)
 * @param {number} esasScore - Percentage score in ESAS (0-100)
 * @param {number} eeScore   - Percentage score in EE (0-100)
 * @returns {number} The final weighted board rating
 */
export const calculateWeightedRating = (mathScore, esasScore, eeScore) => {
    const finalRating = (
        (mathScore * TOS_WEIGHTS.MATHEMATICS) + 
        (esasScore * TOS_WEIGHTS.ESAS) + 
        (eeScore * TOS_WEIGHTS.EE)
    );
    return Math.round(finalRating * 100) / 100;
};

/**
 * Normalizes a raw score based on its subject weight for predictive analytics.
 */
export const getWeightedContribution = (rawScore, subjectKey) => {
    const weight = TOS_WEIGHTS[subjectKey.toUpperCase()] || 0;
    return rawScore * weight;
};

/**
 * 🚀 NEW: Dynamic Topic Weights for the Simulator Engine
 * Automatically scales the simulator distribution to include newly added 
 * topics from the PostgreSQL TOS Matrix.
 */
export const getDynamicWeights = (subject) => {
    const { dynamicTOS } = useStore.getState();
    
    // Safety fallback
    if (!dynamicTOS || !dynamicTOS[subject]) {
        return {};
    }

    const topics = dynamicTOS[subject];
    if (topics.length === 0) return {};

    // Distributes mathematical selection weighting evenly across all active topics
    const weightPerTopic = 1.0 / topics.length;
    
    const weights = {};
    topics.forEach(topic => {
        weights[topic] = weightPerTopic;
    });

    return weights;
};