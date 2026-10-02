import { describe, it, expect } from 'vitest';
const { effectiveMastery } = require('../src/services/masteryView');

describe('effectiveMastery', () => {
    const now = new Date('2026-10-23T00:00:00Z');

    it('decays the stored estimate by the days since last practice', () => {
        const v = effectiveMastery({ pMastery: 0.9, masteryN: 0, lastPracticedAt: new Date('2026-10-01T00:00:00Z') }, now);
        expect(v.mastery).toBe(0.9);
        expect(v.daysSincePractice).toBe(22);
        expect(v.masteryEffective).toBeCloseTo(0.4891, 3);
    });

    it('a topic with no recorded practice time keeps its stored estimate', () => {
        expect(effectiveMastery({ pMastery: 0.7, masteryN: 4, lastPracticedAt: null }, now).masteryEffective).toBe(0.7);
    });

    it('no estimate yet stays null', () => {
        expect(effectiveMastery({ pMastery: null }, now)).toMatchObject({ mastery: null, masteryEffective: null });
    });
});
