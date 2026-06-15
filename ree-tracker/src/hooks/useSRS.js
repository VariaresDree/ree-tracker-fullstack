import { useCallback } from 'react';

/**
 * Spaced Repetition System (SRS) Hook
 * Implements a modified SuperMemo-2 (SM-2) algorithm tailored for engineering board review.
 */
export const useSRS = () => {

    /**
     * Calculates the new spaced repetition variables for a specific question/flashcard.
     * * @param {string} rating - 'easy' (perfect recall), 'hard' (hesitant recall), 'again' (complete blackout)
     * @param {Object} previousData - The existing SRS data for this question (defaults to new card state)
     * @returns {Object} The updated SRS metrics including the next absolute review timestamp
     */
    const calculateNextReview = useCallback((rating, previousData = null) => {
        // Default initial state for a brand new question
        let { 
            easeFactor = 2.5, 
            interval = 0, 
            repetitions = 0 
        } = previousData || {};

        let quality;
        
        // Map user input to SM-2 quality scale (0-5)
        switch (rating) {
            case 'easy':
                quality = 5; // Perfect response
                break;
            case 'hard':
                quality = 3; // Correct response, but with significant difficulty
                break;
            case 'again':
            default:
                quality = 1; // Incorrect response, memory blackout
                break;
        }

        // --- CORE SM-2 ALGORITHM ---

        if (quality >= 3) {
            // Correct response: increment repetitions and calculate new interval
            if (repetitions === 0) {
                interval = 1; // First successful review -> see again tomorrow
            } else if (repetitions === 1) {
                interval = 6; // Second successful review -> see again in 6 days
            } else {
                // Subsequent reviews -> scale by ease factor
                interval = Math.round(interval * easeFactor);
            }
            repetitions += 1;
        } else {
            // Incorrect response: Reset interval and repetitions, card goes back to learning phase
            repetitions = 0;
            interval = 1;
        }

        // Adjust Ease Factor based on answer quality
        // Equation: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        
        // Safety bounds: EF should never drop below 1.3 to prevent cards from getting stuck in endless short loops
        if (easeFactor < 1.3) {
            easeFactor = 1.3;
        }

        // Calculate the absolute future timestamp for the next review
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + interval);

        return {
            nextReviewTimestamp: nextReviewDate.toISOString(),
            easeFactor: parseFloat(easeFactor.toFixed(2)),
            interval,
            repetitions,
            lastReviewed: new Date().toISOString()
        };
    }, []);

    /**
     * Helper function to determine if a card is "due" for review right now.
     */
    const isCardDue = useCallback((nextReviewTimestamp) => {
        if (!nextReviewTimestamp) return true; // New cards are always due
        return new Date() >= new Date(nextReviewTimestamp);
    }, []);

    return { 
        calculateNextReview,
        isCardDue
    };
};