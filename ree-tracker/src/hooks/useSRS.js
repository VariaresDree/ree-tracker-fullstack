import { useCallback } from 'react';
import { apiRequest } from '../services/dbQueries';

export const useSRS = () => {

    const calculateNextReview = useCallback((rating, previousData = null) => {
        let {
            easeFactor = 2.5,
            interval = 0,
            repetitions = 0
        } = previousData || {};

        let quality;

        switch (rating) {
            case 'easy':
                quality = 5;
                break;
            case 'hard':
                quality = 3;
                break;
            case 'again':
            default:
                quality = 1;
                break;
        }

        if (quality >= 3) {
            if (repetitions === 0) {
                interval = 1;
            } else if (repetitions === 1) {
                interval = 6;
            } else {
                interval = Math.round(interval * easeFactor);
            }
            repetitions += 1;
        } else {
            repetitions = 0;
            interval = 1;
        }

        easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (easeFactor < 1.3) {
            easeFactor = 1.3;
        }

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

    const isCardDue = useCallback((nextReviewTimestamp) => {
        if (!nextReviewTimestamp) return true;
        return new Date() >= new Date(nextReviewTimestamp);
    }, []);

    const syncReviewToBackend = useCallback(async (questionId, quality, srsData) => {
        try {
            await apiRequest('/api/srs/review', 'POST', {
                questionId,
                quality,
                easeFactor: srsData.easeFactor,
                interval: srsData.interval,
                repetitions: srsData.repetitions
            });
        } catch (err) {
            console.error('SRS sync failed:', err);
        }
    }, []);

    const fetchDueCards = useCallback(async (limit = 20) => {
        try {
            const data = await apiRequest(`/api/srs/due?limit=${limit}`);
            return data?.items || [];
        } catch (err) {
            console.error('Failed to fetch due cards:', err);
            return [];
        }
    }, []);

    const fetchSRSStats = useCallback(async () => {
        try {
            return await apiRequest('/api/srs/stats');
        } catch (err) {
            return { total: 0, due: 0, mastered: 0 };
        }
    }, []);

    return {
        calculateNextReview,
        isCardDue,
        syncReviewToBackend,
        fetchDueCards,
        fetchSRSStats
    };
};
