import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Accuracy by time of day (Progress › Habits, CELE round): Manila hours folded
// into bands, board hours (8 AM–5 PM) against the off-hours band most unlike
// them, and a headline only with enough answers on both sides.

const { bandOfHour, summarizeTimeOfDay, MIN_BAND_ANSWERS } = require('../src/services/timeOfDay');

describe('bands', () => {
    it('folds each Manila hour into its band, late night across midnight', () => {
        expect([5, 7, 8, 11, 12, 16, 17, 21, 22, 23, 0, 4].map((h) => bandOfHour(h).id))
            .toEqual(['early', 'early', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'late', 'late', 'late', 'late']);
    });

    it('sums accuracy and pace per band, with board hours as morning and afternoon together', () => {
        const out = summarizeTimeOfDay([
            { hour: 9, answers: 20, correct: 12, timedMs: 2_000_000, timed: 20 },
            { hour: 14, answers: 20, correct: 12 },
            { hour: 21, answers: 40, correct: 32 },
        ]);
        expect(out.boardHours).toEqual({ answers: 40, accuracy: 60 });
        expect(out.bands.find((b) => b.id === 'morning')).toMatchObject({ answers: 20, accuracy: 60, avgSeconds: 100 });
        expect(out.bands.find((b) => b.id === 'evening')).toMatchObject({ answers: 40, accuracy: 80, avgSeconds: null });
        expect(out.headline).toEqual({ band: 'evening', label: 'Evening', gap: 20, bandAccuracy: 80, boardAccuracy: 60 });
        expect(out.total).toBe(80);
    });

    it('no headline with too few answers, or too small a gap', () => {
        const few = summarizeTimeOfDay([{ hour: 9, answers: 40, correct: 20 }, { hour: 21, answers: MIN_BAND_ANSWERS - 1, correct: 29 }]);
        expect(few.headline).toBeNull();
        const close = summarizeTimeOfDay([{ hour: 9, answers: 40, correct: 28 }, { hour: 21, answers: 40, correct: 30 }]);
        expect(close.headline).toBeNull();
    });
});

describe('GET /api/analytics/deep/time-of-day', () => {
    const verifyIdToken = vi.fn(async (token) => ({ uid: token, email: `${token}@example.com` }));
    const firebaseAuth = require('firebase-admin/auth');
    const prisma = require('../src/config/db');
    afterEach(() => vi.restoreAllMocks());

    it('answers with the caller’s bands, from one query', async () => {
        firebaseAuth.getAuth = () => ({ verifyIdToken });
        vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: 'uid-tod' });
        const query = vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ hour: 9, answers: 40, correct: 30, timedMs: 4000000n, timed: 40 }]);
        delete require.cache[require.resolve('../src/routes/analyticsDeepRoutes')];
        const app = express();
        app.use(express.json());
        app.use('/api/analytics/deep', require('../src/routes/analyticsDeepRoutes'));
        const res = await request(app).get('/api/analytics/deep/time-of-day').set({ Authorization: 'Bearer uid-tod' });
        expect(res.status).toBe(200);
        expect(res.body.boardHours).toEqual({ answers: 40, accuracy: 75 });
        expect(query).toHaveBeenCalledTimes(1);
        expect(query.mock.calls[0].flat().some((v) => v === 'uid-tod')).toBe(true);
    });
});
