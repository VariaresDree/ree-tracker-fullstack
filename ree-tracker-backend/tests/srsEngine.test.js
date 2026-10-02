import { describe, it, expect } from 'vitest';
const { qualityFor, scheduleNext, manilaDueInstant, shouldTrack, foldCardUpdates, NEW_CARD } = require('../src/engine/srs');

// Spaced repetition was dead end to end: the client computed SM-2 and nothing
// ever called it, so no SRSCard row was ever written and /api/srs/due was
// always empty. Scheduling is now SERVER-authoritative and driven by evidence
// the app already records — correctness and confidence — inside the telemetry
// write, so every surface (review, flashcards, mocks, battles) feeds it.

describe('qualityFor — SM-2 quality from correctness × confidence', () => {
    it('grades a confident correct answer 5 and a guessed one 3', () => {
        expect(qualityFor({ isCorrect: true, confidenceLevel: 'HIGH' })).toBe(5);
        expect(qualityFor({ isCorrect: true, confidenceLevel: 'MED' })).toBe(4);
        expect(qualityFor({ isCorrect: true, confidenceLevel: 'LOW' })).toBe(3);
    });

    it('grades a miss as a lapse, and a CONFIDENT miss — a blind spot — as the worst', () => {
        expect(qualityFor({ isCorrect: false, confidenceLevel: 'LOW' })).toBe(1);
        expect(qualityFor({ isCorrect: false, confidenceLevel: 'MED' })).toBe(1);
        expect(qualityFor({ isCorrect: false, confidenceLevel: 'HIGH' })).toBe(0);
    });
});

describe('scheduleNext — SM-2 (Wozniak), hand-computed', () => {
    it('first success: interval 1, EF +0.1 at quality 5', () => {
        const c = scheduleNext(NEW_CARD, 5);
        expect(c).toMatchObject({ repetitions: 1, interval: 1 });
        expect(c.easeFactor).toBeCloseTo(2.6, 10);
    });

    it('second success: interval 6; third: round(6 × EF)', () => {
        const c1 = scheduleNext(NEW_CARD, 4);            // EF 2.5 + 0 = 2.5
        const c2 = scheduleNext(c1, 4);
        expect(c2).toMatchObject({ repetitions: 2, interval: 6 });
        const c3 = scheduleNext(c2, 4);
        expect(c3).toMatchObject({ repetitions: 3, interval: 15 }); // round(6 × 2.5)
    });

    it('a lapse resets the streak to tomorrow and lowers the ease', () => {
        const c = scheduleNext({ easeFactor: 2.5, interval: 15, repetitions: 3 }, 1);
        expect(c).toMatchObject({ repetitions: 0, interval: 1 });
        // 2.5 + (0.1 − 4·(0.08 + 4·0.02)) = 2.5 − 0.54
        expect(c.easeFactor).toBeCloseTo(1.96, 10);
    });

    it('ease never drops below 1.3', () => {
        let c = NEW_CARD;
        for (let i = 0; i < 10; i++) c = scheduleNext(c, 0);
        expect(c.easeFactor).toBe(1.3);
    });
});

describe('manilaDueInstant — due at Manila midnight, not server midnight', () => {
    it('one day after 23:30 Manila on 1 Oct is 2 Oct 00:00 Manila (= 1 Oct 16:00 UTC)', () => {
        const at = new Date('2026-10-01T15:30:00Z'); // 23:30 Manila
        expect(manilaDueInstant(at, 1).toISOString()).toBe('2026-10-01T16:00:00.000Z');
    });

    it('one day after 00:30 Manila on 2 Oct is 3 Oct 00:00 Manila', () => {
        const at = new Date('2026-10-01T16:30:00Z'); // 00:30 Manila, 2 Oct
        expect(manilaDueInstant(at, 1).toISOString()).toBe('2026-10-02T16:00:00.000Z');
    });
});

describe('shouldTrack — which answers earn a card', () => {
    it('a miss or a low-confidence answer starts a card; a confident hit does not', () => {
        expect(shouldTrack({ isCorrect: false, confidenceLevel: 'HIGH' }, false)).toBe(true);
        expect(shouldTrack({ isCorrect: true, confidenceLevel: 'LOW' }, false)).toBe(true);
        expect(shouldTrack({ isCorrect: true, confidenceLevel: 'HIGH' }, false)).toBe(false);
    });

    it('an existing card is updated by ANY answer to its question', () => {
        expect(shouldTrack({ isCorrect: true, confidenceLevel: 'HIGH' }, true)).toBe(true);
    });
});

describe('foldCardUpdates — one batch, in answer order', () => {
    const at = new Date('2026-10-01T02:00:00Z'); // 10:00 Manila

    it('folds repeated answers to one question sequentially and skips untracked ones', () => {
        const updates = foldCardUpdates(
            [
                { questionId: 'q1', isCorrect: false, confidenceLevel: 'HIGH', answeredAt: at },
                { questionId: 'q2', isCorrect: true, confidenceLevel: 'HIGH', answeredAt: at },
                { questionId: 'q1', isCorrect: true, confidenceLevel: 'MED', answeredAt: at },
            ],
            new Map(),
        );
        expect([...updates.keys()]).toEqual(['q1']);
        const q1 = updates.get('q1');
        // lapse (q0) → reps 0, then success (q4) → reps 1, interval 1
        expect(q1).toMatchObject({ repetitions: 1, interval: 1 });
        expect(q1.lastReviewed).toEqual(at);
        expect(q1.nextReviewDate.toISOString()).toBe('2026-10-01T16:00:00.000Z');
    });

    it('continues from the stored card when one exists', () => {
        const existing = new Map([['q9', { easeFactor: 2.5, interval: 6, repetitions: 2 }]]);
        const updates = foldCardUpdates([{ questionId: 'q9', isCorrect: true, confidenceLevel: 'MED', answeredAt: at }], existing);
        expect(updates.get('q9')).toMatchObject({ repetitions: 3, interval: 15 });
    });
});
